# BOARD INTEGRITY AUDIT — 2026-07-15

## Cross-Check Table

Every row of `master-todo-v2.md` (original board) checked against:
- `docs/governance/MASTER-TODO-V2.md` (reconciled board)
- Governance notes (ITEM-024, ITEM-009, ITEM-013, ITEM-001, ITEM-002)
- `.swarm/deferred.md`

### Phase A — Cece Inputs

| # | Board Title | Governance Title | Status | MATCH? |
|---|-------------|------------------|--------|--------|
| 1 | Ruling: group chat | ITEM-001 | Pending | MATCH (title + status) |
| 2 | Ruling: certificates | ITEM-002 | Pending | MATCH (title + status) |
| 3 | Ruling: report-card demo | — | Pending | MATCH (no governance note) |
| 4 | Ruling: section 8 exemption | — | Pending | MATCH (no governance note) |
| 5 | Ruling: Expo vs Capacitor | — | Pending | MATCH (no governance note) |
| 6 | Ruling: authority-gate doctrine | — | Pending | MATCH (no governance note) |
| 7 | Ruling: record d64bb05 | — | Pending | MATCH (no governance note) |
| 8 | Asset: v0 mobile design links | — | Pending | MATCH (no governance note) |
| 9 | Asset: Lovable website link | — | Pending | MATCH (no governance note) |
| 10 | Asset: brand hex + logos | — | Pending | MATCH (no governance note) |
| 11 | Asset: Supabase cloud URL + anon key | — | Pending | MATCH (no governance note) |
| 12 | Asset: Cloudflare credentials | — | Pending | MATCH (no governance note) |

### Phase B — Plan Hygiene

| # | Board Title | Governance Title | Status | MATCH? |
|---|-------------|------------------|--------|--------|
| 13 | FIELD-REGISTER LOCK | ITEM-013 | Pending | MISMATCH: Governance says CLOSED, board says Pending |
| 14 | AO-005 DPIA + disclosure copy | — | Pending | MATCH (no governance note) |
| 15 | Gate-contracts scope note | — | Pending | MATCH (no governance note) |
| 16 | Deferred sweep + D26 | — | Pending | MATCH (no governance note) |
| 17 | Reconcile 10 P2 status mismatches | — | Pending | MATCH (no governance note) |
| 18 | Retire old Vite screens + root src/ | — | Pending | MATCH (no governance note) |
| 19 | Commit Mobile phase plan | — | Pending | MATCH (no governance note) |
| 20 | iOS backend doc | — | Pending | MATCH (no governance note) |
| 21 | Test bar policy | — | Pending | MATCH (no governance note) |

### Phase C — Backend Foundation

| # | Board Title | Governance Title | Status | MATCH? |
|---|-------------|------------------|--------|--------|
| 22 | AO-000 Edge Function scaffolding | — | Pending | MATCH (no governance note) |
| 23 | verify-turnstile EF | — | Pending | MATCH (no governance note) |
| 24 | Expo port screens | ITEM-024 | CLOSED | MATCH (post-fix) |
| 25 | Migration 043 report-card + certs | — | Pending | MATCH (no governance note) |
| 26 | RLS for 042/043 + no-FK tenant-scoping audit | — | Pending | MATCH (no governance note) |
| 27 | Seed data: demo families | — | Pending | MATCH (no governance note) |
| 28 | Office Desk mutation EFs + gate contracts v1 | — | Pending | MATCH (no governance note) |
| 29 | EFs: class-start-ping, validate-toggle, ai-tutor-proxy | — | Pending | MATCH (no governance note) |
| 30 | EF/RPC inventory doc + Realtime usage audit | — | Pending | MATCH (no governance note) |

### Phase D — Design and Frontend

| # | Board Title | Governance Title | Status | MATCH? |
|---|-------------|------------------|--------|--------|
| 31 | Verify design items against v0 links | — | Pending | MATCH (no governance note) |
| 32 | DESIGN FREEZE — fires on 31 | ITEM-009 | Pending | MISMATCH: Governance says FROZEN, board says Pending |
| 33 | Migration 042 consent + suppression | — | Pending | MATCH (post-fix) |

### Phase E — Wiring

| # | Board Title | Governance Title | Status | MATCH? |
|---|-------------|------------------|--------|--------|
| 34 | Wire: Home | — | Pending | MATCH (no governance note) |
| 35 | Wire: Classes | — | Pending | MATCH (no governance note) |
| 36 | Wire: Profile | — | Pending | MATCH (no governance note) |
| 37 | Wire: teacher screens | — | Pending | MATCH (no governance note) |
| 38 | Wire: Report Card | — | Pending | MATCH (no governance note) |
| 39 | Wire: Hub | — | Pending | MATCH (no governance note) |

### Phase F — Web, Desks, Deploy

| # | Board Title | Governance Title | Status | MATCH? |
|---|-------------|------------------|--------|--------|
| 40 | Lovable website intake — Turnstile via 23 mandatory | — | Pending | MATCH (no governance note) |
| 41 | Front Desk, Office Desk, School Desk consoles | — | Pending | MATCH (no governance note) |
| 42 | Cloudflare deploy | — | Pending | MATCH (no governance note) |

### Phase G — AO Doc Series

| # | Board Title | Governance Title | Status | MATCH? |
|---|-------------|------------------|--------|--------|
| 43 | AO-001: send-rail.md | — | Pending | MATCH (no governance note) |
| 44 | AO-002: safeguarding-pipeline.md | — | Pending | MATCH (no governance note) |
| 45 | AO-003: agent-registry.md | — | Pending | MATCH (no governance note) |
| 46 | AO-004: gates.md | — | Pending | MATCH (no governance note) |

### Phase H — Terminal Gates

| # | Board Title | Governance Title | Status | MATCH? |
|---|-------------|------------------|--------|--------|
| 47 | QA adversarial RLS pass — extends 152/152 baseline | — | Pending | MATCH (no governance note) |
| 48 | E2E demo + Cece sign-off — terminal human gate | — | Pending | MATCH (no governance note) |

## Summary

**Total rows:** 48
**MATCH:** 46
**MISMATCH:** 2

### Mismatches Found

1. **Item 13 (FIELD-REGISTER LOCK):** Board says Pending, governance note (item-13-field-register-guard.md) says CLOSED
2. **Item 32 (DESIGN FREEZE):** Board says Pending, governance note (ITEM-009-design-freeze.md) says FROZEN

### Status Discrepancies (Board vs Governance)

| Item | Board Status | Governance Status | Source |
|------|--------------|-------------------|--------|
| 13 | Pending | CLOSED | item-13-field-register-guard.md |
| 32 | Pending | FROZEN | ITEM-009-design-freeze.md |

### Board Numbering Mismatch (DEFECT-002)

The original board (`master-todo-v2.md`) and reconciled board (`docs/governance/MASTER-TODO-V2.md`) have different numbering for the same items. This is logged as DEFECT-002 — Unauthorized Board Renumbering.

## Renumbering Investigation

**Git log for `master-todo-v2.md`:**
- `1b9f9e5` (2026-07-11): Initial creation, 48 items, Phases A-H
- `43bb752` (2026-07-15): Closed Item 33 (Expo Port) — error
- `6efcbdd` (2026-07-15): Fixed — Item 24 CLOSED (Expo Port), Item 33 restored

**Git log for `docs/governance/MASTER-TODO-V2.md`:**
- `fd6422e` (2026-07-13): Initial creation, backfill sealed rulings
- `765b470` (2026-07-13): Reconciliation — new numbering, superseded-by-R19 markers

**Conclusion:** The renumbering occurred on 2026-07-13 when the reconciled board was created without a Cece ruling. The original board was not updated to reflect the new numbering, creating a split.

## Recommendations

1. **Immediate:** Update Item 13 and Item 32 statuses to match governance notes
2. **Governance:** Cece ruling required to unify board numbering (DEFECT-002)
3. **Process:** Board numbering is now a ruled surface — changes require ruling

---

Auditor: Architect
Date: 2026-07-15
Status: AUDIT COMPLETE — 2 mismatches found, 1 defect logged

2026-07-18 full-sweep: 19 stale Pending rows corrected to disk truth @ 25a704d4aa953dff366f533ce70cc744beb5d9e4; PLAN-STATE hash + register counts fixed.
