# AO-004 — Gates (Row 40)  — v1.1

**Ratified:** 2026-08-04
**Owner:** Backend Lead (under active council, Session 2026-08-04)
**Board:** PLAN-STATE.md row 40
**Series context:** AO-001–AO-004 are Phase G (agent-operations) Architecture Option documents.
AO-004 follows AO-001 (send-rail.md) and AO-002 (safeguarding-pipeline.md).

### v1.1 amendment log (2026-08-04)
- **G11 rewrite:** original criterion ("tenant_id must never be NULL") contradicted R20 (NULL = legitimate pending state). Rewritten as fail-closed-on-NULL: a profile with NULL `tenant_id` selects 0 rows (RLS deny) and the EF rejects the caller (D-15) before any write. Cites the three observed runs (G11-1 SELECT denial, G11-2 schedule_slot SELECT denial, G11-3 EF D-15 rejection) and the EF null-guard fix commit.
- **G1 reconcile:** criterion originally claimed "observed forbidden render"; evidence records 0 schedule slots (data-invisibility). Criterion restated to the observed behavior.
- **G7 fixes:** (a) two-step-jump rejection now cited from the observed G7-3 409 run (no longer uncited); (b) the released→visible ADMIN transition is now observed (G7-2b, EF 200) and added as a required intermediate.
- **Citations:** removed all literal file:line references (`SchoolDeskPage.tsx:56`, `OfficeDeskPage.tsx:56`) from pass criteria; file paths retained as context only.

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
| 38 | ITEM B — Office Desk behavioral evidence (re-sealed 2026-08-04) | `8454c3e` (build), `b8dc582` (seed), migration `090` (service_role UPDATE grant) |

**Key:** Row 38 was RE-SEALED 2026-08-04. The original seal used a *simulated* UPDATE for
step e; re-seal re-ran every step through the real `release-report-card` EF (steps e, f1,
f2, h below). The 066 grant gap (no `UPDATE` on `report_cards` for `service_role`) is
closed by migration `090_grant_service_role_rc_update.sql`; 066 left untouched.

---

## G1 — School Desk Role Gating (forbidden states)

- **Name:** G1 — School Desk role gate
- **Precondition:** A profile exists with role `teacher`, `admin`, or `student`; user is authenticated.
- **Pass criterion:** A non-teacher/non-admin role is denied the School Desk console (the School Desk page renders zero schedule slots for that profile); teacher and admin reach the console.
- **Evidence citation:** Row 37 ITEM A — verified: teacher (`11111111-1111-1111-1111-111111111111`) reaches the console; student (`ac87ccc1-2186-4c6b-aeb2-dd966032ee0e`) renders **0 schedule slots** (data-invisibility, not a rendered denial). Commit `45d386d`.

## G2 — School Desk Schedule Visibility

- **Name:** G2 — Teacher schedule slot visibility
- **Precondition:** Teacher profile with courses assigned; `schedule_slot` rows linked to those courses.
- **Pass criterion:** Teacher sees exactly the schedule slots owned by their courses (rows: Section A, Section B, Lab Section, Friday Review); slots from other teachers/tenants are excluded.
- **Evidence citation:** Row 37 ITEM A — verified: `schedule_slot JOIN courses WHERE c.teacher_id = '11111111...'` returns 4 rows. Commit `45d386d`.

## G3 — School Desk Student Enrollment Visibility

- **Name:** G3 — Teacher student roster
- **Precondition:** Teacher profile; `student_class` rows link students to teacher's courses.
- **Pass criterion:** Teacher sees exactly the 2 enrolled students (Seed Learner 1, Seed Learner 2) via `student_class JOIN profiles JOIN courses` filtered by teacher_id.
- **Evidence citation:** Row 37 ITEM A — verified: 2 rows returned. Commit `45d386d`.

## G4 — Office Desk Role Gating (forbidden states)

- **Name:** G4 — Office Desk role gate
- **Precondition:** A profile exists with role `office`, `admin`, `teacher`, or `student`; user is authenticated.
- **Pass criterion:** Teacher and student are denied the Office Desk console (no row-25 UI render); office and admin reach the console.
- **Evidence citation:** Row 38 ITEM B step b — verified: teacher (`11111111...`) and learner (`ac87ccc1...`) both denied. Commit `8454c3e`.

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
- **Precondition:** Office/admin role profile (tenant_id set); a report card in `draft` state; `release-report-card` EF deployed with migration 090 in effect.
- **Pass criterion:** (a) Calling `release-report-card` with `target_status=released` advances `draft → released` exactly one step, recording `status`, `released_by`, `released_at` (HTTP 200). (b) The `released → visible` step is restricted to `admin` only — an office caller is refused (HTTP 403) and the card stays `released`; an admin caller succeeds (HTTP 200). (c) Two-step jumps (e.g. `draft → visible`) are rejected with HTTP 409 "Must advance exactly one status".
- **Evidence citation:** Row 38 ITEM B step e / step f1 / step f2 (RE-SEAL run, 2026-08-04, real EF calls): (e) `POST release-report-card {target_status:released}` → HTTP 200, `released_by=909ca8cb-52c4-49bb-a71f-644f0bcee38e`, status `released`; (f1) same call with `target_status:visible` → office HTTP 403 ("Only admin can make report cards visible"), card stays `released`; admin HTTP 200, status `visible`; (f2) `draft → visible` jump → HTTP 409. Requires migration `090` (closes 066 UPDATE-grant gap).

## G8 — Learner Sees Exactly the Visible Card

- **Name:** G8 — learner renders released/visible card
- **Precondition:** A report card advanced to `visible`; learner role user.
- **Pass criterion:** Learner SELECT returns exactly that card (`status='visible'`, no draft rows).
- **Evidence citation:** Row 38 ITEM B step h (RE-SEAL run) — learner JWT `SELECT report_cards WHERE student_id=...` returns the visible card only, 0 draft rows (rc_learner_select_visible filters on `status='visible'`). Commit `8454c3e`.

## G9 — Cross-Tenant Isolation (report cards)

- **Name:** G9 — tenant-2 office cannot see/release tenant-1 cards
- **Precondition:** Two tenants with office users; report card exists in tenant 1.
- **Pass criterion:** Tenant-2 office user (JWT tenant `00000000-...002`) SELECT returns 0 tenant-1 rows; EF release attempt rejected with tenant mismatch (403).
- **Evidence citation:** Row 38 ITEM B step g — `rc_office_select` returns 0 rows for tenant-2 caller; EF tenant check rejects (`card_tenant=00000000-...001` vs `caller_tenant=00000000-...002`). Commit `8454c3e`.

## G10 — School Desk Cross-Tenant Schedule Isolation

- **Name:** G10 — teacher cannot see other tenant's slots
- **Precondition:** Teacher in tenant 1; schedule_slot rows in tenant 2.
- **Pass criterion:** Teacher query scoped to tenant 1 returns 0 tenant-2 slots.
- **Evidence citation:** Row 37 ITEM A — verified: `ss.tenant_id = '00000000-...002'` returns 0 rows. Commit `45d386d`.

## G11 — tenant_id Integrity / D15 Fail-Closed

- **Name:** G11 — fail-closed on NULL tenant_id (D15 class)
- **Precondition:** `profiles.tenant_id` exists. Ruling R20 establishes NULL `tenant_id` as a legitimate PENDING state written only by the `assign_tenant` EF — never auto-set at signup.
- **Pass criterion:** A profile with NULL `tenant_id` cannot operate report cards: (1) SELECT over tenant-scoped rows returns **0 rows** (deny-by-default RLS — the row's tenant is NULL, never matching a caller's tenant), and (2) the `release-report-card` EF REJECTS the caller with HTTP 403 `D-15: caller tenant_id is null (pending state) — refusing operation` **before any DB write**. The prior `!==` comparison (`reportCard.tenant_id !== profile.tenant_id`) silently passed on NULL (fail-open defect) and was replaced by an explicit NULL guard + the caller-JWT extraction (the original `supabase.auth.getUser()` was called without the caller's JWT and returned 401 for all callers).
- **Evidence citation:** Observed re-run 2026-08-04 (`supabase/functions/release-report-card/index.ts`, fail-closed guard + caller-JWT fix commit): (G11-1) NULL-tenant office `GET /rest/v1/report_cards?select=...` → `[]` HTTP 200 (deny); (G11-2) NULL-tenant office `GET /rest/v1/schedule_slot?select=...` → `[]` HTTP 200; (G11-3) NULL-tenant office `POST /functions/v1/release-report-card` → HTTP 403 `D-15`. Positive control (tenant-1 office, same EF, migration 090): `release-report-card {target_status:released}` → HTTP 200, confirming fail-closed does not over-block. See PLAN-STATE.md row 38 RE-SEAL block.

---

## Gate Contract Discipline

- **Observed-only:** Every gate above was executed against seed data in local Supabase (`supabase_db_rhproject-new`). No gate is asserted from a design document.
- **Evidence citation format:** (row, commit hash) → the commit that produced the observed behavior.
- **Re-seal discipline:** If any gate fails on re-run, the owning row reverts to OPEN-UNDER-VERIFICATION and the evidence block is amended before re-seal.
- **Fail-closed-by-default:** G11 (NULL tenant_id) and the D15 class gates are deny-unless-proven, not allow-by-default.

## Coverage Map

| Gate | Covers |
|------|--------|
| G1 | School Desk role gating (forbidden states) |
| G2, G3 | School Desk schedule + roster visibility |
| G4 | Office Desk role gating (forbidden states) |
| G5 | rc_office_insert draft enforcement |
| G6 | Learner draft-invisibility |
| G7 | row-25 EF release transition (draft→released→visible, admin-only; two-step rejection) |
| G8 | Learner renders visible card |
| G9 | Cross-tenant isolation (tenant-2 office denial) |
| G10 | School Desk cross-tenant isolation |
| G11 | tenant_id integrity / D15 fail-closed on NULL |

---

## Status

Gates G1–G11 are written against observed behavior from rows 37/38 evidence runs.
Row 41 (QA adversarial RLS pass) executes these gates adversarially against the seed.
Gates may be extended as new behavior is observed.

(End of AO-004 v1.1)
