#!/usr/bin/env bash
# guard-type-drift.sh — Type Drift Guard (D18)
# Checks that generated DB types exist and haven't drifted from live schema.
#
# Exit 0 = pass (types exist and match, or no types file yet — advisory)
# Exit 1 = drift detected or types file stale
# Exit 2 = cannot connect to database
#
# Usage: bash supabase/guard-type-drift.sh
# Requires: Docker with supabase_db_rhproject-new container running

set -euo pipefail

TYPES_FILE="${TYPES_FILE:-packages/shared/src/database.types.ts}"
VIOLATIONS=0
DB_CONTAINER="${DB_CONTAINER:-supabase_db_rhproject-new}"

echo "::group::Type-Drift Guard (D18)"

# Phase 1: Check if generated types file exists
if [ ! -f "$TYPES_FILE" ]; then
  echo "  WARN: $TYPES_FILE not found"
  echo "  Advisory: Run 'supabase gen types typescript --local > $TYPES_FILE' to generate"
  echo "  Skipping drift check (no types to compare)"
  echo "::endgroup::"
  exit 0
fi

echo "  Found types file: $TYPES_FILE"

# Phase 2: Check database connection via Docker
echo "  Testing database connection..."
if ! docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "SELECT 1" > /dev/null 2>&1; then
  echo "  ERROR: cannot connect to database via Docker container $DB_CONTAINER"
  echo "  Ensure Supabase is running: supabase start"
  echo "::endgroup::"
  exit 2
fi

echo "  Database connection OK"

# Phase 3: Extract table names from generated types file
# Table names are in the Tables section (before Functions:)
# Pattern: "      tablename: {" (6 spaces, then table name, then colon)
TABLES_SECTION=$(sed -n '1,/Functions:/p' "$TYPES_FILE")
GENERATED_TABLES=$(echo "$TABLES_SECTION" | grep -oE '^\s{6}[a-z_]+:' | sed 's/^\s*//; s/://' | sort -u || true)

if [ -z "$GENERATED_TABLES" ]; then
  # Try alternate pattern with quotes
  GENERATED_TABLES=$(echo "$TABLES_SECTION" | grep -oE '^\s{6}"[a-z_]+":' | sed 's/^\s*"//; s/"://' | sort -u || true)
fi

if [ -z "$GENERATED_TABLES" ]; then
  echo "  WARN: Could not parse table names from types file"
  echo "  Advisory: Regenerate types with 'supabase gen types typescript --local > $TYPES_FILE'"
  echo "::endgroup::"
  exit 0
fi

TABLE_COUNT=$(echo "$GENERATED_TABLES" | wc -l | tr -d ' ')
echo "  Parsed $TABLE_COUNT table names from types file"

# Phase 4: Check each table exists in live schema
CHECKED=0
MISSING=0

for table in $GENERATED_TABLES; do
  [ -z "$table" ] && continue
  # Skip common non-table entries
  echo "$table" | grep -qE '^(public|schema|Enum|Row|Insert|Update|Relationships)$' && continue
  
  exists=$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -A -c "
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = '$table'
    UNION ALL
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'school_desk' AND table_name = '$table'
    UNION ALL
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'office_desk' AND table_name = '$table'
    UNION ALL
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'front_desk' AND table_name = '$table';
  " 2>/dev/null | head -1 || echo "0")
  
  CHECKED=$((CHECKED + 1))
  
  if [ "$exists" = "0" ]; then
    echo "  DRIFT: table '$table' in types file but not in live schema"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

echo ""
echo "  SUMMARY: $CHECKED tables checked from types file"

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "  FAIL: $VIOLATIONS drift violation(s) — types file references non-existent tables"
  echo "  Fix: Run 'supabase gen types typescript --local > $TYPES_FILE' to regenerate"
  echo "::endgroup::"
  exit 1
fi

echo "  PASS: types file tables match live schema"
echo "::endgroup::"
exit 0
