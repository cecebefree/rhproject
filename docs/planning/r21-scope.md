# R21-SCOPE — Test Bar Policy (Amendment Draft)

**Board row:** 21 (MASTER-TODO-V2, Phase B)
**Existing policy:** docs/governance/test-bar-policy.md (ratified 2026-07-20, 57 lines, baseline ae32461)
**Status:** DONE per prior session — this doc proposes amendments to close known gaps
**Precedent references:** Row 27 (R18 RPCs: `r18-walkthrough.md` at 7385720), Row 47 (adversarial RLS pass, QA + Security countersign)

---

## Gaps in current policy vs. observed practice

| Gap | Current policy | Observed practice (rows 27/47) |
|-----|---------------|-------------------------------|
| 1. Test count per migration class | "at least one corresponding pgTAP file" — no minimum assertions per class | Row 27 shipped 1 file with 8 assertions; some migration classes need more |
| 2. Adversarial-negative formalism | RLS "+- cases" required but no adversarial role-mismatch pattern stated | Row 27: 065_r18_rpc_test.sql includes adversarial checks (teacher calling release, expecting error) |
| 3. Seal-report evidence format | No requirement | Row 27 seal at 7385720 included raw pg_prove output; prior seals relied on "X/X PASS" text |
| 4. Migration class taxonomy | One rule for all migrations | Simple RLS policy vs complex RPC vs data migration need different test densities |

---

## Proposed amendment 1: Migration class taxonomy + minimum test counts

Every migration in `supabase/migrations/` is classified on creation. The migration prefix (or a companion `.meta` file) names its class. Minimum pgTAP assertions per class:

| Class | Examples | Min assertions | Min files | Rationale |
|-------|----------|---------------|-----------|-----------|
| **RLS-policy** | `*_rls_for_*.sql`, `*_tenant_scoping.sql` | 4 | 1 | One positive + one negative per RLS policy, times two polarities |
| **RPC-function** | `*_rpc_*.sql`, `*_report_card.sql` | 8 | 1 | Row 27 precedent (065: 8 assertions, 1 file) |
| **Schema** | `*_create_table.sql`, `*_extend.sql` | 2 | 1 | Table exists + column constraints |
| **Data-seed** | `*_seed.sql`, `*_fixtures.sql` | 4 | 1 | Row count + domain integrity per seeded entity |
| **Trigger** | `*_trigger*.sql`, `*_immutable.sql` | 6 | 1 | Row 057 precedent — trigger-fires, trigger-blocks, corner cases |
| **Composite** | multi-object migrations | SUM of component classes | as needed | Sum rule; min assertions = sum of per-class mins |

**Floor remains:** 24 files / 240 assertions minimum for the entire suite (unchanged from existing policy).

**Enforcement:** pgTAP test file MUST exist before migration is merged. Reviewer counts `SELECT * FROM plan(N)` to verify N >= class minimum.

---

## Proposed amendment 2: Adversarial-negative requirement

Building on existing RLS polarity rule (§2). Every RPC-function, trigger, or stored procedure that performs role-gated operations MUST prove both:

1. **Happy path:** authorized role CAN execute and returns expected result.
2. **Adversarial negative:** unauthorized role CANNOT execute — asserted with `SELECT throws_ok(...)` expecting a defined error code or message.

Row 27 precedent (065_r18_rpc_test.sql):
- `create_draft_report_card` — teacher call succeeds (happy); learner call throws (adversarial)
- `release_report_card` — office call succeeds (happy); teacher call throws (adversarial)
- Learner queries released card — visible row returned (happy); learner queries draft card — zero rows (adversarial)

Row 47 precedent (adversarial RLS pass, 152/152 baseline):
- Every RLS-gated table: one `is(..., N, ...)` for authorized role, one `is(..., 0, ...)` or `throws_ok(...)` for unauthorized.

**Mandated assertion pattern (copy-paste into test file):**

```sql
-- Adversarial: unauthorized role [X] cannot [operation]
SELECT throws_ok(
  $$ SELECT * FROM some_function('param') $$,
  '42501',  -- insufficient_privilege or custom error
  'label: unauthorized [X] cannot [operation]'
);
```

**Polarity count rule:** a test file with N role gates must have >= N positive assertions AND >= N adversarial negatives. Pure-positive files fail review.

---

## Proposed amendment 3: "Green" in a seal report — evidence format

Per AR-10 (evidence-relay completeness) and AR-1 (evidence-relay), a seal report that claims "8/8 PASS" without the executed output is INCOMPLETE. A valid seal output MUST contain:

### Required elements

1. **Raw terminal output** from `pg_prove` or equivalent test runner — pasted verbatim, including the `Result: PASS` / `Result: FAIL` line and assertion counts.
2. **Test count breakdown** — either from the pg_prove summary line or a structured table if multiple files:

   ```
   Files=1, Tests=8,  0 wallclock secs ( ... )
   Result: PASS
   ```

3. **Migration version** — the migration(s) under test, by filename (e.g., `065_r18_rpc_test.sql` tests migration `065_r18_report_card_rpcs.sql`).
4. **Run context** — database state at test time (e.g., "applied against migrated local Supabase playground, `supabase/migrations/` fully replayed").
5. **Commit hash** — the HEAD hash at which tests were run (not the commit that added the test file — the commit that was HEAD during execution).

### Forbidden

- "8/8 PASS" with no output — unverifiable count claim
- "Tests pass" without a run log — insufficient per AR-10
- Assertion counts reconstructed from source (`grep is( ` or `grep throws_ok`) instead of from execution — AR-10 prohibits reconstructed evidence

### Example compliant seal (from row 27 at 7385720)

```
$ pg_prove -h localhost -U postgres supabase/tests/065_r18_rpc_test.sql
supabase/tests/065_r18_rpc_test.sql .. ok
All tests successful.
Files=1, Tests=8,  0 wallclock secs ( 0.02 usr  0.00 sys +  0.01 cusr  0.00 csys =  0.03 CPU)
Result: PASS
```

This format applies to ALL seal reports going forward — not just pgTAP.

---

## Interaction with existing policy

| Existing § | Unchanged? | Notes |
|-----------|-----------|-------|
| §1 pgTAP Minimums | **Amended** — class taxonomy + per-class minimums added; 24/240 floor unchanged | Class minimums are ADDITIVE to the floor |
| §2 RLS Positive + Negative | **Amended** — adversarial-negative formalism added; mandated assertion pattern added | Existing "both polarities" rule kept and strengthened |
| §3 CI Runtime Budget | **Unchanged** | 30-minute cap remains |
| §4 Enforcement | **Amended** — reviewer counts N from `plan(N)`; seal evidence required | CI guard job remains |

---

## Proposed SATISFIED criteria for row 21 (post-amendment)

- [ ] Amendments 1–3 approved by Cece.
- [ ] test-bar-policy.md updated to reflect amendments (separate commit from this scope draft).
- [ ] Seal report template documented (or existing row 27 seal used as canonical example).
- [ ] One existing test file re-audited against class-minimum table to prove enforceability.

---

**Scope draft for Cece review. No policy text applied.**
