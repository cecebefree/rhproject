# Test Bar Policy (Row 21)

**Ratified:** 2026-07-20 session (ae32461 baseline). Owner: QA. Board: MASTER-TODO-V2.md row 21.

This document is the canonical test bar. It is a HARD GATE: no migration, RLS
change, or CI config merge passes review unless it meets every bar below.

## 1. pgTAP Minimums

- **Floor:** 24 test files / 240 assertions, result MUST be PASS. This is the
  sealed baseline (docs/PLAN-STATE.md @ 887ce98, re-confirmed 240/24).
- **Per-migration rule:** every new migration under supabase/migrations/ that
  creates or alters a table, RLS policy, or tenant-scoped column MUST ship with
  at least one corresponding pgTAP file under supabase/tests/.
- **No testless merges:** a migration without its pgTAP file is rejected at
  review. The floor only grows; it never drops.
- **Run command (CI):** pg_prove over supabase/tests/*.sql against a migrated
  Supabase instance (see .github/workflows/ci.yml guard job).

## 2. RLS Positive + Negative Cases

Every RLS-gated table or policy MUST be proven with BOTH:

- **Positive case** — an authorized role CAN read/write (asserted with
  SELECT is(..., N, 'label') where N >= 1).
- **Negative case** — an unauthorized role CANNOT (asserted with
  SELECT throws_ok(82382...82382, NULL, 'label') or an is(...,0,...) denial).

**Mandated pattern files (do not diverge without a ruling):**
- supabase/tests/012_rls_denial_proofs.sql — consent / suppression / report_card
  denials (throws_ok) paired with allowed reads (is).
- supabase/tests/013_cross_tenant_office.sql — cross-tenant isolation proofs.

A table with RLS but only positive OR only negative cases is INCOMPLETE and
fails the bar. Row 47 (adversarial RLS pass) extends this bar to 152/152 with
both polarities per item.

## 3. CI Runtime Budget

- **Budget:** each CI job (lint, typecheck, test, guard, build) is capped at
  **timeout-minutes: 30**.
- **Current state at ratification:** ci.yml had NO per-job timeout (GitHub
  default 360 min/job). This policy SETS the budget; the value above is the
  mandated ceiling, not a measurement.
- **Action required:** ci.yml MUST be patched to add timeout-minutes: 30 to
  every job (tracked separately; this policy states the bar, the YAML edit is a
  follow-up chore).
- **Guard job** (postgres service + migration replay + 3 guard scripts) is the
  longest path and must complete within the 30-min budget.

## Enforcement

- CI guard job fails the build on any pgTAP regression below the floor.
- Review rejects migrations lacking pgTAP or lacking either RLS polarity.
- This policy is amended only by a Cece ruling.

(End of test-bar-policy.md)
