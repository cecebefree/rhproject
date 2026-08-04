# AO-004 — Gates (Row 40)

**Ratified:** 2026-08-04
**Owner:** Backend Lead (under active council, Session 2026-08-04)
**Board:** PLAN-STATE.md row 40
**Series context:** AO-001–AO-004 are Phase G (agent-operations) Architecture Option documents.
AO-004 follows AO-001 (send-rail.md) and AO-002 (safeguarding-pipeline.md).

---

## Purpose

This document defines the **release gates** for the School Desk (row 37) and Office Desk
(row 38) consoles. Each gate is written against **OBSERVED behavior only** — evidence
collected by executing the flows against seed data, never architecture documentation.

**Evidence source discipline:** Every gate cites its evidence block (row + commit hash).
No gate cites a design document as proof of behavior. Design docs are context; evidence
is what was actually run.

---

## Evidence Base

| Row | Evidence block | Authoritative commit |
|-----|---------------|---------------------|
| 37 | ITEM A — School Desk behavioral evidence | `45d386d` (build), `b8dc582` (seed) |
| 38 | ITEM B — Office Desk behavioral evidence run a–g | `8454c3e` (build), `b8dc582` (seed) |
| 39 | agent-registry.md existence | `0dc922e` |

---

## G1 — School Desk Role Gating (forbidden states)

- **Name:** G1 — School Desk role gate
- **Precondition:** A profile exists with role `teacher`, `admin`, or `student`; user is authenticated.
- **Pass criterion:** `SchoolDeskPage.tsx:56` returns "Access denied. School Desk is for teachers and admins only." for non-teacher/non-admin roles; teacher and admin reach the console.
- **Evidence citation:** Row 37 ITEM A — verified: teacher (`11111111-1111-1111-1111-111111111111`) sees console; student (`ac87ccc1-2186-4c6b-aeb2-dd966032ee0e`) sees 0 schedule slots. Commit `45d386d`.

## G2 — School Desk Schedule Visibility

- **Name:** G2 — Teacher schedule slot visibility
- **Precondition:** Teacher profile with courses assigned; `schedule_slot` rows linked to those courses.
- **Pass criterion:** Teacher sees exactly the schedule slots owned by their courses (4 rows: Section A, Section B, Lab Section, Friday Review); slots from other teachers/tenants are excluded.
- **Evidence citation:** Row 37 ITEM A — verified: `schedule_slot JOIN courses WHERE c.teacher_id = '11111111...'` returns 4 rows. Commit `45d386d`.

## G3 — School Desk Student Enrollment Visibility

- **Name:** G3 — Teacher student roster
- **Precondition:** Teacher profile; `student_class` rows link students to teacher's courses.
- **Pass criterion:** Teacher sees exactly the 2 enrolled students (Seed Learner 1, Seed Learner 2) via `student_class JOIN profiles JOIN courses` filtered by teacher_id.
- **Evidence citation:** Row 37 ITEM A — verified: 2 rows returned. Commit `45d386d`.

## G4 — Office Desk Role Gating (forbidden states)

- **Name:** G4 — Office Desk role gate
- **Precondition:** A profile exists with role `office`, `admin`, `teacher`, or `student`; user is authenticated.
- **Pass criterion:** `OfficeDeskPage.tsx:56` returns "Access denied. Office Desk is for office and admin users only." for teacher and student; office and admin reach the console.
- **Evidence citation:** Row 38 ITEM B step b — verified: teacher (`11111111...`) and learner (`ac87ccc1...`) both forbidden. Commit `8454c3e`.

## G5 — Report Card Insert Draft Enforcement (rc_office_insert)

- **Name:** G5 — INSERT must land as draft
- **Precondition:** Office-role authenticated user; tenant_id in JWT.
- **Pass criterion:** Inserting a report card via the form lands with `status='draft'`, `created_by = auth.uid()`, `tenant_id = jwt_tenant_id()`. Non-draft INSERT is rejected by the policy.
- **Evidence citation:** Row 38 ITEM B step c — verified: INSERT 0 1 with `status=draft`, `created_by=33333333-...331`, `tenant_id=00000000-...001`. Commit `8454c3e`.

## G6 — Learner Draft Invisibility

- **Name:** G6 — learner cannot see draft
- **Precondition:** Learner role user; a draft report card exists for that student.
- **Pass criterion:** Learner SELECT on `report_cards` returns 0 rows while status is `draft`; the card becomes visible only after status transitions to `visible`.
- **Evidence citation:** Row 38 ITEM B step d — verified: learner query returns 0 rows for draft. Commit `8454c3e`.

## G7 — Release Transition via row-25 EF

- **Name:** G7 — EF release transition
- **Precondition:** Office/admin role user; a report card in `draft` state; `release-report-card` EF deployed.
- **Pass criterion:** Calling `release-report-card` with `target_status=released` advances `draft → released` exactly one step (status, `released_by`, `released_at` recorded). Two-step jumps are rejected.
- **Evidence citation:** Row 38 ITEM B step e — verified: `draft → released` transition with `released_by=33333333-...331`, `released_at=2026-08-04 17:37:24.182519+00`. Commit `8454c3e`.

## G8 — Learner Sees Exactly the Released Card

- **Name:** G8 — learner renders released/visible card
- **Precondition:** A report card advanced to `visible`; learner role user.
- **Pass criterion:** Learner SELECT returns exactly that card (id `9855986d-190c-43eb-ba54-9dbf7ef3de7e`) with `status='visible'`, correct term/subject/grade.
- **Evidence citation:** Row 38 ITEM B step f — verified: 1 row returned with `status=visible`, term `Term 1 2026`, subject `Mathematics`, grade `A`. Commit `8454c3e`.

## G9 — Cross-Tenant Isolation (report cards)

- **Name:** G9 — tenant-2 office cannot see/release tenant-1 cards
- **Precondition:** Two tenants with office users; report card exists in tenant 1.
- **Pass criterion:** Tenant-2 office user (JWT tenant `00000000-...002`) SELECT returns 0 tenant-1 rows; EF release attempt rejected with tenant mismatch (403).
- **Evidence citation:** Row 38 ITEM B step g — verified: rc_office_select returns 0 rows for tenant-2 caller; `card_tenant=00000000-...001` vs `caller_tenant=00000000-...002`. Commit `8454c3e`.

## G10 — School Desk Cross-Tenant Schedule Isolation

- **Name:** G10 — teacher cannot see other tenant's slots
- **Precondition:** Teacher in tenant 1; schedule_slot rows in tenant 2.
- **Pass criterion:** Teacher query scoped to tenant 1 returns 0 tenant-2 slots.
- **Evidence citation:** Row 37 ITEM A — verified: `ss.tenant_id = '00000000-...002'` returns 0 rows. Commit `45d386d`.

## G11 — Tenant ID Integrity on Signup/Profiles (D15 class)

- **Name:** G11 — tenant_id must never be NULL
- **Precondition:** A profile row is created or updated; `tenant_id` column exists on `profiles`.
- **Pass criterion:** Every profile in the seed set has a non-NULL `tenant_id`. A NULL `tenant_id` on an office/admin profile is a **defect** — the EF's tenant check `reportCard.tenant_id !== profile.tenant_id` silently passes when `profile.tenant_id` is NULL, defeating cross-tenant protection.
- **Evidence citation:** Row 38 ITEM B seed fix — tenant-2 office profile `33333333-...332` had NULL `tenant_id` after seed (D15 failure mode); corrected via `SET app.tenant_assignment_bypass = 'true'` + direct UPDATE to `00000000-...002`. Commit `b8dc582`.

---

## Gate Contract Discipline

- **Observed-only:** Every gate above was executed against seed data in local Supabase (`supabase_db_rhproject-new`). No gate is asserted from a design document.
- **Evidence citation format:** (row, commit hash) → the commit that produced the observed behavior.
- **Re-seal discipline:** If any gate fails on re-run, the owning row reverts to OPEN-UNDER-VERIFICATION and the evidence block is amended before re-seal.

## Coverage Map

| Gate | Covers |
|------|--------|
| G1 | School Desk role gating (forbidden states) |
| G2, G3 | School Desk schedule + roster visibility |
| G4 | Office Desk role gating (forbidden states) |
| G5 | rc_office_insert draft enforcement |
| G6 | Learner draft-invisibility |
| G7 | row-25 EF release transition |
| G8 | Learner renders released card |
| G9 | Cross-tenant isolation (tenant-2 office denial) |
| G10 | School Desk cross-tenant isolation |
| G11 | tenant_id integrity (D15 class — NULL seed bug) |

---

## Status

Gates G1–G11 are written against observed behavior from rows 37/38 evidence runs.
Row 41 (QA adversarial RLS pass) executes these gates adversarially against the seed.
Gates may be extended as new behavior is observed.

(End of AO-004 v1)
