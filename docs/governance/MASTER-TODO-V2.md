# MASTER-TODO-V2 — Sole Authoritative Board

**Ratified:** 2026-07-11 — Cece final human gate.
**Supersedes:** master-todo-v1 (archived to plans/done/).
**Single-board ruling:** 2026-07-15 — DEFECT-002 remediation. This file is the SOLE authoritative board. All numbering matches governance notes (ITEM-001, ITEM-009, ITEM-013, ITEM-024, etc.).
**Changes require:** DEFECT filing with evidence — no new review rounds.

---

## PHASE A — CECE INPUTS (RULINGS AND ASSETS, CRITICAL PATH)

| # | Item | Type | Status |
|---|------|------|--------|
| 1 | Ruling: group chat | Ruling | DONE - ITEM-001-chat.md Sealed 2026-07-13 [pre-AR-10: no hash] |
| 2 | Ruling: certificates | Ruling | DONE - ITEM-002-certificates.md Sealed 2026-07-13 [pre-AR-10: no hash] |
| 3 | Ruling: report-card demo | Ruling | DONE - BUILD-R16-R18-demo-scope.md Sealed 2026-07-13 [pre-AR-10: no hash] |
| 4 | Ruling: section 8 exemption - demo wave runs no agents; section 8 binds from first agent item | Ruling | DONE - S8 exemption per audit/deferred text [pre-AR-10: no hash] |
| 5 | Ruling: Expo vs Capacitor + tech-stack.md amendment | Ruling | DONE - ITEM-024 sealed; tech-stack.md amended (6d1a38a) |
| 6 | Ruling: authority-gate doctrine text + Gate 15 amendment | Ruling | Pending |
| 7 | Ruling: record d64bb05 | Ruling | DONE - rulings/ITEM-004-d64bb05-registration-pipeline.md Sealed [pre-AR-10: no hash] |
| 8 | Asset: v0 mobile design links | Asset | DONE - design-links.md + docs/design/05-my-groups.md,06-family-variant.md,07-teacher-variant.md,08-report-card-tab.md present [pre-AR-10: no hash] |
| 9 | Asset: Lovable website link | Asset | DONE - tech-stack.md amended (6d1a38a): Lovable = front desk intake |
| 10 | Asset: brand hex + logos | Asset | PARTIAL - 13 hex approved, placeholder-grade; TODO-FINAL-LOGO x6 outstanding (docs/brand-assets.md) |
| 11 | Asset: Supabase cloud URL + anon key (at deploy) | Asset | DONE — SB-11 CLEARED per PLAN-STATE clearing ruling 2026-07-22 [9273fd8] |
| 12 | Asset: Cloudflare credentials | Asset | Pending |

## PHASE B — PLAN HYGIENE AND GOVERNANCE

| # | Item | Gate | Status |
|---|------|------|--------|
| 13 | FIELD-REGISTER LOCK — CI guard script at supabase/guard-field-register.sh; wired into ci.yml; red-run demonstrated; closes only when (a) script exists, (b) wired in CI, (c) red-run passes | CI guard | **CLOSED** — per item-13-field-register-guard.md (2026-07-15) [pre-AR-10: no hash] |
| 14 | AO-005 DPIA + disclosure copy — before any pupil-data wiring | Compliance | PARTIAL — draft v2 written, owner content review pending (reverted from DONE per hold order 2026-07-22) |
| 15 | Gate-contracts scope note — name the MVP subset of the 14 section 5 gates | Planning | DONE — scope note finalized with CF-12 contract per Cece ruling 2026-07-22 [ed0870f] |
| 16 | Deferred sweep + D26, with explicit D16 disposition (track or WONTFIX) | Housekeeping | DONE - deferred.md D1-D31 complete incl. D26; D16/D17/D18 Open tracked [pre-AR-10: no hash] |
| 17 | Reconcile 2 (ratified) P2 status mismatches | Housekeeping | DONE - enumeration: next-steps-plan.md P2 tables, 17a session 2026-07-20, sealed at ae32461; governance sweep corrections sealed [ff91cca] |
| 18 | Retire old Vite screens + root src/ migration or deletion | Cleanup | DONE - d7d11fb (1911 del) + e50799d (90 del) |
| 19 | Commit Mobile phase plan | Planning | DONE - commit 3cfcab8 |
| 20 | iOS backend doc | Docs | DONE - docs/planning/ios-backend-doc.md (artifact-traced; assign_tenant only EF present, rest PLANNED; RLS via AGENTS.md:116-117) [pre-AR-10: no hash] |
| 21 | Test bar policy — pgTAP minimums, RLS positive+negative cases, CI runtime budget | QA | DONE - docs/governance/test-bar-policy.md (240/24 floor, RLS +- cases, 30min CI budget) [pre-AR-10: no hash]; r21 amendments approved [d5c23f0] |

## PHASE C — BACKEND FOUNDATION

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 22 | AO-000 Edge Function scaffolding, including the EF test pattern | - | DONE - 4 EF stubs created (verify-turnstile, class-start-ping, validate-toggle, ai-tutor-proxy); field-register S-C updated [9e0f749] |
| 23 | verify-turnstile EF - reference smoke-test EF | - | DONE - full implementation (2026-07-23) |
| 24 | Expo port screens, including devotional fields | 5, 32 | **CLOSED** — 11/11 screens, tsc clean, freeze intact. Governance ITEM-024 sealed by Cece. Hashes: af66274, 3ad4459, 778d0ad, c4417e2 |
| 25 | Migration 043 report-card + certs | 3 | DONE - 043_report_cards_and_certs.sql present [097a32d] |
| 26 | RLS for 042/043 + no-FK tenant-scoping audit of the 035 pattern | 24, 25 | DONE - 044_rls_for_042_043.sql + 050/051/052/053 office-RC lifecycle + 063_family_ledger_report_card_access.sql [457f7c4] |
| 27 | Seed data: demo families | 26 | DONE - seeded visible card + family_child links [f9ce73d]; R18 live write->release RPCs, 8/8 AC pass [7385720] |
| 28 | Office Desk mutation EFs + gate contracts v1 - scoped per 15 | 15, 22 | Pending |
| 29 | EFs: class-start-ping, validate-toggle, ai-tutor-proxy | 22 | DONE - full implementations, locally tested (4/4, 7/7, 7/7 paths), config.toml registered |
| 30 | EF/RPC inventory doc + Realtime usage audit | 22, 29 | DONE - EF/RPC inventory complete, docs/EF-RPC-INVENTORY.md present [c4f76f2] |

## PHASE D — DESIGN AND FRONTEND

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 31 | Verify design items against v0 links | 8 | DONE — PASS-WITH-NOTES, findings sealed in docs/V0-DESIGN-REVIEW.md [e7ed3b1] |
| 32 | DESIGN FREEZE — fires on 31 | 31 | DONE — cleared per DF-32 CLEARING RULING 2026-07-22; blocker 31 sealed e7ed3b1 |
| 33 | Migration 042 consent + suppression | 13, 14 | DONE - 042_consent_suppression.sql [a270571] + 047_consent_guard_and_fixes.sql [1edf9ce] present |

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
| 45 | AO-003: agent-registry.md | 43 | DONE - docs/governance/agent-registry.md (registry contract; no on-disk agent defs yet, PLANNED-to-populate; AGENTS.md is SoT) [0dc922e] |
| 46 | AO-004: gates.md | 43, 44, 45 | Pending |

## PHASE H — TERMINAL GATES

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 47 | QA adversarial RLS pass — extends 152/152 baseline | 26 | Pending |
| 48 | E2E demo + Cece sign-off — terminal human gate | 34-46, 47 | Pending |

## PHASE I — DEPLOY AND DNS

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 49 | DNS cutover: redhouse.school → Cloudflare (near-launch) | 42 | Pending |
| 50 | profiles UPDATE self-policy has no WITH CHECK — NOT EXPLOITABLE. No UPDATE grant on id/tenant_id/role; tenant_id additionally trigger-guarded (trg_profiles_tenant_id_immutable). Superseded by grant-hygiene fix 068. | — | CLOSED |
| 51 | Verify migrations 054/055 numbering gap — confirm intentionally absent or locate missing files | — | Pending |
| 52 | Schema-wide grant sweep — migration 069 revoke TRUNCATE/TRIGGER/REFERENCES/MAINTAIN from anon+authenticated on all public tables + ALTER DEFAULT PRIVILEGES for future tables | — | **CLOSED** — migration 069 applied locally, pgTAP 264/264 PASS. Audit: 267 rows (anon+authenticated) → 76 rows (authenticated-only, CRUD only); anon = 0 rows across all public tables. postgres default ACL on public: `{postgres=arwdDxtm, service_role=Dxtm}` (anon+authenticated stripped). supabase_admin-owned default ACL: platform-owned, not alterable by postgres — accepted residual. By-design: six tables grant-empty for authenticated (chapters, devotional_config, devotional_item, tenant_devotional, tenant_lms, tenant_mobile) — reads via SECURITY DEFINER RPC, design intent; RPC not implemented — tracked ITEM-59 (ruled World A), RPC build gates rows 34-35, dead 015 policies tracked ITEM-60. **ACL-decode lesson:** Two independent misreadings of Dxtm this session (TRUNCATE/TRIGGER/MAINTAIN vs INSERT/TRUNCATE/TRIGGER/MAINTAIN); future grant audits MUST decode against the aclitem legend explicitly (arwdDxtm = a INSERT, r SELECT, w UPDATE, d DELETE, D TRUNCATE, x REFERENCES, t TRIGGER, m MAINTAIN). The originally sealed legend itself omitted x=REFERENCES — third misdecode of the session; corrected in this commit. Ref: 068, 069, table_privileges audit 2026-07-25, supabase/migrations/069_grant_sweep_default_privileges.sql [b89e8ee] |
| 53 | Sequence ACL audit — postgres default ACL grants anon=w (UPDATE → nextval/setval) on future sequences; existing sequences never audited for anon/authenticated grants | — | **CLOSED** — Current-state audit: zero sequences exist in public (UUID PKs throughout); nothing to revoke retroactively. Gap confirmed: postgres-owned default ACL granted anon=w, authenticated=w on future public sequences (nextval/setval). Collateral finding: 069 had inverted the service_role table default ACL (Dxtm kept, arwd lost) — the exact failure class migration 066 previously fixed at the object level. Fix: migration 071 (commit 0673ee2) — revoked ALL on future sequences from client roles; restored service_role CRUD and stripped TRUNCATE/REFERENCES/TRIGGER on future tables. Post-fix state: S = postgres=rwU, service_role=w; r = postgres=arwdDxtm, service_role=arwdm; f unchanged. Accepted residual: supabase_admin-owned default ACLs (platform schemas + public) grant rwU to client roles; not alterable by postgres — per ITEM-52 residual pattern. Migrations run as postgres, so this path is dormant for project objects. **Ruling note:** 069 collateral logged as a raw-output-over-prose event — the inverted grant sat undetected in the sealed 069 audit until the ITEM-53 defacl query surfaced it. Ref: 071, pg_default_acl audit 2026-07-25 [0673ee2] |
| 54 | Write-grant review — 16 tables with full CRUD for authenticated (incl. report_cards DELETE, consent_records UPDATE/DELETE); cross-check against RLS policy inventory and RPC surface to confirm each write privilege is necessary | — | **CLOSED** — migration 070 revoked DELETE from authenticated on report_cards, consent_records, messages, certificates (commit 30c547f). Column-grant audit: only column-scoped UPDATE grants are profiles.handle and notifications.read_at; notifications mark-read gap disproven (agent prose contradicted its own raw output — misdecode logged). RLS policy inventory + RPC surface cross-referenced against role_table_grants; full audit data collected 2026-07-25. Test edit to 063 (tests 8,13: lives_ok → throws_ok '42501') shipped inside the fix commit; scope deviation accepted as necessitated-by-change. Ref: 070, column_privileges audit, pg_policies inventory, pg_proc plpgsql filter [30c547f] |
| 55 | Column-grant narrowing — restrict UPDATE on privileged columns (report_cards.status/released_at/released_by; messages sender_id/conversation_id/created_at; consent_records.given_at/ip_address; tenant_id on all full-CRUD tables) | 54 | Pending |
| 56 | Dead-policy cleanup — chapter_progress and enrollments carry student INSERT/DELETE policies with no matching grants | 54 | Pending |

---

## BACKLOG (parked, not in scope)

- Mobile CI re-inclusion
- Automated E2E strategy
- P2-030 session_attendance
- My Analytics design doc
- apps/lms decision

---

# APPENDIX A: RULINGS ATTACHED AND BINDING

## Ruling 1 — Item 13 (2026-07-11)

"Evidence of absence-on-disk confirms pending status; it does not constitute a plan DEFECT under the binding vocabulary."

Item 13 closes only when ALL of:
- (a) guard script exists at supabase/guard-field-register.sh (or equivalent per repo convention)
- (b) script wired into ci.yml alongside the three existing CI Hard Rule guards
- (c) demonstrated red run: guard fails CI on deliberate violation, then passes on fix

Items 24, 25 remain hard-gated on item 13 closing under (a)-(c).

## Ruling 2 — Batch 2, Revised Final (2026-07-11)

16 objections split into TWO categories:

**Category 1 — Execution Evidence (item-13 precedent applies):**
QA 47, 48; Security 15, 22, 23, 24, 28, 40, 44, 46, 47;
Frontend 34–39, 40, 41.

Disposition: overruled as blockers, adopted as close-out acceptance
criteria. Security countersignature required on each named artifact
at item close-out, not at ratification.

**Category 2 — Input Dependency (item-13 precedent does NOT apply):**
Frontend 31, 33.

Disposition: UPHELD. These depend on design REFERENCES (v0 links),
which are inputs, not execution evidence. Inputs must pre-exist the
items that consume them. The plan already encodes this: item 31 is
hard-gated on item 8 (v0 links) and item 33 on items 5 and 32.
Binding restatement: items 31 and 33 CANNOT start before item 8 is
delivered and DESIGN FREEZE fires. Objection satisfied by existing
gates without plan amendment.

### R1 Doctrine, binding henceforth:
- "Pending item lacks execution evidence" → summarily resolved under item-13 precedent.
- "Pending item lacks required input" → valid only if input is ungated; gated inputs satisfy the objection by structure.
- All future changes require DEFECT filing with evidence. No new review rounds.

---

# APPENDIX B: ACCEPTANCE-CRITERIA LEDGER

Close-out gates added this session:

| Item | Close-out Criterion | Owner |
|------|-------------------|-------|
| 13 | CI guard live at supabase/guard-field-register.sh + wired in ci.yml + red-run demonstrated (a)(b)(c) | Backend |
| 15 | Security lead countersign on scope note review | Security |
| 22 | Security lead countersign on EF scaffold + red-test | Security |
| 23 | Security lead countersign on turnstile red-test | Security |
| 24 | Security lead countersign on migration + RLS audit evidence | Security |
| 28 | Security lead countersign on RLS audit evidence | Security |
| 31 | v0 design verification against frozen references — screen-by-screen match recorded | Frontend |
| 33 | DESIGN FREEZE (32) attestation attached | Frontend |
| 34–39 | Per-screen wiring sign-off by Frontend lead | Frontend |
| 40 | Security lead countersign on Turnstile enforcement proof + Frontend per-screen sign-off | Security, Frontend |
| 41 | Frontend per-screen sign-off | Frontend |
| 44 | Security lead countersign on doc review | Security |
| 46 | Security lead countersign on doc review | Security |
| 47 | Joint QA/Security sign-off on adversarial RLS pass extending 152/152 baseline with positive AND negative cases per item-21 test bar | QA, Security |
| 48 | Live E2E demo before Cece — terminal human gate | Cece |

---

# SESSION CLOSEOUT — 2026-07-11

RATIFICATION RECORD
- master-todo v2 (48 items, Phases A–H + backlog) FROZEN as sole active plan.
- Final tally: 7/7 UNANIMOUS APPROVE (PM, CTO, Backend, Frontend, QA, Security, Governance).
- master-todo v1: closed signed, archived at plans/done/master-todo-v1.md.

STATE AT CLOSE
- Execution position: Phase A, item 1 — Ruling: group chat (NOT STARTED)
- Critical path owner: Cece (items 1–12); item 8 (v0 links) is the binding unlock for the Phase D/E chain.

---

# SINGLE-BOARD RULING — 2026-07-15

**DEFECT-002 remediation.** Effective 2026-07-15:
- This file (docs/governance/MASTER-TODO-V2.md) is the SOLE authoritative board.
- All numbering matches governance notes (ITEM-001, ITEM-009, ITEM-013, ITEM-024, etc.).
- master-todo-v2.md at project root: replaced with pointer to this file.
- Changes to board numbering require Cece ruling.

Signed: Cece — final human gate. 2026-07-15.
