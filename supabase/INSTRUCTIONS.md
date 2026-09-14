# PostgREST Cache Invalidation Fix

## Bug Fixed

**File:** `supabase/tests/001_cache_invalidation_validation.test.sql` (line 22)

**Error:** `more than one row returned by a subquery used as an expression`

**Root Cause:** Subquery used `GROUP BY tablename HAVING COUNT(*) >= 1` which returned 51 rows (one per table) instead of a single scalar value.

**Fix:** Removed `GROUP BY tablename HAVING COUNT(*) >= 1`. The `COUNT(DISTINCT tablename)` alone correctly returns a single integer count of unique tables with RLS policies.

### Before (broken):
```sql
SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public' GROUP BY tablename HAVING COUNT(*) >= 1
```
Returns: 51 rows ❌

### After (fixed):
```sql
SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public'
```
Returns: 1 scalar integer ✅

---

## Step-by-Step Instructions

### 1. Apply Migration

```bash
cd /Users/ce/dev/rhproject-new
supabase db push
```

This runs the migration `20260914_120000_fix_postgrest_cache_invalidation.sql` which:
- Sends `NOTIFY pgrst, 'reload schema'` to force PostgREST cache reload
- Verifies RLS policies exist in public schema

### 2. Run Validation Script

```bash
bash supabase/validate_postgrest_cache.sh
```

Expected output:
```
=== PostgREST Cache Invalidation Validation ===
OK: Migration file exists
OK: NOTIFY pgrst, 'reload schema' found
OK: Transaction wrapper present
OK: Test file exists
OK: GROUP BY bug fixed (no GROUP BY in COUNT DISTINCT subquery)
OK: COUNT(DISTINCT tablename) returns single scalar

=== ALL CHECKS PASSED ===
```

### 3. Run pgTAP Tests

```bash
supabase test db
```

All tests should pass including the fixed Test 3.

---

## Production Readiness

- [x] Migration file exists and is syntactically correct
- [x] NOTIFY statement present to reload PostgREST cache
- [x] Transaction wrapper (BEGIN/COMMIT) present
- [x] Test file fixed - no GROUP BY bug
- [x] Subquery returns single scalar value
- [x] Validation script created and executable

**Status:** Ready for production deployment
