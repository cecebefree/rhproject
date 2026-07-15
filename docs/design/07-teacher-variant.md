# Design 7 — Teacher Variant (Content Swap on Student Layout)

**Status:** FROZEN — ITEM-009 design freeze, 2026-07-15
**Frozen by:** Cece (explicit approval)
**Role:** `teacher` (field-register line 374)

---

## Layout

Same base layout as student — Home / Class / Hub / Social / Profile tabs — with content swapped.

## Tab-by-tab Differences

| Tab | Student sees | Teacher sees |
|-----|-------------|--------------|
| **Home** | greeting, devotional, coming_up, news | greeting, coming_up (own classes), no devotional toggle |
| **Class** | Enrolled class list | **Own teaching classes** — class_subject, class_teacher = self |
| **Hub** | Enrolled enrichment | **Own enrichment courses** — hub_title where teacher_id = self |
| **Social** | My Groups (member) | My Groups (member + **Group Lead badge**) |
| **Profile** | Own info, My Groups mirror | Own info, **My Groups with lead controls** |

## Group Lead Controls (ITEM-001 §3)

Visible on teacher's Social page when `is_group_lead = true` on conversation_members:

- **Lead badge** — rendered for all lead-flagged members
- **Media dial toggle** — per conversation: text+emoji only (demo), image/video post-item-44
- **Member list** — view all conversation_members in group
- **Report queue** — routed to Group Lead + Office Desk (ITEM-001)

## Class Roster

Teacher sees conversation_members of their Core class group — list of student names. No student impersonation. RLS enforces role boundaries.

## No Student Data Writes

Teacher can UPDATE report_cards WHERE created_by = auth.uid() AND status = 'draft' (RLS rc_teacher_update_own). Cannot modify student profiles.
