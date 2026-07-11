# Master TODO v2 FINAL — Sole Active Plan

Ratified: 2026-07-11 — Cece final human gate.
Supersedes: master-todo-v1 (archived to plans/done/).
Changes require a DEFECT filing with evidence — no new review rounds.

---

## PHASE A — CECE INPUTS (RULINGS AND ASSETS, CRITICAL PATH)

| # | Item | Type | Status |
|---|------|------|--------|
| 1 | Ruling: group chat | Ruling | Pending |
| 2 | Ruling: certificates | Ruling | Pending |
| 3 | Ruling: report-card demo | Ruling | Pending |
| 4 | Ruling: section 8 exemption — demo wave runs no agents; section 8 binds from first agent item | Ruling | Pending |
| 5 | Ruling: Expo vs Capacitor + tech-stack.md amendment | Ruling | Pending |
| 6 | Ruling: authority-gate doctrine text + Gate 15 amendment | Ruling | Pending |
| 7 | Ruling: record d64bb05 | Ruling | Pending |
| 8 | Asset: v0 mobile design links | Asset | Pending |
| 9 | Asset: Lovable website link | Asset | Pending |
| 10 | Asset: brand hex + logos | Asset | Pending |
| 11 | Asset: Supabase cloud URL + anon key (at deploy) | Asset | Pending |
| 12 | Asset: Cloudflare credentials | Asset | Pending |

## PHASE B — PLAN HYGIENE AND GOVERNANCE

| # | Item | Gate | Status |
|---|------|------|--------|
| 13 | FIELD-REGISTER LOCK — CI guard script at supabase/guard-field-register.sh; wired into ci.yml; red-run demonstrated; closes only when (a) script exists, (b) wired in CI, (c) red-run passes | CI guard | Pending |
| 14 | AO-005 DPIA + disclosure copy — before any pupil-data wiring | Compliance | Pending |
| 15 | Gate-contracts scope note — name the MVP subset of the 14 section 5 gates | Planning | Pending |
| 16 | Deferred sweep + D26, with explicit D16 disposition (track or WON/T FIX) | Housekeeping | Pending |
| 17 | Reconcile 10 P2 status mismatches | Housekeeping | Pending |
| 18 | Retire old Vite screens + root src/ migration or deletion | Cleanup | Pending |
| 19 | Commit Mobile phase plan | Planning | Pending |
| 20 | iOS backend doc | Docs | Pending |
| 21 | Test bar policy — pgTAP minimums, RLS positive+negative cases, CI runtime budget | QA | Pending |

## PHASE C — BACKEND FOUNDATION

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 22 | AO-000 Edge Function scaffolding, including the EF test pattern | — | Pending |
| 23 | verify-turnstile EF — reference smoke-test EF | — | Pending |
| 24 | Migration 042 consent + suppression | 13, 14 | Pending |
| 25 | Migration 043 report-card + certs | 3 | Pending |
| 26 | RLS for 042/043 + no-FK tenant-scoping audit of the 035 pattern | 24, 25 | Pending |
| 27 | Seed data: demo families | 26 | Pending |
| 28 | Office Desk mutation EFs + gate contracts v1 — scoped per 15 | 15, 22 | Pending |
| 29 | EFs: class-start-ping, validate-toggle, ai-tutor-proxy | 22 | Pending |
| 30 | EF/RPC inventory doc + Realtime usage audit | 22, 29 | Pending |

## PHASE D — DESIGN AND FRONTEND

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 31 | Verify design items against v0 links | 8 | Pending |
| 32 | DESIGN FREEZE — fires on 31 | 31 | Pending |
| 33 | Expo port screens, including devotional fields | 5, 32 | Pending |

## PHASE E — WIRING (gated by 14, 26, 27)

| # | Item | Status |
|---|------|--------|
| 34 | Wire: Home | Pending |
| 35 | Wire: Classes | Pending |
| 36 | Wire: Profile | Pending |
| 37 | Wire: teacher screens | Pending |
| 38 | Wire: Report Card | Pending |
| 39 | Wire: Hub | Pending |

## PHASE F — WEB, DESKS, DEPLOY

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 40 | Lovable website intake — Turnstile via 23 mandatory | 9, 23 | Pending |
| 41 | Front Desk, Office Desk, School Desk consoles | 28, 40 | Pending |
| 42 | Cloudflare deploy | 11, 12 | Pending |

## PHASE G — AO DOC SERIES (must complete before any agent operates, per 4)

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 43 | AO-001: send-rail.md | 22 | Pending |
| 44 | AO-002: safeguarding-pipeline.md | — | Pending |
| 45 | AO-003: agent-registry.md | 43 | Pending |
| 46 | AO-004: gates.md | 43, 44, 45 | Pending |

## PHASE H — TERMINAL GATES

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 47 | QA adversarial RLS pass — extends 152/152 baseline | 26 | Pending |
| 48 | E2E demo + Cece sign-off — terminal human gate | 34-46, 47 | Pending |

---

## BACKLOG (parked, not in scope)

- Mobile CI re-inclusion
- Automated E2E strategy
- P2-030 session_attendance
- My Analytics design doc
- apps/lms decision

## ITEM 13 — ACCEPTANCE CRITERIA (Cece ruling, 2026-07-11)

Item 13 closes only when ALL of:
- (a) guard script exists at supabase/guard-field-register.sh (or equivalent per repo convention)
- (b) script wired into ci.yml alongside the three existing CI Hard Rule guards
- (c) demonstrated red run: guard fails CI on deliberate violation, then passes on fix

Items 24, 25 remain hard-gated on item 13 closing under (a)-(c).
