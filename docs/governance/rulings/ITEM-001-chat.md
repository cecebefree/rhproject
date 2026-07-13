# ITEM-001 — Ruling: Group Chat

Consolidated block. Supersedes all prior unpasted blocks from this session.

**Status:** Sealed — 2026-07-13
**Defect:** DEFECT-001 (attached below)

---

## 1. ARCHITECTURE — BUY, NOT BUILD (ORIGINAL — SUPERSEDED BY DEFECT-001)

> **NOTE:** Section 1 of the original Item 1 ruling is REPLACED by DEFECT-001 below.
> The chat architecture is now BUILD on Supabase Realtime. This section is retained
> for audit trail only.

- Chat was a third-party managed provider (Stream/SendBird/TalkJS class),
  embedded as a profile-linked section. Provider = skin; spine retains
  all authority (Deterministic Spine, Intelligent Skin doctrine).
- chat_identities mapping (user_id ↔ provider_user_id) lives in our
  schema under RLS.
- Provider tokens are minted by an Edge Function ONLY — the client
  never holds provider secrets.
- Group membership and permissions are spine-authoritative and PUSHED
  to the provider; the provider never originates authority.

*(Superseded by DEFECT-001 — see below.)*

## 2. GROUP MODEL — SEVEN SEED CATEGORIES, FINAL FOR MVP

Bound to the established group model: NO group_type enum — behavior
derives from group_connections + classification attributes.

  - **Core**        membership from student_class enrolment (Cam/IB/Home)
  - **Enrichment**  membership from Sup enrolment; open_to_outside honored
  - **Club**        membership from Sup enrolment; open_to_outside honored
  - **Social**      ad-hoc, user-created; provider-native behavior
  - **School**      all active users auto-joined; broadcast-only,
                    Office Desk posts. (Newsletter CONTENT remains an
                    off-LMS reference link; School group is the broadcast
                    channel only.)
  - **Staff**       role = teacher/staff; open within role
  - **Family**      role = family/guardian; broadcast + reply-to-office

Any eighth category requires a DEFECT filing per R1. A flat "Learners"
group is explicitly DISSOLVED — learner chat exists only within
enrolment-derived groups.

Role-based groups (School/Staff/Family) auto-join at activation
(approved → active transition, Office Desk pipeline).

Entry surface: "My Groups" — Social page primary, Profile read-only
mirror, per standing mobile design.

## 3. GROUP LEADERSHIP — MANDATORY ACCOUNTABLE LEAD

- Every group has exactly ONE Group Lead — mandatory, accountable;
  seed-time invariant (no group activates leadless).
- Additional moderating members are marked via a `lead` flag on the
  membership record — an attribute, not a role table or group type.
- Lead status is spine-authoritative under RLS; Edge Function mirrors
  it to the provider as moderator rights.
- Defaults: Core → class teacher; Enrichment/Club → host teacher;
  Social → creator; School/Staff/Family → Office Desk designates.
- UI: "Lead" badge rendered for all lead-flagged members.

## 4. SAFEGUARDING GATE

- Minor posting rights in ALL categories remain broadcast/read-only
  until AO-safeguarding (item 44) closes.
- When item 44 closes, learner posting unlocks ONLY into lead-moderated
  rooms — never unmoderated channels.

## 5. COMPLIANCE (ORIGINAL — SUPERSEDED BY DEFECT-001)

> **NOTE:** This section is superseded by DEFECT-001. No external provider
> means no new children's-data processor. Retained for audit trail.

- The chat provider is a data PROCESSOR handling children's data →
  must be named in the AO-005 DPIA and disclosure copy (item 14).
- Vendor selection prefers UK/EU data residency + signed DPA.
- Vendor selection is a build-time task, not a ratification matter.

*(Superseded by DEFECT-001 — DPIA scope simplified.)*

## 6. PHASE C MIGRATION SCOPE (ORIGINAL — REPLACED BY CONSOLIDATED SCOPE DELTA BELOW)

> **NOTE:** Scope replaced by DEFECT-001 consolidated delta. Retained for audit trail.

- chat_identities table (user_id ↔ provider_id, RLS)
- group seeds per the seven-category model, membership-derived
- membership record: is_group_lead (singular, enforced) + lead flag
- chat_preferences role defaults on profile, user-editable

*(Replaced by DEFECT-001 consolidated scope delta below.)*

---

## DEFECT-001 — BUILD OVER BUY

**Filed:** 2026-07-13
**Evidence:** cost/scale/architecture analysis. Provider path adds a
children's-data processor, a membership sync pipeline, and a
recurring cost line; all ruled requirements (derived contacts,
My Groups access, differential DM permissions, handle search) are
spine-data features better served natively.
**Cross-reference:** `defects/DEFECT-001.md`

### AMENDED ARCHITECTURE — Section 1 of Item 1 REPLACED

  - Chat is **BUILT** on Supabase Realtime (Broadcast + Presence),
    already in-stack. No external chat provider.
  - `chat_identities` table **DELETED** from Phase C scope.
  - Tables: `conversations`, `conversation_members`, `messages` —
    RLS-governed, Edge Functions as disposal layer.
  - DM = 2-member conversation. Open-DM rights are RLS rules:
    teacher↔learner allowed (logged), learner↔learner **GATED** on
    item 44, family↔office allowed, learner↔arbitrary-adult denied.
  - Contacts are **DERIVED**: union of members across a user's groups.
    No friend requests. Safeguarding boundary = enrolment graph.
  - Optimistic UI required for perceived-instant send. Push via
    Capacitor (Phase 2) for closed-app delivery.

Sections 2–4 of Item 1 (seven seed categories, mandatory Group
Leads, safeguarding gates) stand **UNCHANGED** — spine-authoritative
by design.

**Compliance effect:** NO new children's-data processor; DPIA
(item 14) scope simplified.

### ENGINEERING CONDITIONS (evidence-ratified, binding)

1. **BROADCAST ONLY** — Realtime Broadcast is the sole push primitive.
   Postgres Changes is **PROHIBITED** for chat delivery (documented
   production ordering/latency failures).
2. **PERSIST-FIRST** — every message is a committed row before
   broadcast; clients reconcile via refetch on reconnect. The
   WebSocket is never the source of truth.
3. **SCALE TRIGGER** — sustained concurrent connections at ~400 (80%
   of Pro envelope) auto-opens a delivery-layer review (tier
   upgrade or provider migration). Until then, no provider.

**Acceptance criterion:** reconnect-reconciliation test in the
pgTAP/E2E suite — kill the socket mid-send, verify zero message
loss.

### CONVERSATION CONTROLS (per-user, RLS-governed)

  - **Mute** (per conversation): suppresses push/badge; delivery
    unchanged
  - **Block** (per user, DMs): bidirectional DM prevention; NO data
    deletion; minor-blocks-adult raises silent Office Desk flag
  - **Report** (per message/user): routes to Group Lead + Office Desk
    queue; companion control to item 44
  - **Leave**: Social groups + DMs only. Enrolment/role-derived groups
    (Core, Enrichment, Club, School, Staff, Family) are NOT
    leavable — mute is the escape valve
  - **Notification prefs**: chat_preferences (all/mentions/digest),
    role-seeded defaults per Item 1
  - **Archive**: cosmetic hide, no data change

### MESSAGE TYPES (messages.type + Storage rules)

  - **text**: ~4k char cap; no link unfurl in minors' rooms
  - **emoji**: unicode in text + message_reactions table
  - **image**: Storage RLS bucket, ~10MB cap, EXIF/GPS stripped
    server-side
  - **video**: ~50MB cap, no transcoding at MVP
  - **attachment**: whitelist (pdf/docx/xlsx/pptx), ~20MB cap,
    executables denied

**Graduated media dial:** post-item-44 learner default = text+emoji;
image/video/attachment enabled per room by Group Lead toggle
(one boolean per conversation).

**Edit/delete:** delete-for-self anytime; delete-for-everyone within
15 min (tombstone shown); lead removal hides message but retains
original in audit log. Removal hides, never destroys.

### USER HANDLES — DUAL-KEY IDENTITY DOCTRINE

Handle search **PROMOTED** from backlog to Phase C scope.

  - **User number** (RH-YYYY-NNNNN): immutable institutional key.
    Login, role filtering, cross-app identity, exam-concierge,
    office pipeline. **UNCHANGED.** Not visible in chat surfaces.
  - **Handle (@name):** social-layer identity. Chat display, mentions,
    contact search, DM addressing. Mutable, rate-limited.
  - Handle **NEVER** replaces the user number. All FKs remain on
    user_id/user number. Handle resolves to the same profile row.

Handle rules:
  - profiles.handle: unique, case-insensitive, 3–20 chars,
    [a-z0-9_], no leading digit; reserved-word blocklist
    (admin, office, redhouse, staff, help, ...)
  - Auto-generated default at provisioning (name + suffix);
    user-changeable, max 2 changes per 90 days
  - Released handles: 30-day cooldown before reclaim
    (anti-impersonation)
  - Minors: in-graph-only search resolution. Staff/office:
    school-wide searchable
  - handle_changes audit table (old, new, timestamp); historical
    messages always resolvable to real identity via user number

### AVATAR UNIFICATION + BROADCAST STAGING

**Avatar — SINGLE SOURCE:**
  - Chat avatar = users_profiles avatar. No separate chat avatar,
    no per-conversation picture, no in-chat avatar upload.
  - Chat surfaces render by JOIN to profile, never by copy;
    profile change propagates everywhere instantly.
  - Chat identity display = avatar + display name + @handle, all
    from one profile row.
  - Avatar moderation is profile-level, once — single
    safeguarding surface.

**Live broadcast — PHASE 2**, with Phase 1 readiness variant:
  - Phase 1 ships **CHAT ONLY**. No streaming infra, no WebRTC, no
    recording, no vendor work.
  - Phase 1 readiness provisions (binding, near-zero cost):
      * conversations.mode column: 'chat' (default) | 'live'
        (reserved)
      * Group Lead flag = future broadcast-host right
      * Presence primitive = future viewer-count/live-indicator
      * Media dial (message types) extends to future 'live' toggle
  - Streaming layer selection is a Phase 2 decision with Phase 2
    evidence. No pre-commitment.

### CONSOLIDATED PHASE C SCOPE DELTA

**ADDED:**    conversations (with mode column), conversation_members
              (with control columns + is_group_lead), messages (with
              type column), message_reactions, chat_preferences,
              profiles.handle + unique index + reserved list,
              handle_changes audit table, media-toggle boolean per
              conversation, Storage buckets + policies (image/video/
              attachment)

**DELETED:**  chat_identities

**UNCHANGED:** seven seed categories, Group Lead mandate,
              item 44 safeguarding gate

---

Signed: Cece -- final human gate. 2026-07-13.
