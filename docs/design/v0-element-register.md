# v0 Element Register (Design-Intent Derived)

**SOURCE HONESTY (read this first):** This register was NOT produced from a live
walkthrough of the v0 deployment. The v0 URL
(https://v0-redhouse-dashboard-dso7s4mj2-cecebefree-3976s-projects.vercel.app) is
Vercel-deployment-protection-walled and not agent-fetchable (see docs/design-links.md,
commit 75605f2). Instead it is DERIVED from three on-disk, ground-truth sources:

1. The six frozen design-intent docs in `docs/design/`:
   `05-my-groups.md`, `06-family-variant.md`, `07-teacher-variant.md`,
   `08-report-card-tab.md`, `chat-adjustments.md`, `expo-port-plan.md`.
2. The 17 on-disk mobile `.tsx` scaffolds under `apps/mobile/app` (read verbatim).
3. The live schema in `supabase/migrations/027`–`062` (read verbatim, by CONTENT not by
   the design docs' "PLANNED" labels — the design docs are STALE on group/chat/lead scope;
   the tables shipped in 059/062 but with INCOMPLETE columns).

Where the design docs say "PLANNED (D28)" but the table actually exists, this register
corrects the status to BACKED-or-GAP and notes the delta. No live screenshots were taken;
`docs/design/v0-captures/` is intentionally empty (no screenshots exist).

Status legend used in the backend mapping table:
- **BACKED** — table+column exist in a committed migration (042–062).
- **EF** — served by an Edge Function (`supabase/functions/assign_tenant` is the only EF).
- **GAP-BACKEND** — no table/column/migration exists; requires new backend work.
- **GAP-DESIGN** — element described in design docs but absent from both disk scaffolds
  and schema (design-only intent, no artifact yet).

---

## 1. Screen Inventory (doc ↔ scaffold ↔ schema)

All 11 Phase-1 screens from `expo-port-plan.md §2` map 1:1 to on-disk `.tsx` scaffolds.
No screen exists in v0-only beyond these (we could not verify v0 directly; this is the
scaffold set). Delta: Schedule screen DEFERRED (D31) per expo-port-plan.md §2a — not on disk.

| # | Design doc | On-disk scaffold | Route | Seeded? | Source table (actual) | Status |
|---|-----------|------------------|-------|---------|----------------------|--------|
| 1 | Design 5 (Home) | `app/(tabs)/index.tsx` | `(tabs)/index` | SEED_USER + static | none (static) | SCAFFOLD |
| 2 | Design 7 (Class) | `app/(tabs)/class.tsx` | `(tabs)/class` | SEED_CLASSES | `student_class` (027) | SCAFFOLD |
| 3 | Design 7 (Hub) | `app/(tabs)/hub.tsx` | `(tabs)/hub` | SEED_HUBS | `enrichment_meta` (039) | SCAFFOLD |
| 4 | Design 5+6 (Social/My Groups) | `app/(tabs)/social.tsx` | `(tabs)/social` | SEED_GROUPS | `conversations`+`conversation_members` (059) | SCAFFOLD |
| 5 | Chat (GroupChat) | `app/(tabs)/group-chat.tsx` | `(tabs)/group-chat` | SEED_MESSAGES | `messages` (059) | SCAFFOLD |
| 6 | Chat (GroupInfo) | `app/(tabs)/group-info.tsx` | `(tabs)/group-info` | SEED_GROUPS[0] | `conversations`+`conversation_members` (059) | SCAFFOLD |
| 7 | Design 5 (Profile) | `app/(tabs)/profile.tsx` | `(tabs)/profile` | SEED_USER+SEED_GROUPS | `profiles` (BACKED) | SCAFFOLD |
| 8 | Design 6 (Family — amended 2026-07-23) | `app/(tabs)/family.tsx` | `(tabs)/family` | SEED_USER+SEED_GROUPS | `family_child` (040) + lead/invoice GAP | SCAFFOLD — scaffold predates amendment; visual design deferred to row 40 |
| 9 | Design 7 (Teacher) | `app/(tabs)/teacher.tsx` | `(tabs)/teacher` | SEED_USER+SEED_GROUPS | `conversation_members` (059) | SCAFFOLD |
| 10 | Design 8 (ReportCard) | `app/(tabs)/report-card.tsx` | `(tabs)/report-card` | SEED_CARDS | `report_cards` (043) | SCAFFOLD |
| 11 | ITEM-002 (Certificates) | `app/(tabs)/certificates.tsx` | `(tabs)/certificates` | SEED_CERTS | `certificates` (045/046) | SCAFFOLD |
| — | Schedule (DEFERRED D31) | NOT on disk | — | — | `schedule_slot` (037, PLANNED location/facilitator) | GAP-DESIGN |

On-disk-but-not-in-design-phase-1: `app/(tabs)/class-detail.tsx`, `hub-detail.tsx`,
`group-info.tsx` (counted above as #6), `app/devotional.tsx` (navigates to devotional;
`devotional-gate.tsx` + test exist). These are extra scaffolds beyond the 11-row plan.
No "groups screens exist in v0 but not on disk" can be confirmed (v0 unwalked); the
design's My Groups surfaces (Profile mirror + Social list + GroupInfo) ARE on disk.

All 17 `.tsx` files use `SEED_*` static imports and have ZERO `supabase`/`@redhouse/shared`
imports (grep confirmed: 0 matches) → every screen is SCAFFOLD, none WIRED.

---

## 2. Per-Screen Element / Field Lists (from design docs + scaffold source)

### 1. HomeScreen (Design 5, `index.tsx`)
- Display: greeting (SEED_USER.name), tag (curriculum · stage · "Group A"), devotional
  verse (John 10:10 TPT, hardcoded), coming_up (subject "Mathematics", teacher "Mr. Olivier",
  LIVE badge), news (headline + recency).
- Inputs/forms: NONE. Actions: NONE (read-only). Nav targets: none wired (tab bar only).
- **Section B role-scoping (Design 6 amendment):** Family role sees Verse of the Day tile ONLY.
  Student and teacher roles see all four tiles (Verse, Music, Bible 365, Daily Vlog). Children's
  full Section B is visible inside each child's read-only mirror page.

### 2. ClassScreen (Design 7, `class.tsx`)
- Display (per card): subject, teacher, schedule, location, LIVE badge if status==='live'.
- Source fields named in design: class_subject, class_teacher, class_status_time.
- Inputs/forms: NONE. Nav: card tap unimplemented (no class-detail wiring).

### 3. HubScreen (Design 7, `hub.tsx`)
- Display (per card): title, typeMeta, location, stage, LIVE badge.
- Source fields named in design: hub_title, hub_type_meta, hub_status_time.
- Inputs/forms: NONE.

### 4. SocialScreen (Design 5+6, `social.tsx`)
- Display: "My Groups" header + GroupCard list (name, category badge, lead, lastMessage).
- Empty state: "No conversations yet" / "Groups appear here once you are enrolled".
- Inputs/forms: NONE. Nav: card tap → GroupChat (unimplemented).

### 5. GroupChatScreen (Chat, `group-chat.tsx`)
- Display: message bubbles (senderName, content, timestamp; own vs other styling), send
  states idle/sending/sent/failed (SendIndicator from `components/chat-ui.tsx`).
- Inputs: TextInput "Type a message..." (no validation hint in scaffold).
- Actions: Send button — IMPLIES write to `messages` (GAP-BACKEND: wire to EF/table).
- Empty state: "No messages yet" / "Say hello!".

### 6. GroupInfoScreen (Chat, `group-info.tsx`)
- Display: group name, Badge(category), Group Lead (lead name), Members (count),
  member list (avatar+name+lead badge), media-dial label.
- Controls: Switch media_enabled (lead only in design; scaffold toggles unconditionally).
- Source fields (design): conversations.name, conversations.category,
  conversation_members.is_group_lead→profiles.name, profiles.handle, member count,
  conversations.media_enabled.
- Actions: media-dial toggle — IMPLIES UPDATE conversations.media_enabled (GAP-BACKEND).

### 7. ProfileScreen (Design 5, `profile.tsx`)
- Display: name, role (SEED_USER.role · curriculum · year), grade, school stage, intake;
  "My Groups" mirror (GroupCard list, read-only); quick links (My Certificates, View
  booklist, Contact school, Log out — text only, no handlers).
- Source: profiles (BACKED). Inputs/forms: NONE. Actions: quick links unimplemented.

### 8. FamilyScreen (Design 6 — amended 2026-07-23, `family.tsx`)
- Display (four vertical sections):
  (a) Account Activity — family's own ledger with seeded "coming soon" treatment for invoice/payment fields
  (b) Children — list of linked children (`family_child`, BACKED); tapping a child opens their full read-only mirror page (standard profile + My Groups + Report Cards + Certificates + full Section B)
  (c) My Groups — family's own conversation_memberships, GroupCard list read-only
  (d) Access — standard sticker list of open items
- **No per-child tabs inside family profile.** Child profiles open as separate full pages.
- Source: `family_child` (040, BACKED) for child linkage; `profiles` (BACKED) for child identity;
  ledger from PLANNED lead table (GAP-BACKEND).
- Visual design: DEFERRED to Lovable intake (row 40). Frozen: structure and intent only.
- Inputs/forms: NONE. Write access: NONE (SELECT only per design).
- Home screen Section B role-scoping: family sees Verse of the Day only (no Music, Bible 365, Daily Vlog).

### 9. TeacherScreen (Design 7, `teacher.tsx`)
- Display: "Group Lead controls" header; lead badge (SEED_USER.name); media-dial
  (Text+emoji / All media) + Switch; "My Groups" GroupCard list.
- Source: conversation_members (BACKED table, but is_group_lead column GAP-BACKEND).
- Actions: media-dial toggle (same GAP-BACKEND as #6). Design adds: member list view,
  report queue → Office Desk (GAP-BACKEND, no Office Desk exists).

### 10. ReportCardScreen (Design 8, `report-card.tsx`)
- Display: "Released cards only" subtitle; cards filtered status==='visible' (SEED_CARDS);
  per card: subject, status badge, term, grade.
- Source: report_cards (043, BACKED). Status enum draft/released/visible (field-register 258).
- Inputs/forms: NONE (learner read-only). Teacher INSERT draft / Office release → EF
  (GAP-BACKEND: no release EF beyond assign_tenant).

### 11. CertificatesScreen (ITEM-002, `certificates.tsx`)
- Display: cards (title, status badge, class, signatory, issuedAt).
- Source: certificates (045/046, BACKED). Inputs/forms: NONE.

---

## 3. Registration & Onboarding Surfaces

**CRITICAL FINDING:** The design docs (05–08, chat-adjustments, expo-port-plan) describe
NO sign-up, sign-in, add-student, add-family, consent-collection, or role/teacher
onboarding FORMS. The port plan assumes auth via `src/api/supabase.ts` (which does NOT
exist on disk — no `apps/mobile/src/api/` dir). The only onboarding-adjacent artifacts:

- **Sign-up / tenant assignment:** handled server-side by Edge Function
  `supabase/functions/assign_tenant/` (the ONLY EF). No mobile sign-up form scaffold exists.
- **Consent:** `consent_records` + `suppression_records` tables exist (042), RLS-guarded;
  no consent FORM scaffold on any screen (GAP-DESIGN: no UI surface for consent capture).
- **Handle:** `profiles.handle` column + `handle_changes` audit (062), set ONLY via EF
  `set_handle` (design note) — but `set_handle` EF does NOT exist (only assign_tenant).
  No "set handle" form on disk (GAP-BACKEND: set_handle EF missing).
- **Role/teacher:** role is a `profiles.role` column (BACKED); no teacher-claim form or
  role-assignment UI scaffold (GAP-DESIGN).
- **Add-student / add-family:** `family_child` table (040, BACKED) is the linkage; no
  "add family"/"link child" form scaffold (GAP-DESIGN).
- **Group/cupboard:** no "create group" or "cupboard" surface in design or on disk
  (groups are seed-only in demo; GAP-DESIGN for any group-creation UI).

So the registration/onboarding element list the task expected (sign-up, sign-in,
add-student, add-family, consent, role/teacher, group/cupboard) is ENTIRELY
design-only / backend-only — **no form scaffold exists on disk for any of it**. This is
the largest unbuilt area.

---

## 4. Backend Mapping Table

Legend: BACKED / EF / GAP-BACKEND / GAP-DESIGN (see header).

| Element | Screen | Maps to | Status |
|---------|--------|---------|--------|
| greeting / devotional / coming_up / news | Home | static seed | GAP-DESIGN (no live source) |
| class_subject / class_teacher / class_status_time | Class | `student_class` (027) | GAP-BACKEND (columns not in 027 def; only FK to student_class — subject/teacher/time absent) |
| hub_title / hub_type_meta / hub_status_time / location / stage | Hub | `enrichment_meta` (039) | GAP-BACKEND (table has pace/completed/total/note only; no title/location/stage cols) |
| group_name | Social/GroupInfo/Profile/Family | `conversations.name` | **GAP-BACKEND** — `conversations` (059) has NO `name` column (only category, created_by, tenant_id) |
| group_type / category badge | Social/GroupInfo | `conversations.category` | BACKED (column exists, default 'general') |
| group_lead name | Social/GroupInfo/Teacher | `conversation_members.is_group_lead`→`profiles.name` | **GAP-BACKEND** — `conversation_members` (059) has NO `is_group_lead` column (only role/joined_at/last_read_at) |
| @handle of lead | GroupInfo | `profiles.handle` | BACKED (062 column exists) |
| member count / member list | GroupInfo/Teacher | `conversation_members` (059) | BACKED (table exists; count via query) |
| media_enabled dial | GroupInfo/Teacher | `conversations.media_enabled` | **GAP-BACKEND** — `conversations` (059) has NO `media_enabled` column |
| chat messages (body, sender, timestamp) | GroupChat | `messages` (059) | BACKED (body/sender_id/created_at exist) |
| send message (write) | GroupChat | INSERT `messages` | GAP-BACKEND (no client/EF wiring; only assign_tenant EF exists) |
| child_name / child_role / enrollment_status / core_flag / access_window | Family (child mirror page) | `profiles.*` (name, role, registration_status, has_core, access_starts_at/ends_at) | BACKED (profiles columns) |
| invoice_ref / invoice_amount / payment_status (account activity) | Family | lead table (PLANNED ITEM-004 §1) | **GAP-BACKEND** — no lead/invoice/payment table in 027–062 |
| family↔child linkage | Family | `family_child` (040) — design uses canonical table name | BACKED (table exists; see amendment 2026-07-23) |
| child full Section B (4 tiles) | Family (child mirror page) | deferred to parent design | GAP-DESIGN (mirror inherits child's Home layout) |
| report card (subject/term/grade/status) | ReportCard | `report_cards` (043) | BACKED |
| report release draft→released→visible | ReportCard | EF UPDATE `report_cards` | GAP-BACKEND (no release EF; only assign_tenant) |
| certificate (title/class/signatory/status/issuedAt) | Certificates | `certificates` (045/046) | BACKED |
| tenant assignment on signup | (onboarding) | EF `assign_tenant` | EF (exists) |
| set_handle on profile | (onboarding) | EF `set_handle` (design) | GAP-BACKEND (EF does not exist) |
| consent capture | (onboarding) | `consent_records` (042) | BACKED table / GAP-DESIGN (no form UI) |
| suppression / mute | Chat/Social | `suppression_records` (042) | BACKED table / GAP-DESIGN (no UI) |
| booklist (Profile quick link) | Profile | `booklist`/`booklist_item` (040) | BACKED (no UI wired) |

---

## 5. Shared Components (build once)

On-disk under `apps/mobile/src/components/` (verified present):
- `GroupCard.tsx` — avatar + name + category badge + lead; used by Social, Profile,
  Family, Teacher (4 screens). BUILD ONCE.
- `Badge.tsx` — category badge, 7-color palette; used by GroupInfo + GroupCard.
- `EmptyState.tsx` — per-screen empty messages; used by Social, Profile, Class, Hub,
  GroupChat, ReportCard, Certificates (7 screens). BUILD ONCE.
- `chat-ui.tsx` (exports `SendIndicator`) — send states idle/sending/sent/failed;
  used by GroupChat.
- `devotional-gate.tsx` + `__tests__/devotional-gate.test.tsx` — devotional visibility
  gate (referenced by devotional flow).
- `StatusDot.tsx`, `SendButton.tsx`, `RootNavigator.tsx`, `queries.ts`, `supabase.ts`
  named in expo-port-plan.md §1 — **NOT on disk** (GAP-DESIGN: planned shared components
  not yet created; wiring absent).

---

## GAP LIST (prominent — the only new backend work)

### GAP-BACKEND (schema/EF missing — requires migration or new EF)
1. `conversations.name` column — groups have no display name. (059 ships conversations
   without `name`.) Blocks My Groups / GroupInfo naming on ALL group screens.
2. `conversations.media_enabled` column — media-dial toggle has no backing column.
3. `conversation_members.is_group_lead` column — Group Lead badge / lead controls have
   no backing flag. (Scaffold fakes it via SEED_USER.)
4. Lead/invoice/payment tables — `invoice_ref`, `invoice_amount`, `payment_status`
   (Family ledger "coming soon") have NO table in 027–062.
5. `student_class` display columns — `class_subject`, `class_teacher`, `class_status_time`
   absent from 027 (only FK linkage exists). Class screen is entirely seeded.
6. `enrichment_meta` display columns — `title`, `location`, `stage` absent from 039
   (only pace/completed/total/note). Hub screen entirely seeded.
7. `set_handle` Edge Function — design says handle set only via EF; only `assign_tenant`
   EF exists. 062 column cannot be populated by app.
8. Report-card release Edge Function — draft→released→visible chain (Design 8) has no EF;
   only `assign_tenant` exists. Office release cannot happen.
9. `session_attendance` table — Parked (D22). Removed from Design 6 scope per 2026-07-23 amendment (child mirror page inherits child's screen set; attendance not yet in mobile app).
10. Message send wiring — `messages` INSERT has no client path or EF (GroupChat send is
    a no-op button).

### GAP-DESIGN (element in design docs, no scaffold + no schema + no form)
11. Sign-up / Sign-in forms — zero onboarding UI on disk; auth assumed via nonexistent
    `src/api/supabase.ts`.
12. Add-student / Add-family / link-child forms — `family_child` exists but no UI to link.
13. Consent capture form — `consent_records` table exists, no capture UI.
14. Role/teacher claim form — `profiles.role` exists, no assignment UI.
15. Group-creation / cupboard surface — not in design or disk.
16. Schedule screen — deferred (D31), no design, no scaffold.
17. Planned shared components not created: `StatusDot.tsx`, `SendButton.tsx`,
    `RootNavigator.tsx`, `api/supabase.ts`, `api/queries.ts`.

### STALE-DESIGN CORRECTIONS (design docs say PLANNED; actually BACKED)
- `conversations`, `conversation_members`, `messages`, `chat_preferences` — design
  `05-my-groups.md`/`chat-adjustments.md` say "PLANNED (D28)"; actually shipped in
  `059_chat_tables.sql`. Corrected above to BACKED (with column gaps noted).
- `family_student_link` (design) = `family_child` (040) — name mismatch; resolved in 2026-07-23 amendment.
  Canonical name is `family_child`.

### DESIGN-AMENDED (superseded by Cece ruling 2026-07-23)
- **Design 06: Family variant.** Original 2026-07-15 version ("ledger + per-child records") ruled
  FAIL-AS-WRITTEN after browser walk. Superseded by new design: four-section Family Profile
  (Account Activity, Children list → full-page child mirror, My Groups, Access).
  Per-child tabs removed. Section B role-scoping rule added. Visual design deferred to row 40.
  See docs/design/06-family-variant.md for the amended design.

---

*Generated READ-ONLY from docs/design/*.md + apps/mobile/app/** + supabase/migrations/027–062.
No live v0 walkthrough performed (auth-walled). No edits outside this file. Commit pending
human ratification per standing audit rules (AR-9: checkbox/status flips only in/after a
sealing commit citing the hash).*
