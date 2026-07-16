# Wiring Plan v1 — Chat Tables + Consent Integration

**Status:** DRAFT — awaiting Cece ruling
**Date:** 2026-07-15
**Scope:** conversations, conversation_members, messages + D28 category guard + Item 33 sequencing
**Lesson applied:** ITEM-024 checkpoint protocol — numbered gates, individually gated, evidence required

---

## 1. Migration Sequence

### Step 1: Item 33 — Consent + Suppression (migration 042)

**Already exists** in field-register as migration 042 (consent_records, suppression_records).

**Placement rationale:** Consent must precede chat tables. RLS policies on chat tables reference consent status (e.g., communications consent for messaging). If chat tables land first, consent checks have no data to gate against.

**Action:** Verify migration 042 is applied. If not yet applied to local Supabase, run it. No schema changes — tables already defined in field-register lines 217-247.

**Evidence:** `supabase db diff` shows no drift from field-register schema.

### Step 2: Chat Tables (new migration — 054)

**Tables (per ITEM-001 consolidated Phase C scope):**

#### conversations

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| name | text NOT NULL | Group name or DM identifier |
| mode | text NOT NULL DEFAULT 'chat' | CHECK: chat, live (live reserved Phase 2) |
| category | text NOT NULL | CHECK: core, enrichment, club, social, school, staff, family |
| media_enabled | boolean NOT NULL DEFAULT false | Media dial — text+emoji only (demo default) |
| created_by | uuid NOT NULL REFERENCES profiles(id) | |
| tenant_id | uuid NOT NULL | FK to tenant_lms(id) |
| created_at | timestamptz NOT NULL DEFAULT now() | |
| updated_at | timestamptz NOT NULL DEFAULT now() | |

**RLS:** (see Section 3)

#### conversation_members

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| conversation_id | uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE | |
| user_id | uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE | |
| is_group_lead | boolean NOT NULL DEFAULT false | ITEM-001 S3 — mandatory accountable lead |
| is_muted | boolean NOT NULL DEFAULT false | Suppress push/badge |
| is_archived | boolean NOT NULL DEFAULT false | Cosmetic hide |
| joined_at | timestamptz NOT NULL DEFAULT now() | |
| tenant_id | uuid NOT NULL | |

**UNIQUE:** (conversation_id, user_id)
**RLS:** (see Section 3)

#### messages

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| conversation_id | uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE | |
| sender_id | uuid NOT NULL REFERENCES profiles(id) | |
| content | text NOT NULL | ~4k char cap |
| type | text NOT NULL DEFAULT 'text' | CHECK: text, emoji, image, video, attachment |
| created_at | timestamptz NOT NULL DEFAULT now() | |
| updated_at | timestamptz NOT NULL DEFAULT now() | |
| tenant_id | uuid NOT NULL | |

**RLS:** (see Section 3)

#### message_reactions

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| message_id | uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE | |
| user_id | uuid NOT NULL REFERENCES profiles(id) | |
| emoji | text NOT NULL | Unicode emoji |
| created_at | timestamptz NOT NULL DEFAULT now() | |
| tenant_id | uuid NOT NULL | |

**UNIQUE:** (message_id, user_id, emoji)
**RLS:** (see Section 3)

#### chat_preferences

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE | |
| notification_level | text NOT NULL DEFAULT 'all' | CHECK: all, mentions, digest |
| tenant_id | uuid NOT NULL | |

**UNIQUE:** (user_id)
**RLS:** (see Section 3)

### Step 3: Handle System (new migration — 055)

#### profiles.handle addition

| Column | Type | Notes |
|--------|------|-------|
| handle | text UNIQUE | 3-20 chars, [a-z0-9_], no leading digit |

**Index:** UNIQUE on handle (case-insensitive)
**Reserved-word blocklist:** admin, office, redhouse, staff, help, ...

#### handle_changes

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid NOT NULL REFERENCES profiles(id) | |
| old_handle | text NOT NULL | |
| new_handle | text NOT NULL | |
| changed_at | timestamptz NOT NULL DEFAULT now() | |

**RLS:** self_select, admin_all

---

## 2. D28 — Category Guard (Display/Sort Only)

### Problem

`conversations.category` is a 7-value domain (core, enrichment, club, social, school, staff, family). Design 5 and chat-adjustments specify it is display-only and sort-only — no behavioral branching on this field.

### Guard Approach

**Guard clause in RLS policies:** No RLS policy references `category` for access control. All access decisions are based on:

- `conversation_members.user_id = auth.uid()` (membership)
- `conversation_members.is_group_lead = true` (lead status)
- `tenant_id = JWT tenant_id` (tenant scoping)

**Application-layer guard:** A CI check or lint rule that fails if any query uses `WHERE category = ...` or `CASE category ...` for branching. This is a future hardening task (post-MVP), not a blocking gate.

**Seed-level enforcement:** The seed data uses all 7 categories for display testing. No screen renders differently based on category value — only the badge color changes (cosmetic).

### Acceptance Criterion

No RLS policy or Edge Function branches on `conversations.category`. The field is read from the conversations row and passed to the Badge component for display only.

---

## 3. RLS Policies (Per Tenant-Scoping Doctrine)

### Doctrine (from AGENTS.md + migration 053)

1. Every tenant-scoped policy MUST use: `auth.jwt() -> 'app_metadata' ->> 'tenant_id'` (path from custom_access_token_hook)
2. Row `tenant_id` must match JWT tenant: `row.tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid`
3. SELECT policy MUST exist wherever UPDATE exists (PG17 read-phase rule)
4. admin_all bypass for role=admin

### Policy Matrix

**Note:** "JWT" in the table below is shorthand for `(auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid`. The actual migration will use the full expression.

#### conversations

| Operation | Policy Name | USING | WITH CHECK |
|-----------|-------------|-------|------------|
| SELECT | conv_member_select | EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = id AND user_id = auth.uid()) AND tenant_id = JWT | — |
| INSERT | conv_admin_insert | role = admin AND tenant_id = JWT | tenant_id = JWT |
| UPDATE | conv_lead_update | EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = id AND user_id = auth.uid() AND is_group_lead = true) AND tenant_id = JWT | tenant_id = JWT |
| DELETE | conv_admin_delete | role = admin AND tenant_id = JWT | — |

#### conversation_members

| Operation | Policy Name | USING | WITH CHECK |
|-----------|-------------|-------|------------|
| SELECT | cm_member_select | EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = conversation_id AND cm.user_id = auth.uid()) AND tenant_id = JWT | — |
| INSERT | cm_lead_insert | EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = conversation_id AND cm.user_id = auth.uid() AND cm.is_group_lead = true) AND tenant_id = JWT | tenant_id = JWT |
| UPDATE | cm_lead_update | EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = conversation_id AND cm.user_id = auth.uid() AND cm.is_group_lead = true) AND tenant_id = JWT | tenant_id = JWT |
| DELETE | cm_self_delete | user_id = auth.uid() AND tenant_id = JWT | — |

#### messages

| Operation | Policy Name | USING | WITH CHECK |
|-----------|-------------|-------|------------|
| SELECT | msg_member_select | EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = conversation_id AND user_id = auth.uid()) AND tenant_id = JWT | — |
| INSERT | msg_member_insert | EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = conversation_id AND user_id = auth.uid()) AND tenant_id = JWT | sender_id = auth.uid() AND tenant_id = JWT |
| UPDATE | msg_sender_update | sender_id = auth.uid() AND tenant_id = JWT | tenant_id = JWT |
| DELETE | msg_admin_delete | role = admin AND tenant_id = JWT | — |

#### message_reactions

| Operation | Policy Name | USING | WITH CHECK |
|-----------|-------------|-------|------------|
| SELECT | mr_member_select | EXISTS (SELECT 1 FROM conversation_members cm JOIN messages m ON cm.conversation_id = m.conversation_id WHERE m.id = message_id AND cm.user_id = auth.uid()) AND tenant_id = JWT | — |
| INSERT | mr_member_insert | EXISTS (SELECT 1 FROM conversation_members cm JOIN messages m ON cm.conversation_id = m.conversation_id WHERE m.id = message_id AND cm.user_id = auth.uid()) AND tenant_id = JWT | tenant_id = JWT |
| DELETE | mr_self_delete | user_id = auth.uid() AND tenant_id = JWT | — |

#### chat_preferences

| Operation | Policy Name | USING | WITH CHECK |
|-----------|-------------|-------|------------|
| SELECT | cp_self_select | user_id = auth.uid() AND tenant_id = JWT | — |
| INSERT | cp_self_insert | user_id = auth.uid() AND tenant_id = JWT | user_id = auth.uid() AND tenant_id = JWT |
| UPDATE | cp_self_update | user_id = auth.uid() AND tenant_id = JWT | tenant_id = JWT |

---

## 4. Seed-to-BACKED Transition

### Mapping Per Screen

| Screen | Seed Table | BACKED Table | Transition Step |
|--------|------------|--------------|-----------------|
| HomeScreen | user.ts | profiles | Step 1 (already BACKED) |
| ClassScreen | classes.ts | conversations + conversation_members | Step 2 |
| HubScreen | hubs.ts | conversations + conversation_members | Step 2 |
| SocialScreen | groups.ts | conversations + conversation_members | Step 2 |
| GroupChatScreen | messages.ts | messages | Step 2 |
| GroupInfoScreen | groups.ts | conversations + conversation_members | Step 2 |
| ProfileScreen | user.ts + groups.ts | profiles + conversations + conversation_members | Step 2 |
| FamilyScreen | user.ts + groups.ts | profiles + conversations + conversation_members | Step 2 |
| TeacherScreen | user.ts + groups.ts | profiles + conversations + conversation_members | Step 2 |
| ReportCardScreen | cards.ts | report_cards | Step 1 (already BACKED) |
| CertificatesScreen | certs.ts | certificates | Step 1 (already BACKED) |

### Transition Logic

**Step 1 (already done):** HomeScreen, ReportCardScreen, CertificatesScreen read from BACKED tables (profiles, report_cards, certificates). Seed files exist for fallback/demo only.

**Step 2 (chat tables):** 9 screens flip to conversations/conversation_members/messages. Seed files become fallback for offline/demo mode.

---

## 5. Item 33 Sequencing

### Current State

Migration 042 (consent_records + suppression_records) is defined in field-register but may not be applied to local Supabase yet.

### Placement in Wiring Arc

**Gate 1 (this plan):** Verify migration 042 exists in field-register and is ready.
**Gate 2 (before chat tables):** Apply migration 042 to local Supabase. Verify consent_records and suppression_records tables exist with correct RLS.
**Gate 3 (chat tables):** Apply migration 054 (chat tables). Chat RLS policies can reference consent_records if needed (e.g., communications consent gate).

### Why Consent First

Chat messaging requires communications consent. If a user has not given communications consent, they should not be able to send messages. The consent check is a future Edge Function gate (post-MVP), but the data must exist before chat tables reference it.

---

## 6. Checkpoint Structure

### Gate 1 — Plan Approval (this document)

**STOP.** Cece reviews and rules on:

- Migration sequence (042 -> 054 -> 055)
- D28 guard approach (display/sort only)
- RLS policy matrix
- Seed-to-BACKED transition mapping

**Evidence required:** Cece "approved" message.

### Gate 2 — Migration 042 Verified

**STOP.** Verify:

- consent_records table exists with correct schema
- suppression_records table exists with correct schema
- RLS policies active (consent_self_select, consent_self_insert, consent_self_withdraw, consent_admin_all)
- `supabase db diff` shows no drift

**Evidence required:** `supabase db diff` output, table existence query, RLS policy list.

### Gate 3 — Chat Tables Applied

**STOP.** Verify:

- conversations, conversation_members, messages, message_reactions, chat_preferences tables exist
- All RLS policies active per matrix
- `supabase db diff` shows no drift from field-register

**Evidence required:** `supabase db diff` output, table existence queries, RLS policy list.

### Gate 4 — Handle System Applied

**STOP.** Verify:

- profiles.handle column added with UNIQUE index
- handle_changes table exists
- Reserved-word blocklist enforced

**Evidence required:** `supabase db diff` output, handle uniqueness test.

### Gate 5 — Seed-to-BACKED Transition

**STOP.** Verify:

- 9 screens now read from BACKED tables
- Seed files retained as fallback
- All screens still render (no regressions)

**Evidence required:** Screen render audit, tsc --noEmit clean.

### Gate 6 — Integration Test

**STOP.** Verify:

- End-to-end: create conversation -> add members -> send message -> receive message
- RLS: tenant isolation verified (user in tenant A cannot read tenant B data)
- Consent gate: user without communications consent cannot send messages (future Edge Function, not this arc)

**Evidence required:** Test output, RLS isolation proof.

---

## 7. What This Plan Does NOT Cover

- Edge Functions (disposal layer) — post-MVP
- Realtime Broadcast wiring — post-MVP
- Media upload (image/video/attachment) — post-MVP
- DM permissions (teacher<->learner, learner<->learner gated on item 44) — post-MVP
- Push notifications (Capacitor Phase 2) — post-MVP
- reconnect-reconciliation test (ITEM-001 acceptance criterion) — post-MVP

---

## 8. Commit Sequence

| Step | Migration | Content |
|------|-----------|---------|
| 1 | 042 (verify) | consent_records + suppression_records |
| 2 | 054 | conversations, conversation_members, messages, message_reactions, chat_preferences |
| 3 | 055 | profiles.handle + handle_changes |
| 4 | 056 | RLS policies for all chat tables |

---

Plan authored: 2026-07-15
Awaiting Cece ruling before any code.
