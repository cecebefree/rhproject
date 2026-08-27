# RLS Test Results — Day 2

**Date:** 2025-08-21
**Environment:** Local Supabase (Docker)
**Schema:** Original `001_init_schema.sql` + Day 2 policies

---

## Summary

| Test Suite | Passed | Failed | Total |
|-----------|--------|--------|-------|
| REST API RLS Isolation | 24 | 0 | 24 |
| SQL Policy Verification | 23 | 0 | 23 |
| **Combined** | **47** | **0** | **47** |

**Status: ALL TESTS PASSED**

---

## Test Users Created

| Role | Email | JWT Role | Tenant |
|------|-------|----------|--------|
| Admin | day2-admin@test.local | admin | e97e5c3a-... |
| Student | day2-student@test.local | student | e97e5c3a-... |
| Family | day2-family@test.local | family | e97e5c3a-... |
| Teacher | day2-teacher@test.local | teacher | e97e5c3a-... |

JWT roles injected via `custom_access_token_hook` → reads from `profiles.role`.

---

## REST API Test Results (24/24)

### Group 1: Admin Access
- ✓ Admin can read students
- ✓ Admin can read parents
- ✓ Admin can read payments
- ✓ Admin can read invoices
- ✓ Admin can read audit_log
- ✓ Admin can insert invoices

### Group 2: Student Access
- ✓ Student can read students
- ✓ Student sees only own student record (rows=1)
- ✓ Student can read payments
- ✓ Student can read invoices
- ✓ Student CANNOT insert invoices (403)

### Group 3: Family/Parent Access
- ✓ Family can read parents
- ✓ Family sees own parent record (rows=1)
- ✓ Family can read students (children)
- ✓ Family can read invoices
- ✓ Family can read payments
- ✓ Family sees 0 rows from audit_log (no policy)

### Group 4: Teacher Access
- Teacher read students: HTTP 200
- Teacher read invoices: HTTP 200

### Group 5: Unauthenticated Access
- ✓ Unauth read students blocked (401)
- ✓ Unauth read parents blocked (401)
- ✓ Unauth read payments blocked (401)
- ✓ Unauth read invoices blocked (401)
- ✓ Unauth read audit_log blocked (401)

### Group 6: Cross-Role Isolation
- ✓ Student sees 0 rows from parents (no policy)
- ✓ Student update affects 0 rows (RLS blocks other students)

---

## SQL Verification Results (23/23)

### RLS Enabled
- ✓ students: RLS enabled
- ✓ parents: RLS enabled
- ✓ payments: RLS enabled
- ✓ invoices: RLS enabled
- ✓ audit_log: RLS enabled

### Policy Existence
- ✓ admin_all_students policy exists
- ✓ admin_all_payments policy exists
- ✓ admin_all_invoices policy exists
- ✓ student_select_own policy exists
- ✓ parent_select_own policy exists
- ✓ parent_students_select policy exists
- ✓ parent_invoices_select policy exists

### Audit Triggers
- ✓ audit_trigger on payments
- ✓ audit_trigger on invoices
- ✓ on_student_activate trigger on students

### Audit Log Schema
- ✓ audit_log has table_name column
- ✓ audit_log has old_values column (jsonb)
- ✓ audit_log has new_values column (jsonb)
- ✓ audit_log has user_id column

### Test Data
- ✓ Student A exists
- ✓ Student B exists
- ✓ Payment exists for student A
- ✓ Invoice exists for student A

---

## Fixes Applied During Testing

1. **Admin role mismatch**: Existing policies checked `office_desk_admin` but JWT has `admin`. Created `admin_all_*_v2` policies for each table.

2. **Family parent record ID**: Parent record `id` didn't match auth UID. Updated parent row to use family user's auth UUID as primary key.

3. **Family→parent policy role mismatch**: `parent_select_own` checked role=`parent` but JWT has role=`family`. Created `family_select_own_parent` policy.

4. **Invoice status constraint**: Old schema only allows `unpaid/paid/overdue`, not `draft`. Test data updated to use valid status.

---

## Key RLS Behavior Notes

- **RLS returns 0 rows, not 403**: When no policy matches a role, PostgreSQL returns 0 rows (empty result) rather than a 403 error. PostgREST returns HTTP 200 with `[]`.
- **Unauthenticated = 401**: Supabase returns 401 (not 403) for requests without a valid JWT.
- **UPDATE with RLS filtering**: When a student tries to update another student's record, RLS filters the target to 0 rows. PostgREST returns 200 with empty array — the update affects 0 rows silently.
- **custom_access_token_hook**: JWT role comes from `profiles.role`, not `auth.users.raw_app_meta_data`. Profiles must be created for JWT claims to work.

---

## Verification Commands

```bash
# Run REST API tests
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_ANON_KEY=<anon-key>
bash scripts/test-rls-rest.sh

# Run SQL verification
docker cp scripts/test-rls-isolation.sql supabase_db_rhproject-new:/tmp/test-rls.sql
docker exec supabase_db_rhproject-new psql -U postgres -d postgres -f /tmp/test-rls.sql
```
