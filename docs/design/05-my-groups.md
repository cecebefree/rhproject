# Design 5 — My Groups Block on Profile

**Status:** FROZEN — ITEM-009 design freeze, 2026-07-15
**Frozen by:** Cece (explicit approval)
**Schema dependency:** conversations + conversation_members (PLANNED — D28)

---

## Section

Profile → My Groups (read-only mirror)

## Fields

| Field | Source | Status |
|-------|--------|--------|
| `group_name` | conversations.name | **PLANNED** |
| `group_type` | conversations.category | **PLANNED** — display/sort only, no branching |
| `group_lead` | conversation_members WHERE is_group_lead = true → JOIN profiles.name | **PLANNED** |

## Behavior

- Read-only list. No interactions (mute/leave) on Profile — those live on Social page.
- Filtered to current user's membership via conversation_members.user_id = auth.uid()
- Sorted: Core first, then Enrichment, Club, alphabetical within each.

## UI Card

[Group Type Badge] [Group Name] [Lead name — small text]

No actions. Tapping navigates to conversation view (Social page).

## Seed (demo)

3 groups hardcoded — Culinary Club / Chef Tanaka, Grade 8A Class / Mr. Olivier, Entrepreneurs Club / Mr. Steyn.

## Deferred

- `conversations.category` and `conversations.media_enabled` are PLANNED (D28)
- Mute/leave controls live on Social page, not here
