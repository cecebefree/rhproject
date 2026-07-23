# Design 8 — Report Card Tab (Section-Based Authoring Workflow)

**Status:** FROZEN — Cece ruling 2026-07-23 (amended, replaces 2026-07-15 version)
**Frozen by:** Cece (explicit approval, 2026-07-23)
**Schema:** report_cards (field-register lines 251–276, BACKED)
**Cross-reference:** Certificates are a SEPARATE document with a distinct workflow (see below).

---

## Structure

A report card is a CUSTOM LIST of sections:
- One section per subject the student takes
- Plus one **General Examiner** section

The section list is composed per student by office/admin.

---

## Teacher Scope

Each subject section is routed to the teacher who gives that subject to that student. The teacher can write/edit ONLY their own section — no write access to any other section.

---

## General Examiner

A general examiner capability adds the overall section. Whether this is a distinct role or a flag on a staff user is a **PARKED design decision** — recorded, not resolved.

---

## Finalization Lock

Once the examiner marks the card ready to send, it is FINALIZED and IMMUTABLE — no edits by teachers, examiner, or anyone.

**Intended enforcement:** Status transition (e.g. `draft` → `sections_complete` → `finalized`) where `finalized` revokes all UPDATE at RLS level. Recorded as backend intent, NOT a migration today.

---

## Status Chain

| DB Status | UI State | Who sees it | Who sets it |
|-----------|----------|-------------|-------------|
| `draft` | "Draft" | Teacher (own sections only) + Office/Admin | Teacher writes section |
| `sections_complete` | "Sections Complete" | Examiner + Office/Admin | Examiner sets when all sections submitted |
| `finalized` | "Finalized" | Learner (student_id), Family (via child mirror), Teacher (read-only), Office/Admin | Examiner sets; triggers immutability — no further edits |

---

## Delivery

The student sees the finalized card as the school-stamped PDF view in the Report Card tab. Family sees the same via the child mirror, read-only.

---

## Certificate Distinction

**Certificates are OUT of this workflow.** Points above (section-based, per-subject authorization, General Examiner, finalization lock) apply to REPORT CARDS ONLY. A certificate:
- Is issued with the grade once the course is complete
- Has NO per-subject sections, NO teacher comments, and NO general school comments
- Keeps the existing frozen rule: school-stamped PDF, external file_url in V0, Supabase Storage signed URLs in V1
- Visible in the Certificate tab and via the child mirror

This distinction prevents the two document types from being conflated.

---

## RLS Mapping (field-register lines 269–275, amended)

- `rc_teacher_insert` — teacher can INSERT draft (own section row)
- `rc_teacher_select_own` — teacher sees own section drafts
- `rc_teacher_update_own` — teacher can UPDATE own sections while status = draft
- `rc_office_select` — office sees all sections in tenant
- `rc_office_manage` — office/admin can compose section list per student
- `rc_examiner_manage` — examiner can set sections_complete → finalized (GAP-BACKEND — no examiner role exists)
- `rc_learner_select_finalized` — learner sees only status = finalized
- `rc_admin_all` — admin bypass

---

## Seed Demo Card

Single-section demo card (status = `finalized`), one subject, learner sees it immediately.
