# PLAN-STATE (F0 Ground Truth Snapshot)

**Generated:** read-only audit, 2026-07-18. Source: disk + git, pasted raw per AR-1.
**Working repo:** /Users/ce/dev/rhproject-new (HEAD 887ce98).

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
```

Note: 054, 055 absent (reserved permanent gaps — ruling 4fb1b8f). Head ends at 062.

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

The register's per-row status markers (44 BACKED / 11 PLANNED) live in table cells
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

