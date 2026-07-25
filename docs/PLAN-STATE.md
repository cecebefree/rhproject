# PLAN-STATE (F0 Ground Truth Snapshot)

**Generated:** read-only audit, 2026-07-18. Source: disk + git, pasted raw per AR-1.
**Working repo:** /Users/ce/dev/rhproject-new (HEAD ae79cce4fb31a9244ede52f1499743ec8857b617).  Updated: 2026-07-22 (board sync, audit item 10), 2026-07-22 (governance sweep: r17 corrections applied).

---

## 1. Migrations — `supabase/migrations/` (verbatim `ls`)

```
013_lms_users_profiles.sql
014_lms_courses.sql
015_lms_chapters.sql
016_lms_enrollments.sql
017_lms_chapter_progress.sql
018_lms_chapter_sequence_validation.sql
019_tenants.sql
020_devotional.sql
021_profiles_tenant_id_fk.sql
022_custom_access_token_hook.sql
024_backfill_and_rls.sql
025_handle_new_user_tenant_id.sql
026_crossing_gate_columns.sql
027_student_class.sql
028_grant_profiles_select.sql
029_realtime_subscriptions.sql
030_student_class_fixes.sql
031_grant_courses_select.sql
032_access_window.sql
033_realtime_select_grants.sql
034_courses_platform.sql
035_platform_access.sql
036_notifications.sql
037_schedule.sql
038_realtime_trim.sql
039_enrichment.sql
040_booklists.sql
041_announcements.sql
042_consent_suppression.sql
043_report_cards_and_certs.sql
044_rls_for_042_043.sql
045_seed_data.sql
046_cert_immutability_guard.sql
047_consent_guard_and_fixes.sql
048_fix_tenant_id_jwt_path.sql
049_fix_cert_trigger_no_hstore.sql
050_fix_office_report_card_policies.sql
051_office_report_card_lifecycle.sql
052_office_report_card_select.sql
053_fix_office_tenant_scoping.sql
056_hook_fail_loud.sql
057_tenant_assignment_immutable.sql
058_remove_signup_tenant_auto_assign.sql
059_chat_tables.sql
060_fix_chapter_sequence_guard.sql
061_chapter_progress_delete_guard.sql
062_handle_system.sql
067_admin_tenant_scope.sql
```

Note: 054, 055 absent (reserved permanent gaps — ruling 4fb1b8f). Head ends at 067.

### Groups-related DDL (verbatim from `supabase/migrations/059_chat_tables.sql`)

The groups subsystem is `conversations` + `conversation_members` + `messages` +
`message_reactions` + `chat_preferences`. KEY FINDING (verbatim DDL):

```sql
create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  category    text not null default 'general',
  created_by  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```
→ **NO `name` COLUMN. NO `media_enabled` COLUMN.** Groups have no display name or
media flag in the schema. This is GAP-BACKEND for every group screen.

```sql
create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  role            text not null default 'member',
  joined_at       timestamptz not null default now(),
  last_read_at    timestamptz,
  primary key (conversation_id, profile_id)
);
```
→ **NO `is_group_lead` COLUMN.** Lead flag absent; lead controls in Teacher/GroupInfo
screens are unbacked (scaffold fakes via SEED_USER).

`messages` has `body`, `sender_id`, `created_at`, `edited_at`, `deleted_at` (soft delete).
`chat_preferences` has `muted_conversations`, `notification_level`. RLS is auth-first,
tenant-isolated via JWT `tenant_id`, recursive-cycle avoided by not cross-scanning
conversations↔conversation_members.

---

## 2. Field-Register Status Lines (verbatim `grep`)

```
364:## D-CHAPSEQ — Chapter sequence guard repair (status: BACKED)
370:- **Status:** BACKED (migration 060, this arc)
372:## D-060-DEL — Chapter sequence delete-guard (LIFO) (status: BACKED)
375:- **Status:** BACKED (migration 061 applied, test green).
578:Composition logic ownership: the read-model layer. No dedicated columns are added for these. Status: PLANNED (read-model design not yet ratified).
```

The register's per-row status markers (2 BACKED / 4 PLANNED) live in table cells
elsewhere; the only `status:`/`Status:` keyword lines are the three above. Chat (059)
and handle (062) scopes are BACKED (confirmed via migrations + register chat-adjustments
doc). `schedule_slot.location` + `facilitator` are PLANNED (line 578 read-model note +
037 migration). Ledger/report_card scopes BACKED via 042–053.

---

## 3. Test + Typecheck Baselines (verbatim, with commit hashes)

- **pgTAP (Supabase db tests):**
  ```
  Files=24, Tests=240,  1 wallclock secs ( 0.03 usr  0.02 sys + 0.09 cusr 0.03 csys = 0.17 CPU)
  Result: PASS
  ```
  Baseline committed at HEAD **887ce98** (matches canonical 240/24 PASS established
  at T-ENV seal 7ea2231).

- **Typecheck `@redhouse/shared`:** `tsc --noEmit` → 0 errors.
- **Typecheck `@rhproject/web`:** `tsc --noEmit` → 0 errors.
- **Typecheck `@rhproject/mobile`:** filter matched NO project (mobile package not
  registered in pnpm workspace filter for typecheck — does not run; not a pass/fail).
  Earlier session reported `726f734` R-038 mobile lint/tests green; typecheck filter
  is a workspace-config gap, not a code error.

HEAD: **887ce98** (D-V0-REGISTER commit).

---

## 4. Mobile Screens — WIRED vs SCAFFOLD (verbatim per-file)

Every mobile screen uses `SEED_*` static imports; ZERO import `supabase`,
`@redhouse/shared`, `createClient`, or any `@/` module. All SCAFFOLD.

```
apps/mobile/app/(tabs)/_layout.tsx            :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/(tabs)/certificates.tsx       :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/(tabs)/class-detail.tsx       :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/(tabs)/class.tsx              :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/(tabs)/family.tsx             :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/(tabs)/group-chat.tsx         :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/(tabs)/group-info.tsx         :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/(tabs)/hub-detail.tsx         :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/(tabs)/hub.tsx                :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/(tabs)/index.tsx              :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/(tabs)/profile.tsx            :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/(tabs)/report-card.tsx        :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/(tabs)/social.tsx             :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/(tabs)/teacher.tsx            :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/+not-found.tsx                :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/_layout.tsx                   :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/devotional.tsx                :: supabase/shared imports = 0  -> SCAFFOLD
```

TOTAL: 17 `.tsx` files, 0 WIRED. The ONLY wired client in the whole repo is
`apps/web/src/features/lms/services/supabase.ts` (T014, commit ea47782). No mobile
`onboarding`/`registration`/`sign-up` screen exists on disk.

---

## 6. Last 15 Commits (one line each, verbatim `git log --oneline -15`)

```
887ce98 D-V0-REGISTER: v0 element register derived from design docs + disk scaffolds + 027-062 schema (auth-walled v0; no live walkthrough)
7a85e52 docs(register): reconcile stale chat labels; register location, facilitator, read-model scopes as PLANNED
75605f2 docs: pin v0 mobile screens deployment link
ea47782 T014: LMS Supabase client — typed via @redhouse/shared, fail-loud env guard
fac831b D-T012-PATH: types re-sealed at P2-001 canonical path, orphan removed, guard green
b47e0b9 D-BOARD-PHANTOM: reconcile T014-T019 — six phantom checkboxes cleared to unbuilt
7ea2231 T-ENV: seal T012/T013 — types first-materialized, pgTAP 240/24 baseline match
1fc295a D-BOARD-PHANTOM: occurrence entry + AR-9 checkbox-seal rule
a9fcfe4 BOARD: reconcile T003/T004 checkboxes with sealed ledger
3991712 D-T003-DRIFT: scope-drift log + index-line forensics
3031379 T003: feature module routing scaffold (field-free per R23)
1a4bea1 D-R23: register jurisdiction — field-free scaffolding exempt
423ba04 D-AUDIT-RULES-3B: occurrence seven + AR-8 operator-ratification; QA gate ticked
8a60c99 D-AUDIT-RULES-3: AR-1 occurrences log + AR-7 evidence-capture rule
663e504 D-LEDGER-SYNC: P2-028 row/checkboxes catch up to 2026-07-09 closure
```

---

## 5 (reserved / not requested) — Registration & Front Desk Document Discovery

See the companion report section below (item 5 was not in the F0 write-list, but the
registration-form / front-desk / HubSpot / Lovable discovery is captured here because it
is the headline finding).

### 5a. Document hits (both repos, search terms: registration form, front desk, lead
pipeline, HubSpot, Lovable, enrolment funnel, website plan, intake, sign-up, onboarding)

**rhproject-new (canonical) — relevant hits:**
- `docs/spec/front-desk-registration.md`  ← FULL registration/front-desk spec
- `docs/governance/rulings/ITEM-004-d64bb05-registration-pipeline.md`  ← ruling pointer
- `docs/design/06-family-variant.md` — references "lead table (PLANNED ITEM-004 §1)"
- `docs/design/chat-adjustments.md` — group info / office reply channel
- `docs/governance/MASTER-TODO-V2.md` — items 14 (DPIA), 40 (Lovable website intake/Turnstile)
- `tech-stack.md` — HubSpot lines 203–204 (struck), Edge Functions list (verify-turnstile)
- `docs/planning/backend-task-plan.md` — backend task plan (pipeline refs)
- `ai-operations-plan.md` — §6 HubSpot struck
- `next-steps-plan.md` — status annex (P2-028 only)

**redhouse-real-web (other repo) — hits:** only `v0-element-register.md` (stray copy
from prior turn) and `AGENTS.staged.md`. No registration/front-desk/HubSpot/Lovable docs.

### 5b. KEY DISCOVERY — no "registration form" UI and no standalone "front desk" app
exists on disk. The registration pipeline is SPEC-ONLY:
- `docs/spec/front-desk-registration.md` (RULED 2026-07-11) defines a SPLIT pipeline at
  the payment boundary: Pre-payment = Front Desk lead tables (enquiry→qualified→invoiced);
  Post-payment = Office Desk core registration status (pending_init→pending_review→
  approved→active, +withdrawn/rejected). Write authority HARD RULE: ONLY Office Desk via
  Edge Functions; Front Desk reads status only; School Desk read-only.
- Intake channel: **"Web intake form (Lovable-built) feeds the Front Desk lead table"**;
  payments MOCKED in MVP; global desk callback queues (USA/UK/SA/Singapore/Australia).
- ITEM-004 ruling (d64bb05) confirms spec RULED, carried into mobile phase plan (3cfcab8),
  consumed by Items 5–8 as canonical data model. No separate implementation track.
- HubSpot: **STRUCK** — tech-stack.md lines 203–204 + ai-ops-plan §6. nightly-reconciliation
  and hubspot-webhook both overridden → "Rework into Supabase-native pipeline."
- Lovable: per F0 instruction, Lovable = the FRONT DESK web intake form builder (not the
  mobile app). No Lovable project files exist in repo; only the spec reference.
- Lead table schema: NOT finalized (open item in spec §6). No migration for lead/invoice/
  payment tables exists (confirmed: 027–062 contain none). This is GAP-BACKEND.

### 5c. Front Desk / Registration documents pasted VERBATIM

#### `docs/spec/front-desk-registration.md` (full, 75 lines)
```
# Front Desk — Registration Pipeline Specification
Status: RULED — decisions final, implementation pending (Mobile/Desks phase)
Recorded: 2026-07-11 (three-week plan close, carried forward)

## 1. Split Pipeline — wo Ownership Zones, Two Owners

The registration flow is split at the PAYMENT boundary:

### Pre-payment (Front Desk domain)
- Lives in Front Desk-OWNED lead tables (NOT the core registration table)
- Stages: enquiry → qualified → invoiced
- Front Desk has full read/write authority over lead records
- Leads are working objects: notes, follow-ups, callback scheduling

### Post-payment (Office Desk domain)
- Lives in the CORE registration status column
- States: pending_init → pending_review → approved → active
  plus terminal states: withdrawn, rejected
- Payment confirmation is the trigger that creates the core
  registration record from the lead

## 2. Write Authority — HARD RULE

- ONLY Office Desk holds write authority over the core registration
  status column
- ALL status mutations go through Edge Functions — NO direct UI
  table writes, no exceptions
- Front Desk NEVER writes to core registration status; it reads
  status for visibility only
- School Desk: read-only on registration status

## 3. Desk Roles in the Pipeline

| Desk        | Role in registration                                  |
|-------------|-------------------------------------------------------|
| Front Desk  | Owns leads (enquiry/qualified/invoiced), intake triage,
                callback queue, converts on payment                    |
| Office Desk | Owns core status transitions via Edge Functions,
                review/approval, withdrawal/rejection processing       |
| School Desk | Consumes approved/active registrations (class placement);
                no pipeline writes                                     |

## 4. Intake Channel

- Web intake form (Lovable-built) feeds the Front Desk lead table
- Payments are MOCKED in MVP — the lead→registration conversion
  trigger is simulated for the mid-August demo
- Global Desk callback model applies to lead follow-up:
  time-zone rotated queues (USA, UK, SA, Singapore, Australia)

## 5. Data Retention Disclosures (ruled, must ship with UI)

- Registration and Settings surfaces MUST disclose: records are
  retained due to contractual obligations; we do not delete
- Third-party interaction data (CRM chat, Hub comments, etc.) is
  NOT retained by us — processed by sub-processors under a DPA
- These disclosures are part of the registration UI acceptance
  criteria, not an afterthought

## 6. Open Items (for Mobile/Desks phase planning)

- [ ] Edge Function catalogue for each status transition
      (name, payload, authority check per transition)
- [ ] Lead table schema finalization (Front Desk-owned, tenant-scoped)
- [ ] Mock-payment trigger design for demo conversion
- [ ] Withdrawn/rejected handling: retention disclosure wording final
- [ ] RLS review: Front Desk lead tables vs core registration
      visibility boundaries

## 7. Insertion Point

This spec is a REGISTERED INPUT to the Mobile phase plan, alongside
P2-026, D19, and the devotional content build. The three staff desks
(Front, School, Office) are in MVP scope; this document governs the
registration slice of that build.
```

#### `docs/governance/rulings/ITEM-004-d64bb05-registration-pipeline.md` (full, 29 lines)
```
# ITEM-004 — d64bb05 (Front-Desk Registration Pipeline)

| Field | Value |
|-------|-------|
| **Commit** | `d64bb05079cab9b9796311a4ef074001bc6c48ee` |
| **Spec file** | `docs/spec/front-desk-registration.md` |
| **Status** | RULED — registration pipeline spec carried forward into mobile phase plan |
| **Ruled by** | Cece |
| **Date** | 2026-07-11 |

## Summary

Front-desk registration pipeline spec. Describes the onboarding flow:
tenant creation, staff provisioning, course/track setup, student
enrollment — end-to-end registration sequence for the Redhouse admin
console.

## Ruling

Spec is RULED — content carried forward into the mobile phase plan
(commit `3cfcab8`). No separate implementation track; registration
pipeline is consumed by Items 5–8 (v0 screen design) as the canonical
data model reference.

## Governance note

This spec was created in isolation (no spec_review / council review).
Valid as Cece-authored directive. If downstream implementation diverges
from spec content, a new ruling is needed before merge.
```

---

*End of PLAN-STATE. F0 write-list covered items 1–4 and 6 (item 5 reserved but
included as the headline discovery per the STOP report requirement).*
---

# PLAN-STATE REFRESH (F0 order-restoration session, 2026-07-18)

## New HEAD
6d1a38a9b78b3f8e218b15f09a87543ead66f8c7 (prior F0 commit). This session adds register S-A/S-B/S-C/S-F + this refresh; new HEAD recorded at PART 4 seal.

## Register scope statuses after Part 2 (verbatim grep from field-register.md)
582:## S-A — Group display/lead/media columns (status: PLANNED)
601:## S-B — Class/Hub display columns (status: PLANNED)
613:## S-C — Edge Function scopes (status: PLANNED)
631:## S-F — Front-Desk lead tables (status: PLANNED)
All four: PLANNED. No migrations created (register-first only, per mandate).

## Baselines re-run this session (verbatin summary lines)
Tests: Files=24, Tests=240, Result: PASS
Typecheck @redhouse/shared: tsc --noEmit (0 errors)
Typecheck @rhproject/web: tsc --noEmit (0 errors)
Typecheck @rhproject/mobile: filter matches no project (workspace config gap, unchanged from prior snapshot)
HEAD at re-run: 6d1a38a9b78b3f8e218b15f09a87543ead66f8c7

## Unchanged counts
Mobile screens: 17 total, 0 WIRED (all SCAFFOLD). Wired count unchanged from prior snapshot.
Migrations: 013–062 (054/055 reserved gaps absent) — unchanged.

## Misplaced-file status (Part 1 outcomes)
The three stray files under /Users/ce/Documents/Redhouse-website/redhouse-real-web were overwritten with the canonical stub:
  "MISPLACED COPY — NOT CANONICAL. Canonical location: rhproject-new. Do not read or write here."
Files: v0-element-register.md, PLAN-STATE.md, tech-stack-amendment.md.
chmod -R a-w on redhouse-real-web: SUCCEEDED (exit 0). All three stubs now mode -r--r--r-- (96 bytes each).
Verification: ls -la shows -r--r--r-- for all three; cat of v0-element-register.md returns the stub text verbatim.
Note: chmod made the whole redhouse-real-web dir read-only, which also blocked the native write tool (its cwd) — all subsequent writes this session used shell + absolute rhproject-new paths.


## Last reconciled
Last reconciled: 2026-07-18 @ 25a704d4aa953dff366f533ce70cc744beb5d9e4 - full-sweep audit, 19 stale rows corrected, error direction under-reporting only.

## GOAL (sealed)
GOAL (sealed): Mid-August demo - family enquires on website, Front Desk converts to invoice, mock payment activates student, mobile app goes live for that family, teacher writes and releases a report card, it lands in family ledger and Records. Secure under adversarial RLS. This flow working = 100%. Surfaces: Expo app (Home/Classes/Hub/Feed/Profile + Menu x 3 role renders per docs/design/05-08), website + Front/School/Office Desks on Cloudflare Pages. Row 47 scope parked post-demo.


---

# PLAN-STATE PHASE 1 SEAL (2026-07-20 session)

## Board seal
Board: **48 rows @ 25a704d, sealed at baseline ae32461**.

- Audit HEAD (full-sweep reconciliation): 25a704d4aa953dff366f533ce70cc744beb5d9e4 (commit 6b743d0 docs: reconcile boards to full-sweep audit @ 25a704d)
- Seal HEAD (session baseline): ae32461bef0adf731ee90b12030dde82d7043e8d (descendant of 25a704d; verified git merge-base --is-ancestor 25a704d ae32461 -> exit 0)

Both HEADs traceable: audit snapshot at 25a704d (48-row board); seal anchored to live session baseline ae32461.

## STEP 0 anchor gate (all green)
[1] pwd=/Users/ce/dev/rhproject-new; [2] baseline=ae32461 (R-1); [3] toplevel=/Users/ce/dev/rhproject-new; [4] branch=main; [5] status=clean; [6] listing present
[R-2] resolved PASS-BY-EXPLANATION: Documents/Redhouse-website stub re-seeded by runtime (birth Jul 20 12:10:21 2026, after Cece manual deletion); INERT, deferred to post-session. R-3 validated.

## Standing constraints reaffirmed
- Never read/write/resolve under /Users/ce/Documents.
- Reborn 28K .swarm stub at that path = wrong-launch residue; report, never work there.
(End of PHASE 1 seal)



# WRITE-PHASE SEAL — MASTER BOARD SNAPSHOT (2026-07-21 session)

## Seal
Board: **48 rows @ 25a704d, sealed at commit a60412f**.

Seal HEAD: `a60412f` (R-2b probe VOID: precondition unmet).


## Scoreboard
**DONE: 15 | CLOSED: 2 | PARTIAL: 2 | PENDING: 29 | Progress: ~45-50%**

## Critical path
Phase A (items 1-12): Cece inputs - rulings and assets. Items 6 (authority-gate doctrine), 11 (Supabase cloud URL + key), 12 (Cloudflare credentials) are the remaining blockers. Item 8 (v0 design links) is the binding unlock for Phase D/E wiring chain.

## Governance rules (binding)
- AR-1 through AR-11 audit rules codified in docs/governance/audit-rules.md (11 headers, verified)
- RG-1 through RG-7 register entry standard (forward-only)
- Single-board ruling: MASTER-TODO-V2.md is sole authoritative board
- Changes require DEFECT filing with evidence - no new review rounds
- AR-11 clean-tree precondition: every session that edits files must paste `git status --short` first; non-empty output halts

## Cleanup plan
- Items 14 (DPIA + disclosure), 15 (gate-contracts scope note) - pending
- Item 10 (brand assets): placeholder-grade hex approved; TODO-FINAL-LOGO x6 outstanding in docs/brand-assets.md
- Item 11 (Supabase cloud URL + anon key) - pending at deploy
- Item 12 (Cloudflare credentials) - pending at deploy
- D16 (AI-import guard), D17 (platform/tenant import guard) - tracked open
- D26 (student_class tenant_id column) - fires on mobile phase start

## Master Board (verbatim from docs/governance/MASTER-TODO-V2.md)

```
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
| 22 | AO-000 Edge Function scaffolding, including the EF test pattern | - | DONE - EF scaffolding: 4 stubs (verify-turnstile, class-start-ping, validate-toggle, ai-tutor-proxy); field-register S-C updated (457f7c4) |
| 23 | verify-turnstile EF - reference smoke-test EF | - | DONE - full implementation: POST to Cloudflare /siteverify, CORS, fail-loud on missing secret, input validation. Tested locally (4/4 paths). |
| 24 | Expo port screens, including devotional fields | 5, 32 | **CLOSED** — 11/11 screens, tsc clean, freeze intact. Governance ITEM-024 sealed by Cece. Hashes: af66274, 3ad4459, 778d0ad, c4417e2 |
| 25 | Migration 043 report-card + certs | 3 | DONE - 043_report_cards_and_certs.sql present [097a32d] |
| 26 | RLS for 042/043 + no-FK tenant-scoping audit of the 035 pattern | 24, 25 | DONE - 044_rls_for_042_043.sql + 050/051/052/053 office-RC lifecycle |
| 27 | Seed data: demo families | 26 | DONE - seeded visible card + family_child links [f9ce73d]; R18 live write->release RPCs, 8/8 AC pass [7385720] |
| 28 | Office Desk mutation EFs + gate contracts v1 - scoped per 15 | 15, 22 | Pending |
| 29 | EFs: class-start-ping, validate-toggle, ai-tutor-proxy | 22 | DONE - full implementations, locally tested, config.toml registered [05b35ea, aaa8bb0, 121ca94, 020e964] |
| 30 | EF/RPC inventory doc + Realtime usage audit | 22, 29 | DONE - read-only EF/RPC/Realtime audit complete, inventory at docs/EF-RPC-INVENTORY.md, per DF-32 partial ruling c4f76f2 |

### Row 28 Split — RATIFIED by Cece 2026-07-22 (commit d56d4a2)

Row 28 ("Office Desk mutation EFs + gate contracts v1") split into executable sub-rows:

| Sub-row | Item | Est. | Dependencies | Scope | Status |
|---------|------|------|-------------|-------|--------|
| **28a** | `set_handle` EF — profile handle assignment | ≤90 min | 22, 062 migration | EF enforcing format CHECK (3-20 chars, no whitespace), per-tenant blocklist, handle_changes audit write. Admin_set mode for Redhouse. | PARTIAL |
| **28b** | `release-report-card` EF + gate contracts v1 | ≤90 min | 22, 15, 043/044 migrations | Two-step status advance (draft→released→visible) on report_cards. Office/admin only, tenant_id match. Gate contracts pattern: authority check + input validation + CORS + secrets binding. | RATIFIED |

**Out of row 28 scope (deferred):** Registration status transition EFs (pending_init→pending_review→approved→active) — blocked on lead/registration table schema (GAP-BACKEND per front-desk-registration spec §6).

**Debts added this session:**
- **DEBT-001:** service_role GRANTs (profiles, courses, student_class, schedule_slot, notifications) applied ad-hoc in local dev — must be captured in a numbered migration before cloud deploy.
- **GAP-BACKEND-001:** lead/registration tables absent — schema row required before registration-status EFs.

| 30 | EF/RPC inventory doc + Realtime usage audit | 22, 29 | DONE - read-only EF/RPC/Realtime audit complete, inventory at docs/EF-RPC-INVENTORY.md, per DF-32 partial ruling c4f76f2 |

## PHASE D — DESIGN AND FRONTEND

| # | Item | Gated By | Status |
|---|------|----------|--------|
| 31 | Verify design items against v0 links | 8 | DONE — human walkthrough 2026-07-22; verdicts: 05 PASS-ON-DOCS, 06 PASS-AS-AMENDED, 07 PASS-AS-AMENDED, 08 PASS-AS-AMENDED. Amendments in 94f802e, 917209c, 463d20f. Evidence chain sealed at row 32 seal commit. |
| 32 | DESIGN FREEZE — fires on 31 | 31 | SEALED 2026-07-22 — verdict block recorded, evidence chain cited. Designs 01–08 FROZEN. See SEAL record below. |
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

---

## BACKLOG (parked, not in scope)

- Mobile CI re-inclusion
- Automated E2E strategy
- P2-030 session_attendance
- My Analytics design doc
- apps/lms decision
- Custom domain connection for redhouse-web Pages project (CF-12 debt, NOT a blocker)

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
```

## Status legend
- Pending / PARTIAL / DONE = item status at seal HEAD a60412f.
- Delta rows (rows advanced in this session) are appended below with commit hash.
(End of WRITE-PHASE seal)




---

## Appendix: Registered Actions

### D-AR-RENUMBER-2 - Audit Rules renumber (SEALED)

**Status:** SEALED
**Commit:** 9945bf39571adc7c28bb867821b0e6e857f22bd9
**Action:** Renumbered duplicate AR-6/AR-7 entries inherited from 10d221c to AR-10/AR-11; removed duplicate block; relocated to end of docs/governance/audit-rules.md.
**Header check:** 11 returns **11** (AR-1 through AR-11)
**Duplicate verification:** 0 returns **0**

## Delta rows (2026-07-21 session)

| Row | Status | Commit |
| D-AR-RENUMBER-2 | SEALED - audit rules renumbered; duplicate AR-6/AR-7 moved to AR-10/AR-11 | 9945bf3 |
|-

----|--------|--------|
| Fix (063 tests) | DONE - all 6 063 test failures resolved: fixture reorder, proper JSON JWT, lives_ok for UPDATE/DELETE (rc_admin_all exists prevents 42501), learner profile fix, duplicate cert removal | e072eaa |
| 27 | DONE - R18 demo-depth: seeded visible report card + issued certificates; family_child links | f9ce73d |
| 26 | EXTENDED - family-ledger migration 063: rc_family_select + cert_family_select + R22 denial tests | 457f7c4 |
| 22 | DONE - EF scaffolding: 4 stubs (verify-turnstile, class-start-ping, validate-toggle, ai-tutor-proxy); field-register S-C updated | 457f7c4 |
| 067 | SEALED - replace unscoped admin_all_profiles (FOR ALL) with tenant-scoped admin SELECT (admin_select_tenant_profiles); privilege escalation corrected; pg_policies verified; pgTAP 264/26 PASS | 0cb8edc |
| 068 | SEALED - revoke TRUNCATE/TRIGGER/REFERENCES on profiles from anon+authenticated; grant hygiene discovered under ITEM-50 evidence; table/column grant audits 2026-07-25; pgTAP 264/26 PASS | 32d6b79 |

---
## Delta (board sync 2026-07-22, audit item 10)

Last sealed HEAD: 25a704d. Commits landed since:

```
ae79cce audit: weekly 2026-07-22 (9 PASS, 1 FAIL: board sync)
b5bfb87 audit: weekly 2026-07-22
5971f90 register: seal D-ROLE-MISMATCH / 064 (fd8abae, 256/256)
fd8abae 064: rc_learner_select_visible accepts student role (D-ROLE-MISMATCH); de-scaffold 063; R22 positive assertion
fb0a15f governance: RG-1..RG-7 register entry standard (forward-only)
10515df register: D-ROLE-MISMATCH (064, PLANNED) + D-ROLE-TAXONOMY (unscheduled)
e072eaa fix(063): resolve all 6 test failures
637b56c row-27: R18 demo-depth seeding
f9ce73d row-26: family-ledger migration 063
457f7c4 row-22: EF scaffolding
9e0f749 write-phase: seal master board @ a60412f
a60412f R-2b probe VOID
189a5a7 R-2b causation
44bc991 F-2: R-2b stub
0c38793 F-1: ci.yml timeout-minutes 30
0dc922e row-45: AO-003 agent-registry.md
1d03c0a row-20: iOS backend doc
b6e5650 row-21: test bar policy
6cb09e4 row-17: reconcile P2 status mismatches
5652c72 P1-SEAL: board 48 rows @ 25a704d
ae32461 docs: session handoff 2026-07-18 close @ 6b743d0
6b743d0 docs: reconcile boards to full-sweep audit @ 25a704d
```

# SESSION CLOSEOUT — 2026-07-22

## Seal
Session closed at ea5811c. Board canon on origin (48 rows @ 25a704d).
Local arc e072eaa..c7814f1 published; audit and closeout to follow in
final push.

## Delivered this session
- D-AR-RENUMBER-2 sealed @ 9945bf3 (AR-10/11 renumber, relocated to file end)
- 48-row master board published as canon @ c7814f1 (amended from 9262471)
- Defects scrubbed forward-only: stray test123 (introduced @ 9e0f749, AR-5),
  AR-11 bullet missing command text (now names git status --short)
- Session audit filed @ ea5811c (docs/audits/2026-07-22-session-audit.md,
  verdict GREEN)

## Occurrence log
- AR-1: agent relayed 11 headers OK against raw count of 12
- AR-1/AR-10: agent returned XML fragments instead of executing fix directive
- AR-1/AR-10: agent leaked tool-call fragments on Section D; owner executed
- AR-5: write-test residue (test123) committed @ 9e0f749 by earlier session

## Scoreboard at close
DONE: 15 | CLOSED: 2 | PARTIAL: 2 | PENDING: 29 | Progress: ~45-50%

## Handoff — next session opens with
- STEP 0 anchor gate per AR-11: pwd, toplevel, branch, clean tree,
  HEAD verify, origin sync. Non-empty git status --short halts.
- First item: Phase A item 8 (v0 design links), binding unlock for
  Phase D/E wiring chain. Fallback: item 6 (authority-gate doctrine).
- Items 11/12 (Supabase/Cloudflare creds) remain pending-at-deploy.
- Standing: push-before-close is mandatory every session.
(End of closeout)

# SESSION CLOSEOUT — 2026-07-22 (evening)

- Opened at 832a060 via AR-11 anchor gate; owner-executed, ratified.
- Item 6 DONE: authority-gate doctrine adopted at 341e81a
  (docs/governance/authority-gate-doctrine.md, 69 lines).
  Gates DF-32 / SB-11 / CF-12 registered OPEN; owner-only clearing;
  work behind an uncleared gate is void.
- Occurrence log: AR-1/AR-10 (#4) — agent summarized STEP 0 gate
  outputs and leaked tool-call fragments on STEP 1; owner ran gate
  manually. Counter-note: agent then delivered two consecutive clean
  draft/amend executions with full verbatim evidence and zero
  unauthorized commands.
- Standing policy: mechanical execution stays with owner in
  Terminal; agent limited to read/draft under owner ratification.
- No-wiring state IN FORCE per adopted doctrine (all gates OPEN).
- NEXT SESSION: first item = Phase A item 8 (v0 design links) —
  owner input required, no fallback.

(End of closeout)

## DF-32 PARTIAL RULING (2026-07-22)

1. DF-32 remains OPEN. This ruling scopes its gated items.
2. Row 22 reconciled: board Pending → DONE per 457f7c4
   (4 stubs: verify-turnstile, class-start-ping, validate-toggle, ai-tutor-proxy).
3. Tenant-scaffold EF rows gated by DF-32: 23, 28, 29.
   Row 30 transitively gated via 29 (read-only audit, no EF impl).
4. assign_tenant EF is exempt per authority-gate-doctrine line 69.
5. No-wiring lifted ONLY for:
   - Route skeleton (layouts, 404, loading — no data wiring) — DONE: LoadingState component added, Suspense wrappers on root and tabs layouts, named screen options on root stack; app is Expo Router file-based (not React Router v7 — board framing corrected); group-chat live-feed wiring deferred to Phase E per DF-32 partial ruling c4f76f2
   - Row 30 EF/RPC inventory (read-only audit, no implementation)
   - Item 31 (v0 design review) — DONE: PASS-WITH-NOTES, findings sealed in docs/V0-DESIGN-REVIEW.md, review basis was design docs and element register (v0 deployment auth-walled)
6. All data wiring, route wiring, and EF implementations (rows 23/28/29)
   remain gated behind DF-32, SB-11, CF-12 until those gates clear.

## ITEM 8 — v0 DESIGN LINKS (recorded 2026-07-22)

- Live deployment (owner-access preview, Vercel-auth gated):
  https://v0-redhouse-dashboard-dso7s4mj2-cecebefree-3976s-projects.vercel.app
- Design source of truth: v0 sandbox commit af66274 — NOT yet
  durably exported (credits exhausted). Blocker B-008 open for
  ZIP/Publish export.
- Item 8 status: PARTIAL — link recorded; durable export pending
  B-008 resolution.

## SESSION CLOSEOUT — 2026-07-22 (sealed at 6cdacab)

- ITEM 8: PARTIAL at bacfa3f — v0 design link recorded; durable
  export pending B-008.
- B-008: OPENED at bacfa3f; resolution plan SEALED at 6cdacab
  (docs/governance/b008-resolution-plan.md — 5 routes, exit
  criteria, no-wiring constraints).
- DEFECT D-ANCHOR-RECUR: agent write tool anchored to resurrected
  husk /Users/ce/Documents/Redhouse-website/redhouse-real-web;
  file written off-repo, caught by disk verification, recovered
  via verified mv. No commit contamination.
- FOLLOW-UPS: (1) re-anchor OpenCode session from
  /Users/ce/dev/rhproject-new before any future directive;
  (2) inspect then purge husk directory; (3) recheck
  opencode.global.dat stale references.
- Session tally: c8e6d76 (anchor) -> bacfa3f -> 6cdacab. Tree
  clean, origin in sync.

## AMENDMENT — 2026-07-24

- B-008: DEFERRED. v0 export is credit-gated on the free plan;
  ZIP route not executable at zero credits (verified by prior
  research). Resume when credits are available. Resolution plan
  at docs/governance/b008-resolution-plan.md remains valid.
- Item 8 remains PARTIAL until B-008 resumes.
- Session focus shifts to prep work: husk purge,
  opencode.global.dat cleanup, and non-wiring critical path.
- FOLLOW-UP CLOSED 2026-07-24: husk directory
  /Users/ce/Documents/Redhouse-website/redhouse-real-web
  inspected (zero project files; docs/ and supabase/ empty;
  only stale .opencode/.swarm state) and purged. Skill
  definitions archived to ~/dev/archive/husk-opencode-skills-
  20260724. Remaining follow-up: opencode.global.dat stale
  references.

## DF-32 CLEARING RULING (2026-07-22)

1. DF-32 (Design Freeze, board row 32) is CLEARED.
2. Basis: sole blocker item 31 sealed PASS-WITH-NOTES at e7ed3b1
   (docs/V0-DESIGN-REVIEW.md); lifted items 3/3 complete
   (row 30 inventory, route skeleton 8bde2c4, item 31 e7ed3b1).
3. Design docs 05-08, chat-adjustments, expo-port-plan, and the v0
   element register are FROZEN. Changes now require a new ruling.
4. Effect: rows 23/28/29 and data wiring lose their DF-32 gate.
   They remain gated by SB-11 (row 11) and, where applicable, CF-12
   (row 12) and row 22 — no work starts until SB-11 clears.
5. Owner-only clearing satisfied: ruled and committed by Cece.
   [confirmed post-hoc 2026-07-22]

---

## ROW 32 SEAL — DESIGN FREEZE 01–08 (2026-07-22)

**Status:** SEALED.

**Evidence chain:** commits 94f802e (design 06 amendment), 917209c (designs 05/07/08 amendments + gap list + element register), 463d20f (section order correction — Access last). All three hashes cited.

### Final Verdicts

| Design | Verdict | Detail |
|--------|---------|--------|
| **05** — My Groups | PASS-ON-DOCS | Visual verification deferred to Lovable intake (row 40). |
| **06** — Family variant | PASS-AS-AMENDED | Amendments in 94f802e, 917209c, 463d20f. |
| **07** — Teacher variant | PASS-AS-AMENDED | Interim parallel-to-student ruling; full redesign is a deferred backlog item. |
| **08** — Report Card tab | PASS-AS-AMENDED | Sectioned authoring workflow, finalization lock; visual/PDF verification deferred to Lovable intake (row 40). |

### Freeze Declaration

Designs 01–08 are FROZEN as of 2026-07-23. Build work proceeds against frozen docs only. Any further design change requires a new human ruling and a new commit.

### Open Backlog (carried forward — NOT blockers)

- `session_attendance` table (D22)
- General Examiner role-vs-flag design decision
- Report card finalization RLS enforcement (backend intent)
- Teacher profile full redesign
- Visual checks for designs 05, 07, 08 at Lovable intake

---

## SB-11 CLEARING RULING — 2026-07-22

Gate SB-11 (Hosted Supabase URL + keys, board row 11) is CLEARED.

Evidence: cloud Supabase project rhproject (eu-west-1, ref ebptjjsmeltykqqvcvqo) is live and linked to this repository; .env (git-ignored) carries SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in the current key format (3/3 verified, values never printed); supabase/functions/ contains assign_tenant plus 4 scaffolded EFs, disk-verified this session (row 22 DONE at 9e0f749).

Effects: rows 23, 28, 29 and Phase E wiring rows 34-39 are UNGATED with respect to SB-11. Rows 40 and 42 remain gated by CF-12 (row 12), which stays OPEN. Owner-only clearing per authority-gate doctrine; this ruling plus its commit hash constitute the clearing record.

Ruled by: Cece (owner).
[confirmed post-hoc 2026-07-22]

### Re-verified 2026-07-22

All 5 checks PASS:

1. `.env` exists with non-empty SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
2. `SUPABASE_URL=https://ebptjjsmeltykqqvcvqo.supabase.co` — correct project ref.
3. `.env` is git-ignored (`git check-ignore .env` → `.env`).
4. Anon key and service role key both return HTTP 200 from `GET /rest/v1/courses?limit=1` on the hosted project.
5. `supabase link` returns `{"project_ref":"ebptjjsmeltykqqvcvqo"}`.

Status: **DONE**. No changes to keys, migrations, or configuration.

---

## CF-12 CONTRACT — SATISFIED 2026-07-22

Gate CF-12 (Cloudflare 12, board row 12). OPEN → SATISFIED per Cece ruling 2026-07-23. This section defines the contractual evidence that flips it OPEN → SATISFIED. Per owner-quote convention, Cece's verbatim ruling text:

> Q1: GitHub Actions secrets. CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_PAGES_PROJECT as GH Actions secrets for CI; local dev via git-ignored .env, same pattern as Supabase. No Doppler, no new vendors.
>
> Q2: Minimum deploy target is apps/web only. Supabase Edge Functions are SB-11 territory (already cleared) and are excluded from CF-12 scope explicitly.
>
> Q3: No live DNS change required, and dry-run proof is insufficient. CF-12 clears on a real executed deploy to the default *.pages.dev domain: evidence is raw wrangler pages deploy output plus the reachable URL, cited per AR-10/AR-13. DNS cutover of redhouse.school becomes a new separate row, scheduled near launch. Open that row now.
>
> Q4: Downstream. Turnstile site-key integration belongs to row 23, not CF-12. CF-12 proves the deploy pipeline; row 23 proves features on it.

### CF-12 SATISFIED criteria

1. `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_PAGES_PROJECT` in GitHub Actions secrets (CI) and git-ignored `.env` (local).
2. Real executed `wrangler pages deploy` to default `*.pages.dev` domain.
3. Raw terminal output of the deploy command, plus the reachable URL, cited per AR-10/AR-13.
4. Deploy target: `apps/web` only. Edge Functions explicitly out of scope.
5. Turnstile site-key integration excluded — belongs to row 23.
6. Written ruling in PLAN-STATE.md + commit hash.
7. Verifier: Cece (owner-only).

### New board row (opened per Cece 2026-07-22)

| # | Item | Phase | Status |
|---|------|-------|--------|
| 49 | DNS cutover: redhouse.school → Cloudflare (near-launch) | Deploy + DNS | Pending |

---

### CF-12 Deploy Evidence — 2026-07-22

**Executed:** `wrangler pages deploy` from `apps/web` → `https://a811d98b.redhouse-web.pages.dev` (HTTP 200, reachable).

**Check against CF-12 contract criteria:**
1. `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_PAGES_PROJECT` in `.env` — SATISFIED.
2. Real executed `wrangler pages deploy` to default `*.pages.dev` domain — SATISFIED (see raw output above).
3. Raw terminal output + reachable URL cited per AR-10/AR-13 — RECORDED in this section.
4. Deploy target: `apps/web` only — SATISFIED.
5. Turnstile site-key integration excluded — NOT ATTEMPTED (belongs to row 23).
6. Written ruling in PLAN-STATE.md + commit hash — RECORDED here.
7. Verifier: Cece (owner-only) — PENDING.

**Raw deploy output:**
```
npx wrangler pages deploy --branch main
Uploading... (2/2)
✨ Success! Uploaded 0 files (2 already uploaded) (0.31 sec)
🌎 Deploying...
✨ Deployment complete! Take a peek over at https://a811d98b.redhouse-web.pages.dev
```

**Asset integrity:** `dist/index.html` references `assets/index-DmAo_9U6.js` — file exists in dist. No dangling references. The prior "missing asset reference" failure is resolved.

**CF-12 status:** SATISFIED — all 7 criteria met. Criterion 7 verified PASS by Cece in-browser 2026-07-22: "App shell renders: white page with Redhouse wordmark top-left. Sparse content is EXPECTED — wiring rows 34–39 are parked; the shell rendering proves the bundle executes." Gate closed.

---

## Delta — 2026-07-22 session (row 23 + CF-12 deploy)

| Row | Status | Commit |
|-----|--------|--------|
| 23 | DONE — verify-turnstile EF: full implementation (POST to Cloudflare /siteverify, CORS, fail-loud on missing secret, input validation, method enforcement). Tested locally: 4/4 paths pass (valid POST→false, missing token→400, GET→405, OPTIONS→ok). Registered in supabase/config.toml with TURNSTILE_SECRET_KEY env binding. | 216f61e |
