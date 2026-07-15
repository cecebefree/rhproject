# Chat Adjustments (Send/Connection States, Empty States, Group Info View)

**Status:** FROZEN — ITEM-009 design freeze, 2026-07-15
**Frozen by:** Cece (explicit approval)
**Cross-ref:** ITEM-001-chat.md, R16

---

## Send States

| State | UI | Condition |
|-------|----|-----------|
| **Idle** | Default — input enabled, send button active | WebSocket connected |
| **Sending** | Message bubble with spinner (optimistic UI) | After user taps send, before DB commit |
| **Sent** | Single checkmark | DB committed, broadcast dispatched |
| **Failed** | Red retry icon | Broadcast failed or reconnect timeout |

**Not in scope (post-demo, D29):** Delivered state (double checkmark via Presence ack). Requires Presence subscriber count per message; not in R16 or ITEM-001 scope.

## Connection States

| State | UI | Condition |
|-------|----|-----------|
| **Connected** | Green dot (subtle) | WebSocket active |
| **Reconnecting** | Amber dot + "Reconnecting..." | Socket dropped, auto-retry |
| **Offline** | Red dot + "Offline — messages will send when connected" | No network or max retries exceeded |

## Empty States

| Screen | Empty message |
|--------|---------------|
| My Groups (Profile) | "No groups yet — you'll be added during onboarding" |
| My Groups (Social) | "No conversations yet" |
| Group chat view | "No messages yet — say hello!" |
| Contacts | "No contacts yet — they appear when you join groups" |
| Report Card tab | "No report cards available yet" |
| Certificates tab | "No certificates yet" |
| Family → Child Records | "No linked children — contact the office to set up family access" |

## Group Info View

**Entry:** Tap group header in chat view → Group Info screen.

### Layout

| Element | Source | Notes |
|---------|--------|-------|
| Group name | conversations.name | **PLANNED** |
| Group category badge | conversations.category | **PLANNED** — display only, no branching |
| Group lead name | conversation_members WHERE is_group_lead = true → JOIN profiles.name | **PLANNED** |
| Group lead @handle | profiles.handle | **PLANNED** |
| Member count | COUNT(conversation_members WHERE conversation_id = X) | **PLANNED** |
| Member list | Scrollable — avatar + name + @handle + lead badge if applicable | **PLANNED** |

### Media-Dial State

| Viewer | Control | Condition |
|--------|---------|-----------|
| Non-lead | Read-only indicator | `conversations.media_enabled` shown as label ("Text + emoji" / "All media") |
| Lead | Toggle switch | `conversations.media_enabled` boolean — text+emoji only (demo default), image/video post-item-44 |

### Controls

- **Non-leads:** Read-only on Group Info screen. No edit controls.
- **Leads:** Media dial toggle only.
- **Mute/leave:** Live on Social page per Design 5's deferral — **NOT on Group Info view**.

### Empty State

"No members yet" (should never fire — group activates with seed membership).
