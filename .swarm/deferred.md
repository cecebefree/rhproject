# Deferred Items — rhproject-new

Tracked open items that are known, recorded, and must be fixed before their trigger.

| # | Item | Trigger | Status | Fix-note |
|---|------|---------|--------|----------|
| D1 | react-native-screens@4.25.2 wants RN >=0.82.0 but apps/mobile has RN 0.74.5 | Before first mobile build | Open | Pin react-native-screens to ~3.x compatible with Expo 51 / RN 0.74 |
| D2 | 3 ignored build scripts (@biomejs/biome, esbuild@0.21.5, esbuild@0.25.12) — native binaries not compiled | Before first pnpm lint — run pnpm approve-builds then | Closed | Fixed: allowBuilds added to pnpm-workspace.yaml (2026-07-01); pnpm install exits 0 |
| D3 | v0 screen React version unknown — existing v0-cecebefree-3976-58ac388e directory may declare stale React version | When v0 screens land, verify React version before merge | Open | Inspect v0 directory package.json, reconcile with React 19 target |
| D4 | 26 deprecated Expo subdependencies (old Babel proposal plugins, legacy React Navigation) | Only on Expo upgrade | Watch | No action until Expo 51 -> next major; deprecated deps are transitive and non-blocking |
| D5 | apps/mobile: Expo package.json over web-based source (react-router-dom/react-dom); half-migrated | Own mobile session | Parked | Real design from v0; do not fix in scaffold sessions |
| D6 | CRM grant contents | When CRM build starts | Parked | |
| D7 | family mobile | Own mobile/family session | Parked | |
| D8 | retention legal doc | Before data-retention policy ships | Parked | |
| D9 | Gap 1 index tuning | Post-launch performance pass | Watch | |
| D10 | pgTAP tests — supabase/tests/ do not exist | Section 3 Auth/RLS session | Closed | 6 pgTAP test files written: 00-05, 33/33 assertions PASS. Files: supabase/tests/{00_rls_enabled,01_profiles_self_read,02_student_devotional_blocked,03_admin_devotional_visible,04_admin_all_bypass,05_jwt_hook_injection}.sql. Closes D10 — Blocker 2 phase-1 verified. |
| D11 | Lint — CLOSED 2026-07-03. Actual state was 2 format errors in packages/shared, not 103. Fixed (commit 8a91ece). Same work item as P2-027 — do not double-count. | — | Closed | |
| D12 | 5 tables have RLS DISABLED: devotional_config, devotional_item, tenant_devotional, tenant_lms, tenant_mobile | Closed | RLS enabled on all 5 + profiles. JWT hook injects tenant_id. admin_all bypass verified. Fix: 024 inserts Redhouse before backfill (seed runs after migrations). |
| D13 | Step 7 index mismatch: plan expects idx_tenants_kind + idx_tenants_slug_active, neither exists (019 made per-table slug_key instead) | Blocks Step 7 pass | Closed | RESOLVED 2026-07-02 (see bottom): mismatch was vs superseded single-table design; actual 3-table build has pkey + slug_key each; kind index unneeded. Verdict ACCEPT, no fix. |
| D15 | handle_new_user() does not set tenant_id — new signups get NULL | App-layer must set tenant_id on signup | Closed | Fixed: 025_handle_new_user_tenant_id.sql — function now sets tenant_id = Redhouse UUID on signup. Verified in DB. |
| F6 | Subagent file access — subagents return empty, cannot reach disk | CTO technical decision needed | Closed | Fix B locked: orchestrator pre-loads file contents into subagent prompts. Rule in AGENTS.md:235. CTO verified live with Backend Lead audit. |
| D16 | AI-import guard — block ai/tutor imports in web/mobile | When apps/lms/ AI folder is scaffolded | Open | grep-based CI check; nothing to guard until AI folder exists |
| D17 | Platform/tenant import guard — block platform code leaking into tenant folders | When >1 tenant/app folder exists | Open | grep-based CI check; only apps/mobile exists today |
| D18 | Type-drift guard — fail CI if generated DB types drift from schema | When a generated DB types file exists | Open | supabase gen types + diff vs committed file |
| D19 | apps/mobile/src/index.tsx uses react-dom createRoot (web bootstrap) inside a React Native app — should use AppRegistry.registerComponent. Web-trespasser missed in the 37-file clear-out. | Own session / folds into D5 Expo migration | Open | |
| D20 | Language breach — CLOSED 2026-07-03. instructions field added to opencode.jsonc; .opencode/working-language.md loads English-only rule into runtime each session, highest priority. Root cause: rule was on disk but never injected into system prompt. VERIFIED LIVE — config confirmed on disk; 3/3 model outputs English (voluntary enforcement; full auto-injection proves on next session start). D20 fully closed. | — | Closed | |
| D21 | Teacher-managed scheduling — config-gated tenant capability, per decision D22 in field-register.md. Parked by design; no toggle implemented in P2-012. schedule_slot writes are admin-only (D22 contract/payment coupling). Teacher self-service scheduling is a future tenant-level config flag, not a role widening. | When tenant config system exists | Parked | Design decision locked 2026-07-10 |
| D22 | session_attendance — Track per-session attendance (present/absent/excused) linked to schedule_slot + student_class. Requires new migration, RLS policies, pgTAP tests. Blocks My Analytics. | When session tracking needed | Parked | Propose as P2-030 or fold into P2-012 follow-up |
| D23 | My Analytics (design-doc) — Student-facing analytics dashboard showing progress across enrolled courses, enrichment meta (pace/completion), attendance summary. Blocked on session_attendance table + enrichment_meta data. Design-doc item, not a migration. | When analytics dashboard scoped | Parked | |
| D24 | Course→book mapping for auto-assignment — Enables materialization function to set book_id on booklist_item instead of NULL. Required for full 040 booklist shape. New migration needed. | When book catalog wired to courses | Parked | From P2-022 deviation: book_id nullable in 040 because no course→book mapping exists |
| D25 | Notification bell + My Groups mirror + platform-status binding UI debt — 3 UI items across Profile, Home, Social. Register in docs/field-register.md BEFORE Stage 1 wiring. | When UI build starts | Parked | D17 items 1, 3, 4 |
| D26 | student_class direct tenant_id column — Mobile phase requires tenant_id on student_class for direct tenant scoping without joins. New migration. | Mobile phase | Open | D26 FIRES — mobile phase begins; migration needed before conversation_members RLS |
| D27 | Announcement→notification fan-out — When announcement published, fan out to notifications table per tenant+role. Integration task, new migration. | When notification pipeline wired | Parked | From P2-025 (041) |
| P2-026 | Mobile phase: student_class tenant_id migration + My Groups schema (conversations, conversation_members) | Phase C start | Open | |

---

**Rules:**
- No item may be closed without a Fix-note (commit ref or verified result).
- Status must be one of: Open | In Progress | Watch | Closed.
- Orchestrator reviews this file at every phase boundary.

## Next Session Goal
TBD — set at next session open. D10, D11, D12, D13, D15 are Closed. Open items: D1, D3, D16, D17, D18, D19, D26, P2-026.
D11 ≡ P2-027 (same lint fix) — do not double-count in progress metrics
**Open with:** write-test → leadership → leads load docs.

## D14 — TODO: Split locked architecture into a 3rd document (governance fix)

STATUS: DEFERRED — do NOT execute until current planning session closes and Cece gives explicit OK-to-build.
LOGGED: 2026-07-02.
REASON: During planning we wrote four architecture "lock" blocks directly into AGENTS.md. This violates our rule: Constitution = the rules, AGENTS.md = short anchor only. Correct afterward, not now.

GOAL: Three documents, each with ONE job, all read at session start, kept orderly and separate.

STEPS:
1. CREATE .specify/memory/architecture.md (beside constitution.md).
2. MOVE the four lock blocks OUT of AGENTS.md INTO architecture.md.
3. REDUCE AGENTS.md to a thin anchor with 3-doc load order.
4. ADD precedence line to constitution.md AND architecture.md: Constitution > Architecture > AGENTS.md.
5. WRITE a PURPOSE CHARTER at the top of each of the three documents.
6. COMMIT all three together.

DO NOT execute until planning closes and Cece gives OK.

D14-note-2 (REVISED v2, 2026-07-02): Domain Model lock MISSING from AGENTS.md. When building architecture.md under D14, write:
  CORE: Cambridge, IB, Home-School.
  SUP: Enrichment (on-demand, self-study, test, certificate) + Clubs (live, activity-based, no tests).
  HUB (= OTT, 3rd-party white-label): Live Events (scheduled streams) + Channels (Jr + Senior, separate programming). Hub = last mobile tab.
  SOCIAL: 3rd-party WhatsApp-like; groups + contacts; NO child data; report/restrict only.
  NEWSLETTERS: HubSpot "posts" in Home — NOT Social.
  Mobile tabs: Home, Class, Hub, Social, Profile.
  OPEN/PARKED: Enrichment DELIVERY undecided — own OTT-style shell (maybe muvi) OR the Hub OTT layer. Classification fixed (SUP); delivery UNCONFIRMED.
  Header: "— do not remap" + STATUS: LOCKED (except PARKED line).

D14-note-3 (DECISION, 2026-07-02): profiles RLS self-read is LOCKED.
  Policy MUST use direct check: id = auth.uid()
  NO subquery into profiles, NO recursion. This is the fix for the
  old instructor/teacher RLS break. Applies when RLS build (D12) runs.
  STATUS: LOCKED.

=== HANDOFF 2026-07-02 — D12 auth+RLS: BUILD-READY, NOT BUILT ===
STATUS: 4-migration sequence verdicted CLEAN by Backend/Security/DevOps. Nothing built.
SEQUENCE (locked): 021 add profiles.tenant_id FK -> tenant_devotional(id) nullable;
  022 custom_access_token_hook SECURITY DEFINER w/ EXCEPTION WHEN OTHERS RETURN event
  inside body + grants to supabase_auth_admin + MANUAL config.toml
  [auth.hook.custom_access_token] enabled=true (file edit, NOT in SQL);
  023 RESERVED LMS retrofit; 024 fail-loud DO-block backfill (RAISE EXCEPTION if
  redhouse id NULL) THEN enable RLS on 5 tables, all with admin_all bypass.
NEXT SESSION FIRST ACTION: cat config.toml to confirm hook block staged,
  then Cece OK-to-build 021 -> build 021,022,024 -> supabase db reset -> verify JWT claims.

=== D12 BUILD COMPLETE 2026-07-02 ===
STATUS: All 3 migrations built, reset verified, JWT claims confirmed.

MIGRATIONS BUILT:
  021: profiles.tenant_id FK -> tenant_devotional(id) nullable, admin policy -> JWT claim
  022: custom_access_token_hook SECURITY DEFINER, EXCEPTION WHEN OTHERS RETURN event, GRANT to supabase_auth_admin
  024: INSERT Redhouse tenant_devotional (idempotent), fail-loud DO-block backfill, RLS + admin_all on 5 tables

VERIFIED:
  - supabase db reset: PASS (all 12 migrations + seed)
  - config.toml [auth.hook.custom_access_token]: enabled=true
  - Student JWT: app_metadata.tenant_id=00000000-0000-0000-0000-000000000001, role=student
  - Admin JWT: app_metadata.tenant_id=00000000-0000-0000-0000-000000000001, role=admin
  - RLS on 6 tables: profiles, devotional_config, devotional_item, tenant_devotional, tenant_lms, tenant_mobile
  - profiles self-read: auth.uid() = id (direct, no recursion)
  - No non-admin SELECT policies on devotional_config (students blocked by default)
  - admin_all bypass policies on all 5 tenant tables with correct JWT role check
  - Hook function: SECURITY DEFINER, GRANT EXECUTE to supabase_auth_admin
  - Hook injects role = student and tenant_id into app_metadata for existing user
  - Student -> devotional_config: 403 (RLS blocks, no non-admin policy)
  - Admin -> devotional_config: visible (admin_all bypass works)

FIX APPLIED DURING BUILD:
  024 initially failed: seed runs AFTER migrations, so Redhouse tenant_devotional did not exist yet.
  Fix: added INSERT ... ON CONFLICT DO NOTHING to 024 before the backfill DO-block.

NOTE: profiles.tenant_id is NULL for new signups (trigger does not set it). App layer must set tenant_id on signup.
D12 STATUS: CLOSED
=== END D12 ===
D13 RESOLVED (Step 7, 2026-07-02): Index mismatch was against a superseded single-table 'tenants' design. Actual 3-table build (tenant_lms, tenant_mobile, tenant_devotional) each has pkey + slug_key. Kind index unneeded (table = kind). Slug lookups indexed via slug_key. Verdict: ACCEPT, no fix.

=== SESSION CLOSE — 2026-07-03 ===
Language recurrence: Chinese-language output recurred 2026-07-03. Working Language rule breached. Runtime-inject fix present on disk but NOT proven live. Carried to next session for cold-start verification.

=== D10 CLOSED — 2026-07-04 ===
STATUS: 6 pgTAP test files written and executed. 33/33 assertions PASS.
Trigger: Section 3 Auth/RLS session.

FILES CREATED:
  supabase/tests/00_rls_enabled.sql               — RLS on 6 tables (6 tests)
  supabase/tests/01_profiles_self_read.sql          — profiles self-read no recursion (3 tests)
  supabase/tests/02_student_devotional_blocked.sql  — student blocked on devotional_config (2 tests)
  supabase/tests/03_admin_devotional_visible.sql    — admin visible (2 tests)
  supabase/tests/04_admin_all_bypass.sql            — admin_all on 5 tenant tables (15 tests)
  supabase/tests/05_jwt_hook_injection.sql          — custom_access_token_hook injects claims (5 tests)

RUN METHOD: docker exec -> psql (supabase db test unavailable — Docker Desktop cannot mount /Users/ce/Documents/)

VERIFIED:
  - RLS ENABLED on profiles, devotional_config, devotional_item, tenant_devotional, tenant_lms, tenant_mobile
  - profiles self-read: auth.uid() = id direct comparison, no subquery recursion
  - No non-admin SELECT policies on devotional_config (students blocked by default)
  - admin_all_devotional_config exists and checks JWT app_metadata -> role = admin
  - admin_all bypass policies on all 5 tenant tables with correct JWT role check
  - custom_access_token_hook exists, is SECURITY DEFINER, EXECUTE granted to supabase_auth_admin
  - Hook injects role = student and tenant_id into app_metadata for existing user
  - Student -> devotional_config: 403 (RLS blocks, no non-admin policy)
  - Admin -> devotional_config: visible (admin_all bypass works)

NEXT: Migration 023 (reserved) — add tenant_id to LMS tables (courses, chapters, enrollments, chapter_progress).

---

## D16 — AI-import guard v2: dynamic require(sdk) coverage
- Status: DEFERRED (backlog)
- Logged: 2026-07-04
- Origin: Blocker 4 / P2-003 CI Hard Rules (commit cece63a)
- Sign-off: Security Lead, confidence 0.85 — original template-string concern RESOLVED
- Gap: guard-ai-import.sh uses grep -E (static text). Catches static import, dynamic import('x'), and template literal import(\`x\`). Does NOT catch variable/ternary-constructed require(sdk), e.g. \`const sdk = cond ? 'openai' : 'anthropic'; require(sdk)\`.
- Why deferred: statically undecidable at grep layer; requires AST-based ESLint rule. Current risk = ZERO (no AI imports exist in codebase; apps/mobile clean).
- Fix path (hardening pass): custom ESLint rule (no-dynamic-ai-import) tracing require/import args to literal string values; wire into ci.yml as required step. Note: runtime-only values (getName(), process.env.SDK) remain undecidable — would need a runtime import hook for full coverage.
- Trigger to action: first time an AI SDK is genuinely added to the codebase.
---