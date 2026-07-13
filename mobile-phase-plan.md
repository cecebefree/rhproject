# Mobile Phase Plan — MVP Build

**Status:** READY — awaiting Cece's OK-to-build
**Created:** 2026-07-13
**Authority:** Cece (final human gate)
**Consumes:** docs/spec/front-desk-registration.md (registered input)
**Cross-refs:** docs/governance/rulings/ITEM-001-chat.md, ITEM-002-certificates.md, BUILD-R16-R18-demo-scope.md
**Parallel track:** P2-026 (student_class tenant_id), D19 (Expo bootstrap fix), devotional content build

---

## PHASE 1 — CORE SCREENS (Items 5–8)

### Item 5 — My Groups block
**Deliverable:** Social page "My Groups" section with group list, lead badge, mute/leave controls.

- Schema: conversations, conversation_members (with is_group_lead, mute, leave)
- RLS: group membership derived from enrolment graph
- UI: Group card (avatar + display name + @handle + lead badge), mute toggle, leave button
- Demo scope per R16: one Core class group, text+emoji only, Broadcast-only + persist-first
- No DMs, media, conversation controls at demo (post-demo per ITEM-001)

### Item 6 — Family ledger variant
**Deliverable:** Family role view of My Groups and child activity summary.

- Family group: broadcast + reply-to-office per ITEM-001 §2
- Ledger: read-only view of linked child's groups, attendance summary
- No write access to child data (RLS-enforced)
- Post-MVP: full family app (separate session)

### Item 7 — Teacher variant
**Deliverable:** Teacher/staff view with Group Lead controls and class management.

- Group Lead badge + moderation tools per ITEM-001 §3
- Class roster view (Core group members)
- Media dial toggle per conversation (text+emoji only at demo, image/video post-item-44)
- No student impersonation; RLS enforce role boundaries

### Item 8 — Report Card tab states
**Deliverable:** Report Card screen with seeded released card + live write→release cycle per R18.

- States: draft (teacher) → released (office) → visible (learner)
- Seeded baseline card for demo
- Live walkthrough: teacher draft → office release → released-only visibility
- Supports item 44 adversarial pass

---

## PHASE 2 — SUPPLEMENTARY SCREENS

### Item 9 — My Certificates tab
**Deliverable:** Records tab with one seeded Enrichment cert PDF per R17.

- Supabase Storage bucket, RLS-governed signed URL
- Generation engine, templates, QR verify are post-demo per ITEM-002
- Status states: available, pending, unavailable

### Item 10 — Chat controls
**Deliverable:** Full conversation controls per ITEM-001 (mute, block, report, archive, notification prefs).

- chat_preferences table (all/mentions/digest) with role-seeded defaults
- Block: bidirectional DM prevention, minor-blocks-adult raises Office Desk flag
- Report: routes to Group Lead + Office Desk queue
- Message types: text, emoji, reactions (image/video/attachment gated on item 44)
- Edit/delete: self anytime, for-everyone 15min window, lead removal (tombstone)

### Item 11 — Handle management
**Deliverable:** Handle (@name) display, auto-generation, change UI, search resolution.

- profiles.handle column + unique index + reserved word blocklist
- Handle change audit table (handle_changes)
- Minor: in-graph-only search; staff: school-wide searchable
- Released handle 30-day cooldown

---

## PHASE 3 — DESKS (Front, Office, School)

Per registration spec (docs/spec/front-desk-registration.md):

### Item 12 — Front Desk
**Deliverable:** Lead management (enquiry → qualified → invoiced), intake triage, callback queue.

- Lead table (Front Desk-owned, tenant-scoped)
- Web intake from Lovable form → lead table
- Mock payment trigger for demo conversion
- RLS: Front Desk read/write on leads, read-only on core registration

### Item 13 — Office Desk
**Deliverable:** Core registration status transitions via Edge Functions.

- States: pending_init → pending_review → approved → active + withdrawn/rejected
- Edge Function catalogue per transition
- Data retention disclosures in registration UI

### Item 14 — School Desk
**Deliverable:** Consume approved/active registrations for class placement.

- Read-only on registration status
- Class placement UI after Office approval

---

## REGISTERED INPUTS

| Input | Source | Status |
|-------|--------|--------|
| Front Desk registration spec | docs/spec/front-desk-registration.md (d64bb05) | Sealed |
| Chat ruling (ITEM-001 + DEFECT-001) | docs/governance/rulings/ITEM-001-chat.md | Sealed |
| Certificates ruling (ITEM-002) | docs/governance/rulings/ITEM-002-certificates.md | Sealed |
| Demo scope (R16-R18) | docs/governance/rulings/BUILD-R16-R18-demo-scope.md | Sealed |
| P2-026 (student_class tenant_id) | .swarm/deferred.md | Open |
| D19 (Expo bootstrap fix) | .swarm/deferred.md | Open |

---

## GATES

| Gate | Phase | Condition |
|------|-------|-----------|
| Item 44 safeguarding | Post-demo | Learner posting unlocks into lead-moderated rooms only |
| DESIGN FREEZE (item 32) | Before Phase 2 | Requires explicit Cece sign-off |
| R16 reconnect-reconciliation test | Phase 1 close | Kill socket mid-send, verify zero message loss |
| QR verify + generation engine | Post-demo per ITEM-002 | Not in Phase 1 scope |

---

## COMPLIANCE RULES

| Rule | Enforced |
|------|----------|
| One phase at a time | Yes |
| Report after each item | Yes |
| Fix errors in-session | Yes |
| No DESIGN FREEZE without explicit sign-off | Yes |
| Reviewer delegation mandatory on coder tasks | Yes |
| RLS positive + negative cases per item 21 test bar | Yes |

---

**OK-TO-BUILD AWAITING CECE. No work will begin until confirmed.**

Signed: Architecture Lead. 2026-07-13.
