# MASTER-TODO-V2 — Build Board (Reconciled 2026-07-13)

Canonical source: mobile-phase-plan.md (items 5-14) + master-todo-v2.md (items 15+).
This index is the single source of truth. Old Phase A-H numbering is
superseded by this build list.

---

## Sealed Rulings

| # | Item | File | Commit | Date |
|---|------|------|--------|------|
| 1 | Ruling: group chat | rulings/ITEM-001-chat.md | 019503b | 2026-07-13 |
| 2 | Ruling: certificates | rulings/ITEM-002-certificates.md | 019503b | 2026-07-13 |
| R16 | Demo scope: chat minimal, cert storage, report card live | rulings/BUILD-R16-R18-demo-scope.md | ed52049 | 2026-07-13 |
| R17 | (same file as R16) | | | |
| R18 | (same file as R16) | | | |
| R19 | DESIGN FREEZE — frozen at 8d7ae52 | rulings/BUILD-R19-design-freeze.md | fb33e14 | 2026-07-13 |

## Build Board

### Phase 1 — Core Screens (COMPLETE, frozen at R19)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5 | My Groups block (social screen) | CLOSED | Frozen at R19 |
| 6 | Family ledger variant | CLOSED | Frozen at R19 |
| 7 | Teacher variant | CLOSED | Frozen at R19 |
| 8 | Report Card tab states | CLOSED | Frozen at R19 |
| 9 | DESIGN FREEZE | SEALED | R19 (fb33e14) |

### Phase 2 — Backend Spine (active phase)

Build order: 10 -> 11 -> 12 -> 13 -> 14 (strict linear).

| # | Item | Status | Acceptance Criteria | Gated By |
|---|------|--------|-------------------|----------|
| 10 | Migration 042 — consent + suppression | OPEN | Close-out: field-register CI script exists + wired (was item 13 gate, now close-out criterion per inputs-vs-evidence doctrine) | — |
| 11 | Migration 043 — report-card + certs | OPEN | Close-out: report-card demo ruling sealed OR carried-forward evidence attached (was item 3 gate, now close-out criterion) | 10 |
| 12 | RLS for 042/043 + no-FK tenant-scoping audit | OPEN | RLS positive AND negative cases per item 21 test bar; RLS denial cases verified | 11 |
| 13 | Seed data: demo families | OPEN | | 12 |
| 14 | Office Desk mutation EFs + gate contracts v1 | OPEN | | 15, 22 |

### Phase 3 — Plan Hygiene

| # | Item | Status | Notes |
|---|------|--------|-------|
| 15 | FIELD-REGISTER LOCK — CI guard | OPEN | |
| 16 | Deferred sweep + D26 | OPEN | |
| 17 | Reconcile P2 status mismatches | OPEN | |
| 18 | Retire old Vite screens + root src/ | CLOSED | Phase 0.2b/c |
| 19 | Mobile phase plan committed | CLOSED | 3cfcab8 |

### Asset Drops (human-provided by Cece)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 20 | Brand assets: hex palette, logos | OPEN | Cece provides |
| 21 | Supabase cloud URL + anon key | OPEN | Cece provides at deploy |
| 22 | Cloudflare credentials | OPEN | Cece provides |

### Remaining Items

| # | Item | Status | Notes |
|---|------|--------|-------|
| 23 | iOS backend doc | OPEN | |
| 24 | Test bar policy — pgTAP minimums | OPEN | |
| 25 | AO-000 Edge Function scaffolding | OPEN | |
| 26 | verify-turnstile EF | OPEN | |
| 27 | AO-005 DPIA + disclosure copy | OPEN | |
| 28 | Gate-contracts scope note | OPEN | |
| 29 | EF/RPC inventory + Realtime audit | OPEN | |
| 30 | Verify design against v0 links | OPEN | |
| 31 | Expo port screens | OPEN | |
| 32 | Wire: Home | OPEN | Phase E |
| 33 | Wire: Classes | OPEN | |
| 34 | Wire: Profile | OPEN | |
| 35 | Wire: teacher screens | OPEN | |
| 36 | Wire: Report Card | OPEN | |
| 37 | Wire: Hub | OPEN | |
| 38 | Lovable intake + Turnstile | OPEN | |
| 39 | Desks consoles (Front, Office, School) | OPEN | |
| 40 | Cloudflare deploy | OPEN | |
| 41 | AO-001: send-rail.md | OPEN | |
| 42 | AO-002: safeguarding-pipeline.md | OPEN | |
| 43 | AO-003: agent-registry.md | OPEN | |
| 44 | AO-004: gates.md | OPEN | |
| 45 | QA adversarial RLS pass | OPEN | |
| 46 | E2E demo + Cece sign-off | OPEN | |

---

## Defect Register

| Defect | Affected Items | File | Commit |
|--------|---------------|------|--------|
| DEFECT-001 | Item 1 (chat) — BUILD, not BUY | defects/DEFECT-001.md | 019503b |

---

## Superseded Rows (from old Phase A-H master-todo-v2.md)

The following old index rows are superseded by this build list:

| Old # | Old Title | Superseded By | Reason |
|-------|-----------|---------------|--------|
| 3 | Ruling: report-card demo | Item 11 close-out criterion | Converted to acceptance criterion |
| 4 | Ruling: section 8 exemption | — | Open, unnumbered — filed under governance |
| 5 | Ruling: Expo vs Capacitor | Item 31 | Expo chosen; tech-stack.md amendment deferred |
| 6 | Ruling: authority-gate doctrine | — | Open, unnumbered |
| 7 | Ruling: record d64bb05 | — | Open — consumed by mobile-phase-plan.md |
| 8 | Asset: v0 mobile design links | Item 30 | Same work item |
| 9 | Asset: Lovable website link | Item 38 | Same work item |
| 10 | Asset: brand hex + logos | Item 20 | Renumbered |
| 11 | Asset: Supabase cloud URL + anon key | Item 21 | Renumbered |
| 12 | Asset: Cloudflare credentials | Item 22 | Renumbered |
| 32 | DESIGN FREEZE | Item 9 | Sealed at R19 |
| 33 | Expo port screens | Item 31 | Same work item |

---

Backlog items (parked, not in scope) per master-todo-v2.md appendix: unchanged.

Signed: Cece -- final human gate. 2026-07-13.
