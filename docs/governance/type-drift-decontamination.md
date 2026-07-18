# Type-Drift Decontamination — Governance Record

**Date:** 2026-07-16
**Scope:** `packages/shared/src/database.types.ts` (snapshot), `supabase/tests/04_admin_all_bypass.sql`, `supabase/tests/runner.sql`
**Sealed commits:** `8b3536e` (snapshot decontamination), `d9e7e61` (self-cleaning fixtures)

## 1. The phantom function

`public.check_admin_all_policy(tname text) RETURNS SETOF text` appeared in the
committed type snapshot (`database.types.ts`) but in **no migration**. It is not
application logic: its body is purely pgTAP `ok(...)` assertions that verify RLS
`admin_all_<table>` policies exist, are JWT-gated, and have RLS enabled.

Local inspection confirmed it was **unmigrated local state** that had been
photographed into the snapshot from a database where the test fixtures had already
created it. CI's bare postgres (migrations only) never had it, so CI correctly
reported `FAIL: types drifted`. **CI was the honest environment**; the local DB and
the snapshot were contaminated.

## 2. Why CI was the honest environment

The CI guard job builds its database from migrations only — it never runs the test
suite, so it never installs `pgtap` and never creates `check_admin_all_policy`. Its
`gen types --schema public` therefore reflects the true application schema. The
local development database, by contrast, had accumulated test-created objects
(function + pgtap extension) that leaked into a snapshot regenerated against it.
The drift the guard caught was real contamination, not a guard false-positive.

## 3. Per-file teardown doctrine

Any test fixture that **creates** a schema object (function, extension, role, table)
outside the migration set MUST also **drop** it at the end of the same file. Teardown
is appended after `finish()`:

- `supabase/tests/04_admin_all_bypass.sql` — appended
  `DROP FUNCTION IF EXISTS public.check_admin_all_policy(text);`
- `supabase/tests/runner.sql` — appended the same teardown before `ROLLBACK;`

The teardown is idempotent (`IF EXISTS`) so standalone or concatenated execution both
clean up. This closes the recontamination loop: after the suite runs, the object is
gone, so a subsequent snapshot regen cannot photograph it.

The stale `supabase/tests/runner.sql.bak` (an untracked duplicate) was removed from
the working tree.

## 4. Withdrawn pg8000 evidence

An earlier "33 ok / 0 not ok" result was produced by a `pg8000` Python harness
executing the test SQL. **This evidence is withdrawn.** The `pgtap` extension was
confirmed **absent** at that time (`SELECT count(*) FROM pg_extension WHERE
extname='pgtap'` = 0), so `plan()/ok()/finish()` were not genuine pgTAP assertions.
The strings matched as `ok ` were text fragments returned by the
`check_admin_all_policy` function body (its `RETURNS SETOF text` body literally
contains `ok(...)` strings), not real TAP output. Genuine pgTAP execution requires
the extension; the canonical runner is `supabase test db`, which installs pgtap and
reported `Files=21, Tests=214, Result: PASS`.

## 5. ROLLBACK origin correction

`runner.sql` never leaked `check_admin_all_policy` into the public schema through its
own execution path — its teardown runs *after* `finish()` and before `ROLLBACK;`, and
the function it defines is scoped to the transaction. The contamination originated
from **standalone execution of `04_admin_all_bypass.sql`** (which `CREATE OR REPLACE
FUNCTION ...` at the top and calls it, with no teardown in the original file). Running
that file on its own — outside the `runner.sql` wrapper — left the function behind.
The per-file teardown now covers both execution paths.

## 6. New sealed baseline

- **214 assertions across 21 files**, all passing: `supabase test db` →
  `Files=21, Tests=214, Result: PASS`.
- `runner.sql` declares `plan(33)` and is a **partial concat** (6/21 files inlined:
  `00,01,02,03,04,05`). It is NOT the canonical runner and silently skips 14 split
  files. See open item below.
- Snapshot regenerated public-only via Supabase CLI 2.108.0; diff is exactly the
  removal of `check_admin_all_policy`.

## 7. Guard validity doctrine

**The type-drift guard is valid only against a migration-only database; `supabase
test db` installs pgtap into `public` and will transiently pollute any snapshot taken
afterward.** Always regenerate the snapshot (or run the guard) against a database that
has migrations applied but no test extensions installed. CI satisfies this; a local
DB that has just run the test suite does not, until pgtap is dropped.

## Open item (separate ruling)

- `runner.sql` partial-concat defect — see tracker item for remediation options
  (repair to include all 21 files, or retire in favour of `supabase test db`).

## Amendment (2026-07-16, R-034-A)

The sealed baseline "214 assertions / 21 files" was inflated — `runner.sql` was the 21st file and its 33 assertions duplicated split-file coverage. Post-retirement canonical baseline: **181 assertions / 20 files**. The 33 retired assertions were duplicates of split-file tests, so no unique coverage was lost. (Re-baselined 2026-07-17 to 199/21 after migration 059 chat tables and the 013 fixture repair; raw run Result: PASS, sealed under 0974bba. Re-baselined 2026-07-18 to 207 assertions / 22 files after migration 060 chapter-sequence guard; D-CHAPSEQ arc sealed under a601fc7.)
