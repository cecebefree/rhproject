# runner.sql Partial-Concat Defect (ITEM-034)

**Opened:** 2026-07-16 — discovered during type-drift decontamination round.
**Status:** OPEN — remediation options pending ruling. **No fix applied in this round.**
**Reference:** `docs/governance/type-drift-decontamination.md` (sealed baseline 214/21).

## Observation

`supabase/tests/runner.sql` is a **partial concat**, not the canonical test runner.

- It declares `SELECT plan(33);` and inlines the bodies of only **6 of the 21**
  split test files: `00_rls_enabled`, `01_profiles_self_read`,
  `02_student_devotional_blocked`, `03_admin_devotional_visible`,
  `04_admin_all_bypass`, `05_jwt_hook_injection`.
- Plan math is self-consistent: 6 + 3 + 2 + 2 + 15 + 5 = 33.
- The following **14 split files are silently skipped** (never referenced inside
  `runner.sql`): `012_rls_denial_proofs`, `013_cross_tenant_office`,
  `027_student_class_test`, `028_student_class_rls_test`, `032_access_window_test`,
  `035_platform_access_test`, `036_notifications_test`, `037_schedule_test`,
  `038_realtime_test`, `039_enrichment_test`, `040_booklist_test`,
  `041_announcements_test`, `06_jwt_hook_fail_loud`, `07_tenant_assignment_immutable_test`.

## Impact

Running `runner.sql` alone reports `plan(33)` satisfied and exits green, giving a
**false sense of coverage** — 14 files (≈158 assertions) are never executed. The
genuine suite is `supabase test db`, which runs all 21 files and reports
`Files=21, Tests=214, Result: PASS`.

## Remediation options (to be ruled on later — NOT applied here)

1. **Repair `runner.sql`** to include all 21 split files (or replace its body with a
   `\ir` includes of each file), so its `plan(N)` equals 214 and matches the real
   suite.
2. **Retire `runner.sql`** and declare `supabase test db` the sole canonical runner,
   removing the misleading partial concat and its `.bak` duplicate entirely.

This item is recorded for tracking only. No code, test, or migration change is made
as part of opening it.
