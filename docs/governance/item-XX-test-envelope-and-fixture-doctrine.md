# Test Envelope & Fixture Doctrine (R20 tenant-assignment test repairs)

Reference: rhproject-new pgTAP suite. Authored during the repair rounds that
took the suite from `Result: FAIL` to `Result: PASS` (Files=21, Tests=214).

## (a) Autocommit / GUC root cause and the BEGIN/ROLLBACK envelope requirement

Migration **057** adds trigger `trg_profiles_tenant_id_immutable`, which blocks
all direct `UPDATE ... tenant_id` unless the session GUC
`app.tenant_assignment_bypass` equals `'true'`. Test fixtures that need to write
`tenant_id` set it with:

```sql
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
-- ... write tenant_id ...
SELECT set_config('app.tenant_assignment_bypass', 'false', true);
```

The **third argument `true` makes the setting local to the current
transaction**. The bug: `psql` runs scripts with autocommit ON unless an
explicit transaction is open, so each statement is its own transaction. A
`set_config(..., true)` on one line is therefore GONE by the next statement —
the following `UPDATE` runs in a fresh transaction where the GUC is NULL, and
the trigger blocks it (`tenant_id is immutable: direct updates blocked`).

**Fix / requirement:** any standalone pgTAP test file that sets a
transaction-local GUC (or relies on one persisting to a later statement) MUST
wrap its body in an explicit `BEGIN;` / `ROLLBACK;` envelope. Inside one
explicit transaction the local GUC survives to the `UPDATE`. This is why
`runner.sql` (which already had `BEGIN;`/`ROLLBACK;`) honored the bypass while
the standalone `05`/`06` files did not until they were given the envelope.

Files affected by this fix: `05_jwt_hook_injection.sql`,
`06_jwt_hook_fail_loud.sql`, `013_cross_tenant_office.sql` (already enveloped;
its earlier failure was a different malformed-edit bug).

## (b) Round 4 verdicts — no policy defect, fixture drift from 058

`supabase db test` was green for everything except `039` (tests 8-9) and `040`
(test 10). Investigation found:

- **039 #8 / #9 (`outside_student` leaks core courses and a closed club):**
  the test encoded `role = 'outside_student'` only in the JWT
  `app_metadata`, but the governing RESTRICTIVE policy
  `courses_no_core_outside` resolves role from `profiles.role` (the DB row),
  not the JWT claim. The seeded profile `ffffffff-...` has `role = 'student'`,
  so the policy's `NOT EXISTS(outside_student)` branch passed and leaked the
  rows. **Verdict: FIXTURE DRIFT + TEST DEFECT**, not a policy defect — the
  policy qual is correct per doctrine.
- **040 #10 (`tenant 2 user sees own 1 booklist`):** the profile
  `22222222-...` had `tenant_id = NULL` (the 058 seed rework removed signup
  auto-assignment, leaving a pending-NULL state) and **no** `booklist` row
  with `child_id = 22222222-...`. The `bl_*` policies correctly scope by
  `child_id = auth.uid()`; they simply had no matching row. **Verdict:
  FIXTURE DRIFT** from the 058 rework, not a policy defect.

Common cause: the **058 seed rework** (NULL pending `tenant_id` + a 4-UUID
explicit reassignment that omitted `22222222-...` and `ffffffff-...`). The RLS
policies themselves are correctly tenant/role-scoped per doctrine.

Round 5 repairs (transaction-local, no policy/seed changes):
- `039`: `UPDATE public.profiles SET role = 'outside_student' WHERE id =
  'ffffffff-ffff-ffff-ffff-ffffffffffff';` in setup.
- `040`: bypassed `UPDATE ... SET tenant_id = '00000000-...-0002'` for
  `22222222-...` plus one deterministic `booklist` row
  (`child_id = 22222222-...`, `tenant_id = 00000000-...-0002`).

## (c) Final run summary

```
Connecting to local database...
... (all 21 files) ...
/Users/ce/dev/rhproject-new/supabase/tests/runner.sql ............................... ok
All tests successful.
Files=21, Tests=214,  1 wallclock secs ( 0.02 usr  0.02 sys +  0.06 cusr  0.03 csys =  0.13 CPU)
Result: PASS
```

All 21 pgTAP files pass; 214 assertions, zero failures. Remaining
NOTICE/WARNING lines in the output are expected (extension-already-exists
notices and the hook's own null-tenant_id WARNINGs asserted by those tests).
