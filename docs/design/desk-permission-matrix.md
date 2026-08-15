# Desk Services Permission Matrix

**Status:** Draft
**Date:** 2026-08-12
**Audience:** Auditor (Row 48), Demo (Row 58 RLS implementation)
**Scope:** Front Desk, School Desk, Office Desk — all role/resource combinations

---

## Role Mapping

User-provided roles mapped to database `profiles.role` values:

| User Role     | DB Role (`profiles.role`) | Notes                              |
|---------------|---------------------------|------------------------------------|
| Receptionist  | `front_desk`              | **GAP: not in CHECK constraint** (see §G1) |
| Teacher       | `teacher`                 | Existing role, migration 013       |
| School Admin  | `admin`                   | Existing role, migration 013       |
| Operations    | `office`                  | Existing role, migration 045       |
| Director      | `admin`                   | Same DB role as School Admin       |

---

## Permission Matrix

### Front Desk (`front_desk.leads`)

| Role         | Read Leads | Write Leads | Notes                                           |
|--------------|------------|-------------|-------------------------------------------------|
| Receptionist | Yes        | Yes (INSERT + UPDATE) | Status transitions: `enquiry → qualified → invoiced → handed_off`. Cannot delete. (106 §2-4) |
| Teacher      | No         | No          | No RLS policy grants teacher access to leads.    |
| School Admin | Yes        | Yes (ALL)   | Full CRUD within tenant. (106 §1)                |
| Operations   | Yes        | Conditional | SELECT always. UPDATE only: set status to `handed_off` from `invoiced`/`qualified`. (106 §5-6) |
| Director     | Yes        | Yes (ALL)   | Same as School Admin (both map to `admin`).      |

### School Desk (`school_desk.*`)

| Role         | Read Enrollments | Write Enrollments | View Reports | Write Reports | Notes |
|--------------|------------------|-------------------|--------------|---------------|-------|
| Receptionist | No               | No                | No           | No            | No RLS policy grants `front_desk` access to school_desk tables. |
| Teacher      | Yes (assigned)   | Limited           | Yes (draft)  | Yes (draft)   | Enrollments: own courses only via `student_class` join. Reports: own cards, draft status only. (086, 044) |
| School Admin | Yes              | Yes (ALL)         | Yes          | Yes (ALL)     | Full access within tenant. (086)                  |
| Operations   | No               | No                | Yes          | Yes (release) | Reports: SELECT + UPDATE to `released`/`visible` status. No enrollment access. (086 §rc_office_*) |
| Director     | Yes              | Yes (ALL)         | Yes          | Yes (ALL)     | Same as School Admin.                              |

### Office Desk (`office_desk.*`)

| Role         | Read Reg. | Write Reg. | Read Invoices | Write Invoices | Read Payments | Write Payments | Notes |
|--------------|-----------|------------|---------------|----------------|---------------|----------------|-------|
| Receptionist | No        | No         | No            | No             | No            | No             | No RLS policy grants `front_desk` access to office_desk tables. |
| Teacher      | No        | No         | No            | No             | No            | No             | No access.                                                  |
| School Admin | Yes       | Yes (ALL)  | Yes           | Yes (ALL)      | Yes           | Yes (ALL)      | Full access. admin_all bypass on all 3 tables. (101)         |
| Operations   | Yes       | Yes        | Yes           | Yes            | Yes           | Yes            | Tenant-scoped SELECT/INSERT/UPDATE on all 3 tables. Soft-delete filtered on SELECT. (101 §tenant_*) |
| Director     | Yes       | Yes (ALL)  | Yes           | Yes (ALL)      | Yes           | Yes (ALL)      | Same as School Admin.                                       |

---

## Conditional Logic Details

### Teacher → Assigned Leads Only
**Not implemented.** No RLS policy exists to scope teacher access to leads by assignment. Teachers currently have zero access to `front_desk.leads`. If teacher lead visibility is needed, a new policy + `assigned_to` column on leads is required (see §G3).

### Teacher → Own Courses Only (School Desk)
**Implemented.** `courses_teacher_manage` policy (086) checks `p.id = courses.teacher_id`. Teachers see only courses they teach. Enrollments visible via `student_class` join (086 §ss_student_read pattern).

### Teacher → Draft Reports Only
**Implemented.** `rc_teacher_update_own` policy (044) restricts UPDATE to `created_by = auth.uid() AND status = 'draft'`. Teachers cannot release or make visible.

### Operations → Handed-Off Leads Only
**Implemented.** `leads_office_handoff` policy (106 §6) allows UPDATE only when `status IN ('invoiced', 'qualified')` and sets `status = 'handed_off'`. No other transitions allowed.

### Operations → Report Release Only
**Implemented.** `rc_office_manage` policy (086) allows UPDATE only for `released` and `visible` transitions. Operations cannot create or delete reports.

---

## Gaps Requiring Migration

### G1 — `front_desk` Missing from Role CHECK Constraint [CRITICAL]

**Impact:** No user can be assigned `role = 'front_desk'`. The CHECK constraint (last updated migration 045) allows:

```
student, outside_student, family, alumni, teacher, expert, guest, admin, learner, office
```

Migration 106 references `p.role = 'front_desk'` in 4 RLS policies, but the constraint rejects it at INSERT/UPDATE time. Any attempt to set `role = 'front_desk'` fails with a constraint violation.

**Fix:** New migration adds `front_desk` to `profiles_role_check`:

```sql
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'student', 'outside_student', 'family', 'alumni',
    'teacher', 'expert', 'guest', 'admin',
    'learner', 'office', 'front_desk'
  ));
```

**Severity:** BLOCKER — Front Desk staff cannot be onboarded without this.

### G2 — No Tasks Table Exists

The matrix column "Read Tasks / Write Tasks" has no backing table. No `tasks` table exists in any schema (`front_desk`, `school_desk`, `office_desk`, or `public`).

**Options:**
- Defer tasks to a future migration (current scope is leads, enrollments, registrations).
- If tasks are needed now, create `front_desk.tasks` with tenant scoping + role-based RLS following the leads pattern (106).

### G3 — Teacher Lead Visibility Not Implemented

Teachers have no access to `front_desk.leads`. If the product requires teachers to see leads assigned to them:

1. Add `assigned_to uuid REFERENCES profiles(id)` column to `front_desk.leads`.
2. Add RLS policy:

```sql
CREATE POLICY leads_teacher_assigned_select ON front_desk.leads
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.jwt_tenant_id()
    AND assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'teacher'
    )
  );
```

### G4 — Director vs School Admin Indistinguishable

Both map to `admin`. No DB-level differentiation. If Director needs restricted permissions (e.g., read-only on Office Desk while School Admin gets full write), a new role value (e.g., `director`) or a `profiles.is_director` boolean is required.

### G5 — Operations Role Name Mismatch

User calls this role "Operations"; DB uses `office`. The EF-to-EF auth pattern doc and RLS policies consistently use `office`. Confirm this mapping is intentional before demo.

---

## RLS Enforcement Summary

| Table               | Policies | Enforced By                | Tenant Scoping |
|---------------------|----------|----------------------------|----------------|
| `front_desk.leads`  | 6        | Migration 106              | `jwt_tenant_id()` + `app_metadata` |
| `office_desk.registrations` | 4 | Migration 101        | `jwt_tenant_id()` |
| `office_desk.invoices`     | 4 | Migration 101        | `jwt_tenant_id()` |
| `office_desk.payments`     | 4 | Migration 101        | `jwt_tenant_id()` |
| `school_desk.courses`      | 4 | Migration 091        | `jwt_tenant_id()` |
| `school_desk.report_cards` | 5 | Migrations 044/086   | `jwt_tenant_id()` |

**All policies use `service_role` bypass + server-side tenant filtering in EFs as defense-in-depth.**

---

## Auditor Checklist (Row 48)

- [ ] G1: `front_desk` added to `profiles_role_check` before demo
- [ ] G2: Tasks table scope decided (defer or implement)
- [ ] G3: Teacher lead visibility requirement confirmed
- [ ] G4: Director vs School Admin differentiation decided
- [ ] G5: "Operations" = `office` mapping confirmed
- [ ] All 19 RLS policies (6 leads + 12 office + 1 school) verified via pgTAP
- [ ] Cross-tenant denial proofs pass (013 pattern)
- [ ] EF call pattern uses `service_role` + tenant filter, not raw RLS
