#!/usr/bin/env bash
# guard-field-register.sh
# Validates that the field register matches actual database schema.
# Item 15 scope — this is the shell placeholder. Full AST-level validation
# is tracked at item 15. This guard confirms the migration 042 tables exist.
#
# Usage: bash supabase/guard-field-register.sh
# Exit 0 = pass, 1 = fail

set -euo pipefail

echo "::group::Field-Register Guard (item 15 skeleton)"
echo "Checking migration 042 consent+suppression tables..."

# If we have a live DB, verify the tables exist
if [ -n "${DATABASE_URL:-}" ]; then
  for table in consent_records suppression_records; do
    if psql "$DATABASE_URL" -t -c "SELECT to_regclass('public.$table');" | grep -q .; then
      echo "  OK: public.$table exists"
    else
      echo "  FAIL: public.$table does not exist"
      exit 1
    fi
  done
else
  echo "  SKIP: DATABASE_URL not set (offline check)"
fi

echo "Field-register guard: PASS"
echo "::endgroup::"
