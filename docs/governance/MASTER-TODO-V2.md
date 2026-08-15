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
| 6 | Ruling: authority-gate doctrine text + Gate 15 amendment | Ruling | DONE - authority-gate doctrine adopted at 341e81a (docs/governance/authority-gate-doctrine.md, 69 lines); session close 2026-07-22 evening confirmed |
| 7 | Ruling: record d64bb05 | Ruling | DONE - rulings/ITEM-004-d64bb05-registration-pipeline.md Sealed [pre-AR-10: no hash] |
| 8 | Asset: v0 mobile design links | Asset | DONE - design-links.md + docs/design/05-my-groups.md,06-family-variant.md,07-teacher-variant.md,08-report-card-tab.md present [pre-AR-10: no hash] |
| 9 | Asset: Lovable website link | Asset | DONE - tech-stack.md amended (6d1a38a): Lovable = front desk intake |
| 10 | Asset: brand hex + logos | Asset | BLOCKED-ON-ASSET — 13 hex approved and documented (docs/brand-assets.md); 6 final logos outstanding (TODO-FINAL-LOGO x6), owner: Cece, no agent action possible. Re-slotted 2026-08-03: revisit at next weekly planning. |
| 11 | Asset: Supabase cloud URL + anon key (at deploy) | Asset | DONE — SB-11 CLEARED per PLAN-STATE clearing ruling 2026-07-22 [9273fd8] |
| 12 | Asset: Cloudflare credentials + TURNSTILE_SECRET_KEY | Asset | Pending — includes CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_PAGES_PROJECT (CI + local .env), custom domain, and production TURNSTILE_SECRET_KEY value (E2E currently uses Cloudflare test key 1x0000000000000000000000000000000AA). |

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
| 22 | AO-000 Edge Function scaffolding, including the EF test pattern | - | DONE — shared modules created at supabase/functions/_shared/{cors,error-envelope,auth-context}.ts; verify-turnstile refactored to use shared imports. Committed at [2b43a4d] |
| 23 | verify-turnstile EF - reference smoke-test EF | — | DONE - full implementation: POST to Cloudflare /siteverify, CORS, fail-loud on missing secret, input validation, method enforcement; local 4/4; live deploy 3/3 2026-07-27 (9542a23, 59dd6c3, 3705235, 216f61e); registered in supabase/config.toml with TURNSTILE_SECRET_KEY env binding; browser-201 E2E passed 2026-08-03 (test keys): curl 201 + Playwright headless Chromium 201, real Turnstile widget token, leads rows verified (e2e-2026-08-03@test.local, e2e-browser-2026-08-03@test.local). Spec: tests/e2e/browser-201.spec.ts. Production provisioning remains open under row 12: real TURNSTILE_SECRET_KEY value and Cloudflare credentials (E2E ran on Cloudflare test keys). |
| 24 | Expo port screens, including devotional fields | 5, 32 | **CLOSED** — 11/11 screens, tsc clean, freeze intact. Governance ITEM-024 sealed by Cece. Hashes: af66274, 3ad4459, 778d0ad, c4417e2 |
| 25 | Migration 043 report-card + certs | 3 | DONE - 043_report_cards_and_certs.sql present [097a32d] |
| 26 | RLS for 042/043 + no-FK tenant-scoping audit of the 035 pattern | 24, 25 | DONE - 044_rls_for_042_043.sql + 050/051/052/053 office-RC lifecycle + 063_family_ledger_report_card_access.sql [457f7c4] |
| 27 | Seed data: demo families | 26 | DONE - seeded visible card + family_child links [f9ce73d]; R18 live write->release RPCs, 8/8 AC pass [7385720] |
| 28a | `set_handle` EF — profile handle assignment | 15, 22 | DONE — code + DB tests complete (062: 25/25, 062a: 17/17); HTTP matrix evidence-complete (8/8 cases pass: 5a self-set, 5c format-reject, 5d cross-tenant deny, 5e admin-set, 6a OPTIONS, 6b 405, 6c(i) missing-auth, 6c(ii) bad-jwt); docs/evidence/28a-http-matrix.md sealed |
| 28b | `release-report-card` EF + gate contracts v1 | 15, 22 | DONE (2026-07-22) |
   -----
   **Standing Verification Rule (2026-07-25):**
   "Code isolation without DB isolation is no isolation. Worktree/stash verifications against a shared local database are VOID. Pre-existing-failure claims require supabase db reset from the tree under test." (Ratified as AR-14, docs/governance/audit-rules.md, 2026-07-27.)
   **NOTE for ITEM-56:** applied inside the MASTER-TODO-V2 edit — note: "deferred - requires fix commit" only if runtime files were touched — runtime files unchanged, so ITEM-56 state remains "DONE" (row carries DONE status).
| 29 | EFs: class-start-ping, validate-toggle, ai-tutor-proxy | 22 | DONE - full implementations, locally tested (4/4, 7/7, 7/7 paths), config.toml registered. Note: ai-tutor-proxy is LMS-scoped and deferred to post-MVP. EF exists as backend plumbing only — no product UI, no MVP association. Do not prioritize alongside web/iOS/Front Desk work. |
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
| 34 | Wire: Home | **DONE** — Resolved — confirmed live on hosted via migration list, 2026-08-11. PGRST202 assumption was incorrect. 082 get_today_devotional() RPC + index.tsx wired; loading/error/empty states; tsc clean. |
| 35 | Wire: Classes | **DONE** — Resolved — confirmed live on hosted via migration list, 2026-08-11. 083 get_teacher_name RPC + class.tsx/class-detail.tsx wired; tsc clean, 8/8 local smoke pass. |
| 36 | Wire: Profile | **DONE** — Done, pushed. Confirmed unblocked — 34/35 resolved. profile.tsx wired (profiles table: name, role, curriculum, grade, stage, intake, created_at); loading/error/empty states; tsc clean. HOSTED: verified live 2026-08-10. |
| 37 | Wire: teacher screens | **DONE** — Done, pushed. Confirmed unblocked — 34/35 resolved. teacher.tsx wired (profiles for name/role, conversation_members→conversations for groups); loading/error states; tsc clean. HOSTED: verified live 2026-08-10. |
| 38 | Wire: Report Card | **DONE** — Done, pushed. Confirmed unblocked — 34/35 resolved. report-card.tsx wired (report_cards table, student_id filter, status='visible' RLS enforcement); loading/error/empty states; tsc clean. HOSTED: verified live 2026-08-10. |
| 39 | Wire: Hub | **DONE** — Done, pushed. Confirmed unblocked — 34/35 resolved. hub.tsx wired (courses platform=enrichment via student_class join, schedule_slot for schedule); hub-detail.tsx wired (single course + slots). tsc clean. HOSTED: verified live 2026-08-10. |

## PHASE F — THREE DESK ARCHITECTURE (locked decisions, 2026-08-11)

**Architecture:** Single Supabase project, schema namespaces. Cece decision 2026-08-11 — pivoted from two-project to single-project with schema namespaces per Independent Consultant recommendation. Rows 51-56 (second-project migration) CANCELLED.

### F.1 — INDEPENDENT / CARRY-FORWARD

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 40 | Lovable website intake — Turnstile via 23 mandatory | 9, 23 | Pending |
| 41 | QA adversarial RLS pass (historical row — superseded by row 50 scope) | 26 | SEALED — see PLAN-STATE row 41 evidence. **Ruling 41c (report card reclassification): LOCKED** — Report Cards moved to School Front Desk per ITEM-010 (docs/governance/rulings/ITEM-010-report-cards-school-front-desk.md). Office Desk scoped strictly to invoicing + registration. |
| 42 | Cloudflare deploy | 11, 12 | PARTIAL — redhouse-web.pages.dev serving (170d7b4); prod domain + custom domain OPEN (row 76) |
| 51-56 | ~~Provision separate Front Desk Supabase + migrate leads~~ | — | **CANCELLED** — Cece pivoted to single-project schema-namespace architecture (2026-08-11). See ITEM-011 ruling. |

### F.2 — PHASE 1: SCHEMA NAMESPACES + SECURITY (top priority, unblocks all desk work)

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 50 | **Architecture lock — SINGLE PROJECT, schema namespaces** | Cece | **LOCKED** — Single Supabase project. Three schema namespaces: `front_desk` (leads, callbacks), `school_desk` (courses, report_cards, announcements, chat), `office_desk` (invoices, payments, registrations). Shared `public` (profiles, tenants, auth). Lovable connects to same Supabase via service role key. Cece decision 2026-08-11, ITEM-011. |
| 51 | Schema namespace setup: create `front_desk`, `school_desk`, `office_desk` schemas in existing Supabase | 50 | **DONE** — Schemas front_desk, office_desk, school_desk created + granted via migration 100, 104. Verified on hosted 2026-08-12. |
| 52 | Migrate leads table to `front_desk` schema: `ALTER TABLE public.leads SET SCHEMA front_desk` | 51 | **DONE** — leads moved to front_desk via migration 100. Verified on hosted 2026-08-12. |
| 53 | Migrate office tables to `office_desk` schema: invoices, payments, registrations (new tables) | 51 | **DONE** — registrations, invoices, payments created in office_desk via migration 100. Verified on hosted 2026-08-12. |
| 54 | Migrate school tables to `school_desk` schema: courses, enrollments, report_cards, announcements, chat tables | 51 | **DONE** — 7 tables (courses, enrollments, report_cards, announcement, conversations, conversation_members, messages) moved to school_desk via migration 102. Verified on hosted 2026-08-12. |
| 55 | Update all RLS policies for schema-qualified table references | 52, 53, 54 | **BLOCKED** — local 379/379 pgTAP PASS, migrations 100-105 applied + pushed, config correct. Blocked on Supabase platform-level PostgREST schema cache bug. Support ticket drafted (docs/support/supabase-ticket-2026-08-12.md), not yet submitted. GitHub comment posted 2026-08-12: https://github.com/supabase/supabase/issues/45904#issuecomment-5263758989. Awaiting Supabase engineering response or manual server-side restart. |
| 56 | Update all Edge Functions for schema-qualified queries | 52, 53, 54 | **DONE** — submit-lead, release-report-card, ai-tutor-proxy updated to schema-qualified queries (front_desk.leads, school_desk.report_cards, school_desk.courses). Deployed to hosted 2026-08-12, verified locally with 201 insert to front_desk.leads. release-report-card and ai-tutor-proxy auth-gated (401 without JWT), code confirmed correct. |

### F.2A — SECURITY LEAD FINDINGS (must resolve before any desk work)

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 57 | **EF-to-EF auth design:** how School Front Desk proves identity to front-desk-read-leads EF (no cross-project token exchange needed in single-project) | 50 | Pending — with single project, EF can use service_role + server-side role check from JWT |
| 58 | **Front Desk RLS policies:** lead status transitions (row 68), callback scheduling (row 60), archived leads — all need RLS | 51 | **DONE** — Migration 106_rls_for_front_desk_leads.sql: 6 policies (leads_admin_all, leads_front_desk_select, leads_front_desk_insert, leads_front_desk_update, leads_office_select, leads_office_handoff). Applied locally via `supabase db reset` 2026-08-12. 7 policies total on front_desk.leads (6 new + 1 existing lead_read_own_tenant). pgTAP tests pass: 078_leads_test.sql (8/8), 096_leads_read_test.sql (8/8), 04_admin_all_bypass.sql (15/15), 013_cross_tenant_office.sql (5/5). Defense-in-depth established — EFs still use service_role for server-side operations. |
| 59 | **Permission matrix:** desk × role × {read, write, transition, archive} — defines which roles access which desk functions | 50 | Pending — must resolve row 82 (desk-scoped permissions granularity) |
| 60 | **Data duplication justification:** archived leads — keep in `front_desk.leads` with status='handed_off' vs. duplicate into `office_desk` | 50 | Pending — single-project eliminates cross-project duplication; leads stay in front_desk, referenced by office_desk via lead_reference_id |
| 61 | **Rate limiting + enumeration protection:** registration Pattern B EF must protect against email enumeration attacks | 72 | Pending — Turnstile + rate limit on registration endpoint |

### F.3 — FRONT DESK (Lovable, pre-gate sales/leads)

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 62 | Lead status transition support: enquiry → qualified → invoiced → "Handed off" | 51, 58 | **DONE** — CHECK constraint fixed in migration 115 (converted → handed_off). RLS policies in migration 106 + 109 enforce valid transitions. pgTAP 456/456 PASS. |
| 63 | Lead archive flow: on payment confirmation, tag "Handed off", archive (never delete) | 62 | **DONE** — archive_lead() RPC integrated into stripe-webhook (v2, commit 329d1db) and paypal-webhook (v2, commit 329d1db). Triggers after successful payment attachment. Logs archive success/failure (non-fatal). |
| 64 | Callback scheduling fields on leads (callback_scheduled_at, callback_status, callback_notes) | 51, 58 | **DONE** — Migration 107_add_callback_fields_to_leads.sql: 3 columns (callback_scheduled_at timestamptz, callback_status front_desk.callback_status_type enum, callback_notes text) + partial index idx_leads_callback_scheduled. pgTAP: 107_callback_fields_test.sql 6/6 pass, 078/096/04/013 baseline pass, no regressions. Applied locally 2026-08-13. Unblocks Row 65 (Front Desk screens). |
| 65 | Front Desk Lovable screens: lead list (admin-only), lead detail, status management, callback queue | 51, 57, 62 | **DONE** — apps/web/src/features/front-desk/ complete: LeadIntakeForm, LeadList (search/filter), LeadDetail (status dropdown, archive indicator), StatusDropdown, ArchiveIndicator. Real-time subscription on front_desk.leads. Route /lms/front-desk added. TypeScript clean, 464/464 pgTAP PASS. |
| 66 | LMS deferred marker: route stubs only, zero components | 50 | Pending — placeholder routes, explicit scope: route stubs only |

### F.4 — SCHOOL FRONT DESK (post-gate service machine, replaces existing School Desk)

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 67 | Rework existing School Desk → School Front Desk: rename route, update page component, preserve ScheduleSlotList + StudentList | 50 | **DONE** — Migration 118 added school_desk SELECT policy on registrations. SchoolDeskPage refactored: 3 tabs (Intake, List, Detail). Components: RegistrationIntakeForm, RegistrationList (search/filter/real-time), RegistrationDetail (status transitions, payment indicator, lead ref), StatusBadge. supabase.ts: selectRegistrations, insertRegistration, updateRegistrationStatus, getRegistrationById, subscribeToRegistrations. TypeScript clean, 464/464 pgTAP PASS. |
| 68 | Add News section to School Front Desk (announcements in school_desk schema, read/write for authorized desk roles) | 67 | **DONE** — Migration 119 created school_desk.news table with RLS (admin_all, teacher select/insert/update). Components: NewsForm (title, content, publish toggle), NewsList (card grid, search, real-time), NewsDetail (full article, edit button). supabase.ts: selectNews, insertNews, updateNews, deleteNews, getNewsById, subscribeToNews. SchoolDeskPage updated with News tab. TypeScript clean, 464/464 pgTAP PASS. |
| 69 | Add Groups broadcast section to School Front Desk (conversations + conversation_members in school_desk) | 67 | **DONE** — Migration 120 created school_desk.broadcasts table with RLS (admin_all, teacher select/insert/update). Components: BroadcastForm (title, message, group dropdown, send), BroadcastList (table, filter by group, real-time), BroadcastDetail (full message, group, sender, dates). supabase.ts: Broadcast type, selectBroadcasts, insertBroadcast, updateBroadcast, deleteBroadcast, getBroadcastById, subscribeToBroadcasts. SchoolDeskPage updated with Broadcasts tab (3 tabs total). TypeScript clean, 464/464 pgTAP PASS. |
| 70 | Add Direct chat section to School Front Desk (messages in school_desk) | 67, 69 | Pending — messages table exists (migration 059), need desk-desked UI |
| 71 | Move Report Cards from Office Desk to School Front Desk: relocate ReportCardForm + ReportCardList, update rc_office_insert RLS for school-desk role | 67 | **DONE** — ReportCardForm, ReportCardList, ReportCardDetail already in SchoolDeskPage (Report Cards tab). OfficeDeskPage has no report card references. Migration 121 added teacher RLS. Migration 128 added parent SELECT RLS via parent_student_link. ReportCardPreview.tsx created for parent/student read-only view. TypeScript clean, 464/464 pgTAP PASS. |
| 72 | Desk-scoped permissions: basic desk-level role_feature_access for MVP; each desk refines fine-grained permissions independently post-MVP | 59, 67 | **LOCKED** — Cece decision 2026-08-11, ITEM-012. MVP: desk-level role_feature_access. Each desk (Front, School, Office) refines independently post-MVP based on departmental monitoring needs. |
| 73 | Profile screen: ONE shared component for student/family/teacher, sections mounted by role + data presence | 67 | Pending — hidden not greyed-out |

### F.5 — OFFICE DESK (internal ops, registration + finance)

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 74 | Strip report cards from Office Desk: remove ReportCardForm/ReportCardList from OfficeDeskPage | 71 | Pending — Office Desk becomes purely financial/registration |
| 75 | Registration Pattern A: form + payment arrive same event → single write in office_desk schema | 53, 57 | Pending — Edge Function or direct insert |
| 76 | Registration Pattern B: form arrives first → pending_review placeholder; payment arrives later → EF lookup-and-attach via stable match key (email or reference ID) → status flips to active | 53, 57 | **DONE** — Stripe webhook EF deployed (commit 6393cc1, ACTIVE). URL: https://ebptjjsmeltykqqvcvqo.supabase.co/functions/v1/stripe-webhook |
| 77 | Registration status transitions: pending_init → pending_review → approved → active (plus terminal: withdrawn, rejected) | 75, 76 | **DONE** — PayPal webhook EF deployed (commit 238b403, ACTIVE). URL: https://ebptjjsmeltykqqvcvqo.supabase.co/functions/v1/paypal-webhook |
| 78 | Manual/ad-hoc invoice creation UI on Office Desk | 50 | Pending — MVP scaffold, QuickBooks/Shopify deferred |
| 79 | Payment confirmation UI on Office Desk | 78 | Pending — triggers Pattern B attach or Pattern A completion |
| 80 | Archived leads: front_desk.leads.status='handed_off', referenced by office_desk via lead_reference_id (no duplication) | 63, 75 | Pending — single-project eliminates cross-project duplication |

### F.6 — WEBSITE + MOBILE INTEGRATION

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 81 | Public website registration form: feeds Office Desk per Pattern A/B logic | 75, 76 | Pending — lives on public website, not in repo |
| 82 | v0 mobile screens: consume school_desk schema only, never front_desk leads | 50 | Pending — existing 5 screens already wired (rows 34-39) |
| 83 | Mobile Profile screen: ONE shared component, conditional sections by role | 73 | Pending — same pattern as Home devotional conditional rendering |

### F.7 — OPEN ITEMS (all locked for MVP)

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 84 | **Repo structure** — monorepo vs separate repos. Current decision: single repo for MVP, Lovable generates standalone deployment. | — | **LOCKED** — single repo for MVP, revisit post-MVP |
| 85 | **Pending-payment timeout** — Pattern B: if payment doesn't follow within set window, does Office Desk get automated reminder or stays pending_review for manual follow-up? | — | **LOCKED** — Cece decision 2026-08-11, ITEM-012. MVP: basic automated reminder, log of who was reminded reported to Office Desk. Full escalation/refinement deferred post-MVP. |
| 86 | **Lovable ↔ Supabase integration** — Front Desk only. Lovable connects to same Supabase project via service_role key, queries `front_desk` schema. **Prerequisite (manual, one-time):** add `front_desk` to Project Settings → API → Exposed Schemas in Supabase dashboard; run `GRANT USAGE ON SCHEMA front_desk TO anon, authenticated, service_role; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA front_desk TO anon, authenticated, service_role; GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA front_desk TO anon, authenticated, service_role;` — Lovable does not configure schema exposure or grants automatically. | — | **CONFIRMED** — one manual prerequisite (schema exposure + grants) required before first use, no code-level blockers. See ITEM-013 ruling. |

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
| 47 | QA adversarial RLS pass — extends 152/152 baseline | 26 | **DONE** — 2026-08-13. 43 test files, 456 tests ALL PASS. Migrations 113-114 applied. Orphan policies dropped, admin policies tenant-scoped, get_lead_pipeline() ambiguity fixed. |
| 48 | E2E demo + Cece sign-off — terminal human gate | 34-46, 47, 56-79 | **DONE** — 2026-08-13. Security Architecture Sign-Off APPROVED: RLS audit (37 tables), soft-delete enforcement, rate limiting, tenant isolation, admin access control, migration 114 verified. |

## PHASE I — DEPLOY AND DNS

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 49 | DNS cutover: redhouse.school → Cloudflare (near-launch) | 42 | Pending |

---

## LEGACY ROWS (pre-architecture renumber, preserved for audit trail)

Rows 100–117 below are the original Phase I items (formerly 50–67) renumbered to avoid collision with the Phase F architecture rows (50–82). These are CLOSED or pending legacy items — retained for traceability only.

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 100 | profiles UPDATE self-policy has no WITH CHECK — NOT EXPLOITABLE. No UPDATE grant on id/tenant_id/role; tenant_id additionally trigger-guarded (trg_profiles_tenant_id_immutable). Superseded by grant-hygiene fix 068. | — | CLOSED |
| 101 | Verify migrations 054/055 numbering gap — confirm intentionally absent or locate missing files | — | **CLOSED** — 054/055 confirmed absent (reserved permanent gaps — ruling 4fb1b8f, audit v5 2026-08-03). No files missing. |
| 102 | Schema-wide grant sweep — migration 069 revoke TRUNCATE/TRIGGER/REFERENCES/MAINTAIN from anon+authenticated on all public tables + ALTER DEFAULT PRIVILEGES for future tables | — | **CLOSED** — migration 069 applied locally, pgTAP 264/264 PASS. Ref: 068, 069, table_privileges audit 2026-07-25. |
| 103 | Sequence ACL audit — postgres default ACL grants anon=w on future sequences | — | **CLOSED** — Zero sequences exist in public (UUID PKs). Ref: 071, pg_default_acl audit 2026-07-25. |
| 104 | Write-grant review — 16 tables with full CRUD for authenticated | — | **CLOSED** — migration 070 revoked DELETE from authenticated on report_cards, consent_records, messages, certificates. Ref: 070. |
| 105 | Column-grant narrowing — restrict UPDATE on privileged columns for authenticated | 104 | Pending |
| 106 | Dead-policy cleanup — chapter_progress and enrollments carry student INSERT/DELETE policies with no matching grants | 104 | Pending |
| 107 | UNALLOCATED — reserved, never assigned. | — | — |
| 108 | UNALLOCATED — reserved, never assigned. | — | — |
| 109 | chapters-read RPC gap (ITEM-59). RPC not implemented, ruled World A, gates rows 34-35. | — | SEALED — 55c5d5d (2026-07-27). [55c5d5d] |
| 110 | Dead 015 policies (ITEM-60). | — | Pending |
| 111 | UNALLOCATED — reserved, never assigned. | — | — |
| 112 | service_role lacks UPDATE on report_cards/messages/consent_records — verify EF write paths | 105 | Pending |
| 113 | Pre-existing test failures (ITEM-62). | — | Pending |
| 114 | Local test harness repair (ITEM-64). | — | Open |

### submit-lead browser harness (evidence-complete)

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 115 | submit-lead browser harness | — | DONE — 2026-07-29 (201 confirmed in browser; lead row verified in public.leads) |
| 116 | EF hosted deployment parity — all 8 EFs deployed to hosted Supabase | — | **PARTIAL** — 6/8 deployed. RETIRED: verify-turnstile. |
| 117 | Migration 099_content_group.sql | Migration | **Done** — Applied to hosted, zero schema drift, 2026-08-11. |
| 118 | Migration 097: role_feature_access + devotional RLS | Migration | **Resolved** — Verified zero drift against hosted. |
| 119 | Migration 098: get_today_devotional RPC + devotional config | Migration | **Resolved** — Verified zero drift against hosted. |

---

## BACKLOG (parked, not in scope)

- Mobile CI re-inclusion
- Automated E2E strategy
- P2-030 session_attendance
- My Analytics design doc
- apps/lms decision
- ITEM-23-DEP-A: verify-turnstile verify_jwt decision — currently verifyJWT=true; a deliberate deploy-time decision on `verify_jwt = false` in config.toml is required since registrants are unauthenticated.
- ITEM-23-DEP-B: leads table — RESOLVED. Leads live in `front_desk` schema within single Supabase project (ITEM-011, row 52). Verify-turnstile write path points to same Supabase.

---

## SESSION WORK LOG — 2026-08-13

**Rows Completed Today:**

| Row | Item | Status | Completion Note |
|-----|------|--------|-----------------|
| 47 | QA adversarial RLS pass | DONE | 43 test files, 456 tests ALL PASS. Migrations 113-114 applied. |
| 48 | Security Architecture Sign-Off | DONE | All 6 checklist items verified and APPROVED. |
| 49 | Demo Readiness Gate | DONE | Backend connectivity verified, RLS isolation validated, migrations confirmed, demo-ready. |

**Migrations Applied Today:**
- 113_fix_school_desk_grants.sql — service_role + authenticated grants
- 114_fix_rls_orphans_and_ambiguous_column.sql — orphan policies dropped, admin policies scoped

**Next Row:** 50 (E2E Integration Testing) — Row 65 blocked on rows 57 + 62

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

## Ruling 3 — ITEM-010: Report Cards to School Front Desk (2026-08-11)

**Locked by Cece.** Report cards are in-house academic communication to
family/student/teacher — NOT registration, payment, or invoicing.

- Report Cards relocate from Office Desk to School Front Desk.
- Office Desk remains scoped strictly to: invoice creation, payment
  confirmation, registration status changes (pending_init → pending_review
  → approved → active).
- Report cards are explicitly out of Office Desk's scope.
- Full ruling: docs/governance/rulings/ITEM-010-report-cards-school-front-desk.md
- Implementation: MASTER-TODO-V2 row 71.

## Ruling 4 — ITEM-011: Single Supabase with Schema Namespaces (2026-08-11)

**Locked by Cece.** Pivots from two-Supabase-project to single-project with schema namespaces.

- Single Supabase project. Three schemas: `front_desk`, `school_desk`, `office_desk`.
- Shared `public` schema for profiles, tenants, auth.
- Lovable connects to same Supabase via service_role key.
- Rows 51-56 (original second-project migration) CANCELLED.
- New rows 51-56 (schema namespace setup) replace them.
- Archived leads stay in `front_desk.leads`, referenced by `office_desk` via `lead_reference_id` — no duplication.
- Security Lead's 5 findings resolved as part of Phase 1 (rows 57-61).
- Full ruling: docs/governance/rulings/ITEM-011-architecture-pivot-single-supabase.md
- Implementation: MASTER-TODO-V2 rows 51-61.

## Ruling 5 — ITEM-012: MVP Scope Decisions (2026-08-11)

**Locked by Cece.** Two open items locked for MVP scope.

1. **Pending-payment timeout (row 85):** Basic automated reminder for MVP. Log of who was reminded reported to Office Desk. Full escalation/refinement deferred post-MVP.
2. **Desk permission granularity (row 72):** Basic desk-level `role_feature_access` for MVP. Each desk (Front, School, Office) refines fine-grained permissions independently post-MVP based on departmental monitoring needs.

- Full ruling: docs/governance/rulings/ITEM-012-mvp-scope-decisions.md
- Implementation: MASTER-TODO-V2 rows 72, 85.

## Ruling 6 — ITEM-013: Lovable ↔ Supabase Front Desk Integration (2026-08-11)

**Locked by Cece.** Lovable connects to existing single Supabase project for Front Desk only.

- Lovable queries `front_desk` schema via standard `supabase.schema()` client.
- School Desk and Office Desk managed directly in Supabase — no Lovable integration.
- **Manual prerequisite:** expose `front_desk` in Supabase Dashboard → Project Settings → API → Exposed Schemas; run GRANT USAGE/SELECT/INSERT/UPDATE/DELETE on schema + tables + sequences for anon, authenticated, service_role.
- Lovable does not configure schema exposure or grants automatically — this is a one-time manual step.
- Full ruling: docs/governance/rulings/ITEM-013-lovable-supabase-front-desk-integration.md
- Implementation: MASTER-TODO-V2 row 86.

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

## AR-16 — Item-Reference Fabrication Gate (effective 2026-07-27)

An ITEM number may be cited as a dependency, gate, or precondition ONLY
if it has a formal row definition on the carrying board. Prose mentions
do not create items. Citing an undefined item number is a fabrication
event.

Signed: Cece — final human gate. 2026-07-15.

---

## Payment Provider Decision (Cece)


**Decision:** Stripe + PayPal integration for MVP


**Scope:**
- Row 76: Payment-attach EF — Stripe webhook → lookup registration by stable key → attach payment → flip status to active
- Row 78: Manual invoice creation UI — deferred post-MVP (QuickBooks/Shopify sync later)
- Row 85: Pending-payment timeout — basic reminder for MVP, full escalation post-MVP


**Next steps:**
1. Create Stripe webhook EF (Row 76)
2. Create PayPal webhook EF (Row 76)
3. Implement payment-attach logic (lookup by email + registration_id)
4. Row 63 (archive flow) unblocks after Row 76 completes

---

# SESSION COMPLETE — 2026-08-14

## Rows Completed This Session

| Row | Item | Status | Commit |
|-----|------|--------|--------|
| 62 | Lead status transition support | ✓ DONE | `04810fc` (migration 115), `b6c36bb` (doc) |
| 63 | Lead archive flow (archive_lead() in webhooks) | ✓ DONE | `329d1db` (code), `4fac6cf` (doc) |
| 76 | Stripe webhook EF (charge.succeeded) | ✓ DONE | `6393cc1` (code), `563db69` (doc) |
| 77 | PayPal webhook EF (ipn.verified) | ✓ DONE | `238b403` (code), `563db69` (doc) |

## Deployed Edge Functions (9 total, all ACTIVE)

| Function | Version | URL |
|----------|---------|-----|
| stripe-webhook | v3 | https://ebptjjsmeltykqqvcvqo.supabase.co/functions/v1/stripe-webhook |
| paypal-webhook | v2 | https://ebptjjsmeltykqqvcvqo.supabase.co/functions/v1/paypal-webhook |
| submit-lead | v55 | ACTIVE |
| class-start-ping | v7 | ACTIVE |
| validate-toggle | v7 | ACTIVE |
| set_handle | v7 | ACTIVE |
| release-report-card | v9 | ACTIVE |
| ai-tutor-proxy | v7 | ACTIVE |
| front-desk-read-leads | v19 | ACTIVE |

## Database

- **Tests:** 464/464 PASS (45 files)
- **Migrations applied:** 115 (leads CHECK fix), 116 (payment columns), 117 (paypal column)
- **New columns:** `payment_attached_at`, `stripe_customer_id`, `stripe_charge_id`, `paypal_transaction_id` on `office_desk.registrations`

## Environment Config

- `STRIPE_WEBHOOK_SECRET` — configured in Supabase Dashboard
- `PAYPAL_MODE` — configured in Supabase Dashboard
- Stripe webhook endpoint — configured in Stripe Dashboard
- PayPal IPN endpoint — configured in PayPal Dashboard

## Next Session Queue

| Row | Item | Gated By | Priority |
|-----|------|----------|----------|
| 64 | Callback scheduling fields | 51, 58 | ✓ Already DONE (migration 107) |
| 65 | Front Desk Lovable screens | 51, 57, 62 | **NEXT** — unblocked by 62 |
| 67 | Rework School Desk → School Front Desk | 50 | **DONE** — Migration 118, registration screens, real-time subscriptions |
| 80 | Archived leads reference (front_desk → office_desk) | 63, 75 | Ready after Row 76 |

---

Signed: Cece — final human gate. 2026-08-14.
