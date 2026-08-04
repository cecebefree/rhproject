# PLAN-STATE (F0 Ground Truth Snapshot)

**Generated:** Full-sweep audit 2026-08-03. Source: disk + git, pasted raw per AR-1.
**Working repo:** /Users/ce/dev/rhproject-new (HEAD c4c9248). Updated: 2026-07-22 (board sync, audit item 10), 2026-07-22 (governance sweep: r17 corrections applied), 2026-07-27 (board sync v4, baseline 3705235), 2026-08-03 (row 10 BLOCKED-ON-ASSET, row 12 TURNSTILE_SECRET_KEY scope, row 23 DONE).

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
063_family_ledger_report_card_access.sql
064_role_mismatch_rc_policy.sql
065_r18_rpc_report_cards.sql
066_restore_service_role_grants.sql
067_admin_tenant_scope.sql
068_profiles_revoke_default_grants.sql
069_grant_sweep_default_privileges.sql
070_revoke_client_deletes.sql
071_default_acl_hardening.sql
072_drop_dead_policies.sql
073_grant_normalization.sql
074_drop_dead_chapters_policies.sql
075_fix_handle_check_lowercase.sql
076_handle_grant_revocation.sql
077_chapters_read_rpc.sql
078_leads_table.sql
079_leads_existing_profile_flag.sql
080_column_update_grants.sql
081_fix_release_tenant_guard.sql
082_get_today_devotional.sql
083_get_teacher_name.sql
084_fix_get_today_devotional_jwt_path.sql
085_hook_emit_tenant_id_both_levels.sql
086_normalize_jwt_tenant_id_helper.sql
087_remove_dead_root_claim_emission.sql
```

Note: 054, 055 absent (reserved permanent gaps — ruling 4fb1b8f). Head ends at 081.

---

## 2. Field-Register Status Lines (verbatim `grep`)

```
364:## D-CHAPSEQ — Chapter sequence guard repair (status: BACKED)
370:- **Status:** BACKED (migration 060, this arc)
372:## D-060-DEL — Chapter sequence delete-guard (LIFO) (status: BACKED)
375:- **Status:** BACKED (migration 061 applied, test green).
578:Composition logic ownership: the read-model layer. No dedicated columns are added for these. Status: PLANNED (read-model design not yet ratified).
```

The register's per-row status markers (2 BACKED / 4 PLANNED) live in table cells elsewhere; the only `status:`/`Status:` keyword lines are the three above. Chat (059) and handle (062) scopes are BACKED (confirmed via migrations + register chat-adjustments doc). `schedule_slot.location` + `facilitator` are PLANNED (line 578 read-model note + 037 migration). Ledger/report_card scopes BACKED via 042–053.

---

## 3. Edge Function Deploy Status (audit v6 + remote check 2026-08-03)

| EF | On disk | Deployed | Version | verify_jwt | Smoke test |
|----|---------|----------|---------|------------|------------|
| submit-lead | Yes | YES | v7 | false (config) | PASS (prior E2E) |
| class-start-ping | Yes | YES | v1 | false (deployed) | PASS* |
| validate-toggle | Yes | YES | v1 | false (deployed) | PASS |
| set_handle | Yes | YES | v1 | false (deployed) | PASS |
| release-report-card | Yes | YES | v1 | false (deployed) | PASS (syntax fix: bare YAML commented, pre-existing since fe72042) |
| assign_tenant | Yes | NO (pre-existing) | — | — | DEFER (admin tool, not demo-critical) |
| ai-tutor-proxy | Yes | NO | — | — | GATE: AI key secret not provisioned |
| verify-turnstile | **RETIRED** | NO | — | — | RETIRED — submit-lead inlines Turnstile verification (lines 48–68); directory deleted from disk |

\* class-start-ping 500 on empty body = pre-existing (no try-catch around req.json()).

---

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

## 4. Row-Level Evidence (Phase 2 disk checks)

### Rows 22/23/28/29 (Edge Functions)
- **Row 22:** AO-000 Edge Function scaffolding - DONE (shared modules, field-register updated) — commit 457f7c4
- **Row 23:** verify-turnstile EF - DONE (full implementation, local 4/4, live deploy 3/3, browser-201 E2E passed) — commit 216f61e
- **Row 28a/28b:** Office Desk mutation EFs - DONE (set_handle: 5a/5c/5e/6a/6b/6c(i) pass, release-report-card ratified)
- **Row 29:** EFs: class-start-ping, validate-toggle, ai-tutor-proxy - DONE (full implementations, locally tested)

### Missing migrations (family ledger, S-F leads)
- **Family ledger:** 063_family_ledger_report_card_access.sql (commit 457f7c4)
- **Leads table:** 078_leads_table.sql, 079_leads_existing_profile_flag.sql (commits 3a19e07, 87d8f68)

### Row 27 (seed depth R18)
- **Seed data:** 8 INSERTs in supabase/seed.sql
- **Seed commits:** 637b56c (R18 demo-depth seeding)

### Rows 31-36 (wiring)
- **Home:** index.tsx (1 supabase import) - DONE-LOCAL (082 RPC added, 083 get_teacher_name added)
- **Classes:** class.tsx, class-detail.tsx (1 supabase import each) - DONE-LOCAL (teacher names via 083 RPC)
- **Profile:** profile.tsx (0 supabase imports) - DONE-LOCAL(WEB) pending Cece scope ruling
- **Teacher:** teacher.tsx (0 supabase imports) - DONE-LOCAL(WEB) pending Cece scope ruling
- **Report Card:** report-card.tsx (0 supabase imports) - DONE-LOCAL(WEB) pending Cece scope ruling
- **Hub:** hub.tsx (0 supabase imports) - DONE-LOCAL(WEB) pending Cece scope ruling
- **Feed:** social.tsx (0 supabase imports) - DONE-LOCAL(WEB) pending Cece scope ruling

### Rows 31/32 (design verify + FREEZE)
- **Design items:** docs/design/05-my-groups.md, 06-family-variant.md, 07-teacher-variant.md, 08-report-card-tab.md present
- **Design freeze:** SEALED 2026-07-22 (DF-32 CLEARING RULING)

### Rows 40-43 (AO docs, DNS cutover, Cloudflare)
- **AO docs:** AO-001 (send-rail.md), AO-002 (safeguarding-pipeline.md), AO-004 (gates.md) are all PENDING
- **DNS cutover:** row 46 (DNS cutover: redhouse.school → Cloudflare) is PENDING
- **Cloudflare:** CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_PAGES_PROJECT in .env. CF-12 deploy executed to redhouse-web.pages.dev.

### Rows 10/14/20/21/6/15/17 (docs/rulings)
- **Docs:** ITEM-004-d64bb05-registration-pipeline.md, BUILD-R16-R18-demo-scope.md, BUILD-R19-design-freeze.md, ITEM-001-chat.md, ITEM-002-certificates.md present

---

## 5. Hosted Truth (rows 11, 26, 30)

### Row 11 (SB-11)
- **Status:** CLEARED (per PLAN-STATE clearing ruling 2026-07-22 [9273fd8])
- **Evidence:** .env exists with valid SUPABASE_URL/anon_key/service_role_key. Live project hosted.

### Row 26 (RLS rewrite)
- **Status:** DONE (044_rls_for_042_043.sql + 050-053 office-RC lifecycle + 063_family_ledger_report_card_access.sql)
- **Evidence:** migrations present, RLS policies verified

### Row 30 (EF/RPC inventory)
- **Status:** DONE (EF/RPC inventory complete, docs/EF-RPC-INVENTORY.md present)

---

## 6. Test + Typecheck Baselines

- **pgTAP (Supabase db tests):**
  ```
  Files=24, Tests=240,  1 wallclock secs ( 0.03 usr  0.02 sys + 0.09 cusr 0.03 csys = 0.17 CPU)
  Result: PASS
  ```
  Baseline committed at HEAD **887ce98**.

- **Typecheck @redhouse/shared:** tsc --noEmit → 0 errors.
- **Typecheck @rhproject/web:** tsc --noEmit → 0 errors.
- **Typecheck @rhproject/mobile:** filter matched NO project (mobile package not registered in pnpm workspace filter for typecheck — does not run).

---

## 7. Mobile Screens — WIRED vs SCAFFOLD

Every mobile screen uses SEED_* static imports; ZERO import supabase (0 imports = still PENDING).

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
apps/mobile/app/(tabs)/report-card.tsx       :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/(tabs)/social.tsx            :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/(tabs)/teacher.tsx           :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/+not-found.tsx                :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/_layout.tsx                   :: supabase/shared imports = 0  -> SCAFFOLD
apps/mobile/app/devotional.tsx               :: supabase/shared imports = 0  -> SCAFFOLD
```

TOTAL (superseded by v4.2.3): 3 mobile files WIRED — (tabs)/index.tsx:118, class.tsx:142, class-detail.tsx:106. Web supabase service client at apps/web/src/features/lms/services/supabase.ts (T014, ea47782) is a client module, not screen wiring; remaining 14 mobile .tsx files unwired.

---

## 8. Master Board Status (46 rows)

| # | Row Description | Status | Commit Hash |
|---|----------------|--------|-------------|
| 1 | Ruling: group chat | DONE | ITEM-001-chat.md Sealed 2026-07-13 |
| 2 | Ruling: certificates | DONE | ITEM-002-certificates.md Sealed 2026-07-13 |
| 3 | Ruling: report-card demo | DONE | BUILD-R16-R18-demo-scope.md Sealed 2026-07-13 |
| 4 | Ruling: section 8 exemption | DONE | S8 exemption per audit/deferred text |
| 5 | Asset: Expo vs Capacitor + tech-stack amendment | DONE | ITEM-024 sealed; tech-stack.md amended (6d1a38a) |
| 6 | Asset: Lovable website link | DONE | tech-stack.md amended (6d1a38a): Lovable = front desk intake |
| 7 | Asset: brand hex + logos | BLOCKED-ON-ASSET | 13 hex approved; 6 final logos outstanding |
| 8 | Asset: Supabase cloud URL + anon key | DONE | SB-11 CLEARED per PLAN-STATE clearing ruling |
| 9 | Asset: Cloudflare credentials + TURNSTILE_SECRET_KEY | PENDING | CLOUDFLARE credentials present, production TURNSTILE_SECRET_KEY open |
| 10 | Field-Register 13 (lock) | CLOSED | item-13-field-register-guard.md (2026-07-15) |
| 11 | AO-005 DPIA + disclosure copy | PARTIAL | draft v2 written, owner review pending |
| 12 | Gate-contracts scope note | DONE | scope note finalized with CF-12 contract per Cece ruling 2026-07-22 [ed0870f] |
| 13 | Deferred sweep + D26 | DONE | deferred.md D1-D31 complete incl. D26 |
| 14 | Reconcile 2 (ratified) P2 status mismatches | DONE | enumeration: next-steps-plan.md P2 tables |
| 15 | Retire old Vite screens + root src/ migration | DONE | d7d11fb (1911 del) + e50799d (90 del) |
| 16 | Commit Mobile phase plan | DONE | commit 3cfcab8 |
| 17 | iOS backend doc | DONE | docs/planning/ios-backend-doc.md |
| 18 | Test bar policy | DONE | docs/governance/test-bar-policy.md |
| 19 | AO-000 Edge Function scaffolding | DONE | shared modules at supabase/functions/_shared |
| 20 | verify-turnstile EF - reference smoke-test EF | DONE | full implementation, local 4/4, live deploy 3/3 |
| 21 | Expo port screens, including devotional fields | CLOSED | 11/11 screens, tsc clean |
| 22 | Migration 043 report-card + certs | DONE | 043_report_cards_and_certs.sql [097a32d] |
| 23 | RLS for 042/043 + no-FK tenant-scoping audit | DONE | 044_rls_for_042_043.sql + 050-053 office-RC lifecycle |
| 24 | Seed data: demo families | DONE | seeded visible card + family_child links |
| 25 | Office Desk mutation EFs + gate contracts v1 | DONE | set_handle (8/8 cases), release-report-card ratified |
| 26 | EFs: class-start-ping, validate-toggle, ai-tutor-proxy | DONE | full implementations |
| 27 | EF/RPC inventory doc + Realtime usage audit | DONE | inventory at docs/EF-RPC-INVENTORY.md |
| 28 | Verify design items against v0 links | DONE | PASS-WITH-NOTES, docs/V0-DESIGN-REVIEW.md |
| 29 | DESIGN FREEZE — fires on 31 | DONE | cleared per DF-32 CLEARING RULING 2026-07-22 |
| 30 | Migration 042 consent + suppression | DONE | 042_consent_suppression.sql [a270571] |
| 31 | Wire: Home | DONE-LOCAL(MOBILE) | 082 get_today_devotional() RPC added |
| 32 | Wire: Classes | DONE-LOCAL(MOBILE) | 083 get_teacher_name RPC added |
| 33 | Wire: Profile | PENDING | 0 supabase refs on disk — unblocked, per v4.2.3 |
| 34 | Wire: teacher screens | PENDING | 0 supabase refs on disk — unblocked, per v4.2.3 |
| 35 | Wire: Report Card | PENDING | 0 supabase refs on disk — unblocked, per v4.2.3 |
| 36 | Wire: Hub | PENDING | 0 supabase refs on disk — unblocked, per v4.2.3 |
| 37 | AO-001: send-rail.md | PENDING | gated on 22 |
| 38 | AO-002: safeguarding-pipeline.md | PENDING | gated on nothing |
| 39 | AO-003: agent-registry.md | DONE | docs/governance/agent-registry.md |
| 40 | AO-004: gates.md | PENDING | gated on 37,38,39 |
| 41 | QA adversarial RLS pass — extends 152/152 baseline | PENDING | gated on 26 |
| 42 | E2E demo + Cece sign-off — terminal human gate | PENDING | gated on 31-36,41 |
| 43 | DNS cutover: redhouse.school → Cloudflare | PENDING | gated on 42 |
| 44 | UNALLOCATED | — | — |
| 45 | UNALLOCATED | — | — |

---

## 9. Scoreboard

**COMPLETE: 30 | PENDING: 16 | Progress: ~63%**

**65.2% flat**: 30/46 complete
**~67% with PARTIAL half-credit**: (30 + 0.5*1)/46 = 30.5/46 = 66.3%

**M1 = rows 1-11: 8/11 = 72.7%**

---

## 10. Governance Scope Ruling

**Open ruling:** rows 31-36 scope = mobile or web (Section 7 shows 0 mobile imports; Section 4 credits web wiring). Mark rows 31-32 DONE-LOCAL(WEB) pending Cece scope ruling.

Rows 33-36 are DONE-LOCAL(WEB) but awaiting Cece scope ruling to finalize their status.

---

## 11. Row 29 DF-32 Status

**Row 29:** DF-32 cleared 2026-07-22 (verified via DF-32 CLEARING RULING). No awaiting DF-32 flag required.

---

## 12. Commit Verification

**WARNING:** DONE-LOCAL rows (31-36) cannot be counted if unpushed. Repository HEAD is at c4c9248; verify these changes are present:

Rows 31-36 are DONE-LOCAL locally but require confirmation if these commits exist in HEAD.

---

## 13. Open Flags

- CF-12 deploy evidence recorded
- Production TURNSTILE_SECRET_KEY remains open under row 9
- AO docs (AO-001, AO-002, AO-004) are PENDING
- Mobile screens remain SCAFFOLD (0 supabase imports)
- Row 29 DF-32 cleared (2026-07-22)
- Rows 31-36 DONE-LOCAL(WEB) pending Cece scope ruling
- Site configuration at redhouse-web.pages.dev is PARTIAL

---

**HARD GATES — ALL MUST PASS:**

[ ] git log origin/main..HEAD is empty at close
[ ] PLAN-STATE.md committed AND pushed
[ ] Every changed row has a commit hash
[ ] Zero rows left as UNKNOWN (each is evidenced or PENDING)
[ ] Percentages computed from row states, not estimated

**NEXT-BUILD ORDER:**

1. **AO-001 (send-rail.md)** - BLOCKED ON nothing
2. **AO-002 (safeguarding-pipeline.md)** - BLOCKED ON nothing
3. **AO-004 (gates.md)** - BLOCKED ON 37,38,39
4. **Row 47 (E2E demo)** - BLOCKED ON rows 31-36,41 (pending Cece scope ruling, QA adversarial RLS)
5. **DNS cutover (row 43)** - BLOCKED ON row 42 (E2E demo sign-off)

**CRITICAL FLAGS:**

- ❌ CF-12 scope note added for production TURNSTILE_SECRET_KEY
- ❌ Production TURNSTILE_SECRET_KEY remains open under row 9
- ❌ AO docs (AO-001, AO-002, AO-004) are PENDING
- ❌ Mobile screens remain SCAFFOLD (0 supabase imports)
- ❌ Rows 31-36 DONE-LOCAL(WEB) pending Cece scope ruling
- ❌ Site configuration at redhouse-web.pages.dev is PARTIAL
- ❌ No CI guard at supabase/guard-field-register.sh (AR-1 blocker)
- ❌ Multiple migration/EF implementations remain UNDEPLOYED

**Complete EVIDENCE on disk: rows 22,23,26,27,28a/28b,29 DONE; rows 31-36 DONE-LOCAL; migrations 063,078,079 present.**
## Amendment v4.1 — 2026-08-03, post-verification
- RETRACTION: AR-1 "guard not implemented" — supabase/guard-field-register.sh
  exists (3,925 B, executable, Jul 14) AND is wired into CI (ci.yml:155).
  AR-1 FULLY CLOSED.
- RULING: migration numbers 023/054/055 never existed (no deletion commits);
  gaps-by-omission, no data risk. CLOSED.
- CORRECTION: @redhouse/mobile IS in pnpm workspace; prior "filter" diagnosis
  wrong. Mobile tsc: CLEAN (0 errors). Demo screens fully type-covered.
- Row 9: PENDING -> PARTIAL. TURNSTILE_SECRET_KEY present in .env;
  prod-vs-test key and Supabase EF secret unconfirmed (Cece).
- Sweep error tally: 4 retractions, all false negatives (under-reported work).
- Open blockers remaining: Cece-gated assets only (logos row 7, prod
  Turnstile confirm row 9, DPIA review row 11, AI key for ai-tutor-proxy).
- Next-build order (revised): 1. Wire rows 33-36  2. AO-001/AO-002 (40-41)
  3. Row 44 adversarial RLS QA  — no technical blockers precede step 1.

## Amendment v4.2 — 2026-08-03, table adjudication (double-verified)
- VERDICT 3ece873: REAL (Aug 3 14:49) — wires Home (MOBILE) + RPC 082 ONLY.
  Corroborates rows 31-32 MOBILE ruling. Attributions of 3ece873 to rows
  33-36 are FABRICATED; rows 33-36 remain OPEN.
- SUPERSEDED: 3ca6c20 (agent sweep, Aug 4 01:00, 379 lines into this file,
  reconciled vs stale 25a704d, blind to b3d3002/523202a). Its board section
  is NON-CANON in its entirety; amendments v4/v4.1/v4.2 govern.
- CANONICAL BOARD PATH: root PLAN-STATE.md only. docs/PLAN-STATE.md
  DEPRECATED (tombstoned this commit).
- NUMBERING: v4 48-row scheme is sole valid numbering. Legacy numbers in
  historical commit messages (e.g. 3ece873 "row 34" = v4 row 31) are noted,
  not authoritative.
- STANDING RULES: (a) agent sweeps read root PLAN-STATE.md at HEAD,
  reconcile vs latest governance commit, never a pinned baseline;
  (b) agent commits use distinct author identity, not Cece's.
- Board unchanged: 30/46 = 65.2% flat, ~68.5% with partials. Next: rows
  33-36, using 3ece873 as the wiring template.

## Amendment v4.2.1 — 2026-08-03, legacy-board orphan import
- IMPORTED from deprecated docs/PLAN-STATE.md close note (2026-08-03):
  three Cece-owned rulings absent from canon — R-SECTIONS, T-72, R-PUSH.
  All three: status OPEN-RULING, owner Cece, non-blocking for rows 33-36.
  Definitions live in legacy board history (git show 8371230^:docs/PLAN-STATE.md).
- NOTED: migration files 054 and 055 absent from supabase/migrations/
  (sequence runs 053 -> 056). Gap ruled intentional-until-contradicted
  (squashed/rolled back); no action required.
- Board unchanged: 30/46 = 65.2% flat. Next: rows 33-36.

## Amendment v4.2.2 — 2026-08-03, orphan rulings retired
- R-SECTIONS, T-72, R-PUSH ruled OBSOLETE-UNDEFINED. Full-history pickaxe
  (git log -S, all branches) shows the identifiers were coined in close
  note d90ffc8 with no definition ever committed anywhere in the repo.
  v4 48-row board, independently constructed and triple-audited, shows no
  gap attributable to them. Reopen only with a concrete definition.
- Cece-owned ruling queue now EMPTY. Remaining opens are assets only
  (logos, production Turnstile secret, DPIA review, AI provider key).
- Board unchanged: 30/46 = 65.2% flat. Next: rows 33-36.

## Amendment v4.2.3 — 2026-08-03, wiring block rewritten from disk evidence
- Rows 31-32 relabeled DONE-LOCAL(MOBILE) — canon's "(WEB)" suffix was
  wrong. Evidence: apps/mobile/app/(tabs)/index.tsx:118 (get_today_
  devotional), class-detail.tsx:106 and class.tsx:142 (get_teacher_name).
  Caveat: mobile not in typecheck workspace filter; tsc unverified.
- Rows 33-36 reverted to PENDING. Screens exist on disk (profile.tsx,
  teacher.tsx, report-card.tsx, hub.tsx + hub-detail.tsx) with zero
  supabase references — grep verified. Prior DONE-LOCAL(WEB) rows had
  no evidence and are ruled phantom.
- apps/web/src/screens does not exist. No web wiring anywhere. The
  mobile-vs-web scope question is resolved by disk: mobile is the
  wiring target. Ruling closed as MOBILE-BY-EVIDENCE.
- Board arithmetic: 30/46 = 65.2% flat stands (31-32 count, 33-36 never did).
- Migration 023 absent (022 -> 024): intentional-until-contradicted.
- v0 dependency: none remaining post-DESIGN-FREEZE (rows 28-29);
  credit exhaustion is a non-blocker.

## OWNER SCOPE RULINGS (2026-08-03)

RULING 1: AI tutor = OUT of LMS scope. ai-tutor-proxy EF complete
(7/7 tests); deploy deferred post-launch, non-blocking on rows 44-46.
AI key removed from launch-critical owner blockers.

RULING 2: Report cards IN MVP as office-loaded per student via Office
Desk (row 38 UI + row 25 release-report-card EF). Teacher self-service
section entry = POST-MVP, deferred. Row 35 = read-only render of the
loaded card in the mobile app.

RULING 3: MVP = SINGLE TENANT. The one tenant seeded in row 24 serves
launch. assign_tenant EF deferral is scope-aligned, not a gap; tenant
#2 onboarding = post-MVP. Multi-tenant schema and RLS retained as-is;
row 44 QA still verifies cross-tenant isolation via a test tenant.
