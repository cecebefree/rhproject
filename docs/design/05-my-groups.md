# Design 5 — My Groups Block on Profile

**Status:** FROZEN — Cece ruling 2026-07-23 (amended: added My Analytics, section re-order)
**Frozen by:** Cece (explicit approval, 2026-07-23)

---

## Profile Section Order (student and teacher)

Bottom-of-profile order, applies to student and teacher roles:

1. **My Groups** — read-only group list (see below)
2. **Records** — tabbed component with two tabs: **Report Card** | **Certificate**
3. **My Analytics** — curated metrics section (see below)
4. **Access** — standard sticker list of what is open for this user (LAST)

Child mirror pages (family role) inherit this order.

---

## My Analytics

A profile section on student and teacher profiles showing curated metrics — attendance, performance, classes missed — added incrementally over time.

**Seed:** Demo/placeholder data until real attendance depends on `session_attendance` backend table (blocked backlog dependency — D22). Until then the section runs on seeded data plus `chapter_progress` and `enrichment_meta`.

**Placement:** Below Records (tabs), directly above Access.

---

## My Groups Block

### Section

Profile → My Groups (read-only mirror)

### Fields

| Field | Source | Status |
|-------|--------|--------|
| `group_name` | conversations.name | **PLANNED** |
| `group_type` | conversations.category | **PLANNED** — display/sort only, no branching |
| `group_lead` | conversation_members WHERE is_group_lead = true → JOIN profiles.name | **PLANNED** |

### Behavior

- Read-only list. No interactions (mute/leave) on Profile — those live on Social page.
- Filtered to current user's membership via conversation_members.user_id = auth.uid()
- Sorted: Core first, then Enrichment, Club, alphabetical within each.

### UI Card

[Group Type Badge] [Group Name] [Lead name — small text]

No actions. Tapping navigates to conversation view (Social page).

### Seed (demo)

3 groups hardcoded — Culinary Club / Chef Tanaka, Grade 8A Class / Mr. Olivier, Entrepreneurs Club / Mr. Steyn.

### Deferred

- `conversations.category` and `conversations.media_enabled` are PLANNED (D28)
- Mute/leave controls live on Social page, not here
