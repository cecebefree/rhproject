#!/bin/bash
# Validate PostgREST cache invalidation after migration
# Exit: 0 = success, 1 = failure

set -e

echo "=== PostgREST Cache Invalidation Validation ==="

# Check migration file exists
MIGRATION_FILE="supabase/migrations/20260914_120000_fix_postgrest_cache_invalidation.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "FAIL: Migration file not found: $MIGRATION_FILE"
  exit 1
fi
echo "OK: Migration file exists"

# Check NOTIFY statement present
if ! grep -q "NOTIFY pgrst, 'reload schema'" "$MIGRATION_FILE"; then
  echo "FAIL: NOTIFY pgrst statement not found in migration"
  exit 1
fi
echo "OK: NOTIFY pgrst, 'reload schema' found"

# Check transaction wrapper
if ! grep -q "BEGIN;" "$MIGRATION_FILE" || ! grep -q "COMMIT;" "$MIGRATION_FILE"; then
  echo "FAIL: Missing BEGIN/COMMIT transaction wrapper"
  exit 1
fi
echo "OK: Transaction wrapper present"

# Check test file exists and has no GROUP BY bug
TEST_FILE="supabase/tests/001_cache_invalidation_validation.test.sql"
if [ ! -f "$TEST_FILE" ]; then
  echo "FAIL: Test file not found: $TEST_FILE"
  exit 1
fi
echo "OK: Test file exists"

# Verify GROUP BY bug is fixed (should NOT have GROUP BY in subquery)
if grep -q "COUNT(DISTINCT tablename).*GROUP BY" "$TEST_FILE"; then
  echo "FAIL: GROUP BY bug still present in test file"
  exit 1
fi
echo "OK: GROUP BY bug fixed (no GROUP BY in COUNT DISTINCT subquery)"

# Verify subquery returns single scalar
if grep -q "COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public'" "$TEST_FILE"; then
  echo "OK: COUNT(DISTINCT tablename) returns single scalar"
else
  echo "WARN: Could not verify COUNT DISTINCT pattern"
fi

echo ""
echo "=== ALL CHECKS PASSED ==="
exit 0
