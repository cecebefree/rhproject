# ITEM-009 — Design Freeze

| Field | Value |
|-------|-------|
| **Status** | FROZEN |
| **Frozen by** | Cece (explicit approval, 2026-07-15) |
| **Scope** | Designs 5–8 + chat adjustments (v0 iteration) |
| **Post-freeze rule** | Changes require a new governance ruling — no silent edits during Expo port or wiring |

---

## Frozen Designs

| # | Design | File | Key schema dependencies |
|---|--------|------|------------------------|
| 5 | My Groups block on Profile | docs/design/05-my-groups.md | conversations.category (PLANNED, D28), conversation_members (PLANNED) |
| 6 | Family variant (ledger + per-child) | docs/design/06-family-variant.md | family_student_link (PLANNED), invoice/payment fields (PLANNED) |
| 7 | Teacher variant (content swap) | docs/design/07-teacher-variant.md | conversation_members.is_group_lead (PLANNED) |
| 8 | Report Card tab (status chain) | docs/design/08-report-card-tab.md | report_cards.status (BACKED: draft, released, visible) |
| + | Chat adjustments | docs/design/chat-adjustments.md | conversations.media_enabled (PLANNED, D28) |

## Fix-Up Corrections Applied (pre-freeze)

| # | Correction | Detail |
|---|-----------|--------|
| 1 | Rename | conversations.classification changed to conversations.category; classification reserved for structural axes (stage/grade/department/zone) |
| 2 | Status chain defect | Three-state enum confirmed (draft/released/visible); released is transient - advances to visible in one Edge Function transaction; R18 reconciled |
| 3 | Chat trim | Delivered state (double checkmark) deleted - not in R16 or ITEM-001; logged as D29 (post-demo candidate) |
| 4 | Ledger rendering | Invoice/payment fields rendered as statically seeded coming soon section (Option a) for demo |
| 5 | Group info view | Complete spec delivered: member list, category badge, lead, count, media-dial, mute/leave confirmed on Social page |

## Deferred Register Additions

| # | Item | Trigger | Status |
|---|------|---------|--------|
| D28 | conversations.category + conversations.media_enabled | When conversations table migrated | Open |
| D29 | Delivered state (double checkmark, Presence-based ack) | Post-demo | Parked |

## Governance Note

This freeze was preceded by a bounded context load (field-register, mobile phase plan, R16-R18, ITEM-001, ITEM-002, ITEM-004), a v0 design iteration, a fix-up pass approved by Cece, and this freeze declaration.

Frozen means frozen. The Expo port (Item 24) and wiring phase must not alter these designs without a new governance ruling from Cece.
