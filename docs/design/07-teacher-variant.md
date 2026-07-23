# Design 7 — Teacher Variant (Interim Simplification)

**Status:** FROZEN — Cece ruling 2026-07-23 (amended per FAIL-AS-WRITTEN, replaces 2026-07-15 version)
**Frozen by:** Cece (explicit approval, 2026-07-23)
**Amendment note:** Full teacher profile redesign DEFERRED. This interim design freezes a parallel layout until the redesign task is picked up.
**Role:** `teacher` (field-register line 374)

---

## Layout

Teacher profile runs PARALLEL to the student profile — identical layout and section order. The full redesign is DEFERRED to a later task.

### Tab-by-tab Differences

| Tab | Student sees | Teacher sees |
|-----|-------------|--------------|
| **Home** | greeting, devotional, coming_up, news | greeting, coming_up (own classes), no devotional toggle |
| **Class** | Enrolled class list | **Own teaching classes** — class_subject, class_teacher = self |
| **Hub** | Enrolled enrichment | **Own enrichment courses** — hub_title where teacher_id = self |
| **Social** | My Groups (member) | My Groups (member + **Group Lead badge**) |
| **Profile** | Own info, My Groups, Records tabs, My Analytics, Access | Identical layout and section order; non-applicable sections BLANKED OUT; **own class list** in place of subject teacher listings |

### Profile Section Order (identical to student)

1. **My Groups** — read-only list (same GroupCard rendering)
2. **Records** — tabbed component: Report Card | Certificate (parallel layout; teacher sees own draft report cards, blank if no drafts)
3. **My Analytics** — teacher's own metrics (seeded demo data; real data depends on backend)
4. **Access** — standard sticker list (LAST)

Sections not applicable to the teacher role are BLANKED OUT — rendered empty in place, not removed, not redesigned.

### Section Swap

Where the student profile lists subjects with the subject teacher's name and contact link, the teacher instead sees THEIR OWN CLASS LIST — each class clickable, navigating into that class.

---

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

---

## Deferred — Teacher Profile Redesign

A full teacher profile redesign is RECORDED as a deferred backlog item. This interim freeze only locks the parallel-layout approach until a dedicated teacher-profile design iteration is ruled.
