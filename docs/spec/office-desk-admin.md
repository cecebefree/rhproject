# Office Desk Admin — Full Specification & Build Plan

Status: SPEC — approved, implementation pending
Date: 2026-08-20
Supersedes: All prior office_desk migration piecemeal specs
Related migrations: 100, 101, 111, 131, 132, 135, 139, 146, 147, 149, 1339, 165
Schema: `office_desk`

---

## 0. Architectural Summary

**Office Desk is the canonical enrollment source for all schools.**

All enrollment, invoicing, and payment data lives here. Every other desk reads
from Office Desk — never duplicates it. The three desks work as follows:

| Desk | Role |
|------|------|
| **Front Desk** | Feeds qualified leads INTO Office Desk (inquiries/leads/callbacks) |
| **Office Desk** | Owns enrollments, invoices, payments. The single source of truth for financials |
| **School Desk** | READS Office Desk. Auto-creates `student_class` rows on approval; class teacher sees student appear in dashboard |
| **Mobile App** | READS Office Desk. Sees enrollment, invoices, schedules, attendance. Realtime sync via Supabase |

---

## 1. Database Tables (6 total)

### 1.1 `office_desk.registrations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tenant_lms` | UUID FK → `public.tenants` | Tenant scoping |
| `parent_email` | VARCHAR(255) | Parent/guardian email |
| `parent_first_name` | VARCHAR(100) | |
| `parent_last_name` | VARCHAR(100) | |
| `parent_phone` | VARCHAR(50) | |
| `student_first_name` | VARCHAR(100) | |
| `student_last_name` | VARCHAR(100) | |
| `student_dob` | DATE | |
| `school_year_id` | UUID FK → `public.school_years` | |
| `course_id` | UUID FK → `school_desk.courses` | Target course |
| `teacher_preference` | VARCHAR(255) | |
| `source` | VARCHAR(50) | `'website'` / `'in_person'` / `'phone'` |
| `reg_status` | VARCHAR(30) DEFAULT `'pending'` | `pending` / `approved` / `enrolled` / `rejected` |
| `payment_status` | VARCHAR(30) DEFAULT `'unpaid'` | `unpaid` / `partial` / `paid` |
| `financial_status` | VARCHAR(30) | `awaiting_deposit` / `deposit_paid` / `full_paid` / `overdue` |
| `internal_notes` | TEXT | Admin-only (never exposed on mobile) |
| `internal_notes_lower` | TEXT | Generated column for RLS substring search |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Indexes:** `tenant_lms`, `course_id`, `school_year_id`, `reg_status`, `payment_status`

### 1.2 `office_desk.invoices`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tenant_lms` | UUID FK → `public.tenants` | |
| `registration_id` | UUID FK → `office_desk.registrations` | CASCADE DELETE |
| `total_amount` | NUMERIC(10,2) | |
| `amount_paid` | NUMERIC(10,2) DEFAULT 0 | |
| `currency` | VARCHAR(3) DEFAULT `'GBP'` | |
| `status` | VARCHAR(30) DEFAULT `'draft'` | `draft` / `sent` / `partial` / `paid` / `overdue` / `cancelled` |
| `issued_at` | TIMESTAMPTZ | |
| `due_date` | DATE | |
| `paid_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### 1.3 `office_desk.payments`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tenant_lms` | UUID FK → `public.tenants` | |
| `invoice_id` | UUID FK → `office_desk.invoices` | |
| `amount` | NUMERIC(10,2) | |
| `currency` | VARCHAR(3) DEFAULT `'GBP'` | |
| `method` | VARCHAR(30) | `cash` / `card` / `bank_transfer` / `online` |
| `reference` | TEXT | Payment reference / receipt number |
| `status` | VARCHAR(30) DEFAULT `'pending'` | `pending` / `completed` / `failed` / `refunded` |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

**Indexes:** `tenant_lms`, `invoice_id`, `status`, `created_at DESC`

### 1.4 `office_desk.student_class` (public schema)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `student_profile_id` | UUID FK → `public.profiles` | |
| `class_id` | UUID FK → `school_desk.classes` | |
| `course_id` | UUID FK → `school_desk.courses` | |
| `registration_id` | UUID FK → `office_desk.registrations` | The source enrollment |
| `status` | VARCHAR(30) DEFAULT `'active'` | `active` / `transferred` / `withdrawn` |
| `enrolled_at` | TIMESTAMPTZ | |

### 1.5 `office_desk.activity_log`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `registration_id` | UUID FK → `office_desk.registrations` | CASCADE DELETE |
| `action` | VARCHAR(100) | `'status_change'` / `'note_added'` / `'payment_received'` etc. |
| `actor_profile_id` | UUID FK → `public.profiles` | Who did it |
| `details` | JSONB | Arbitrary metadata |
| `created_at` | TIMESTAMPTZ | |

### 1.6 `office_desk.email_logs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `lead_id` | UUID | Reference to the lead |
| `tenant_id` | UUID | Tenant scoping |
| `recipient_email` | VARCHAR(255) | |
| `subject` | VARCHAR(500) | |
| `body` | TEXT | |
| `status` | VARCHAR(30) DEFAULT `'pending'` | `pending` / `sent` / `failed` |
| `created_at` | TIMESTAMPTZ | |

---

## 2. Row-Level Security Policies

### 2.1 registrations

| Role | Operation | Policy |
|------|-----------|--------|
| **admin** | ALL | Full access (bypass) |
| **office** | SELECT | Can read all registrations in their tenant |
| **office** | INSERT | Can create registrations in their tenant |
| **office** | UPDATE | Can update registrations in their tenant |
| **parent** | SELECT | Can only see their own registration (by `id`) |
| **student** | SELECT | Can only see their own registration (by `id`) |

**Internal notes protection:** `internal_notes` column is hidden from parent/student
via a `SELECT` policy that excludes that column, or via column-level grants.

### 2.2 invoices

| Role | Operation | Policy |
|------|-----------|--------|
| **admin** | ALL | Full access |
| **office** | SELECT | All invoices in their tenant |
| **office** | INSERT/UPDATE | Invoices in their tenant |
| **parent** | SELECT | Invoices linked to their registration only |

### 2.3 payments

| Role | Operation | Policy |
|------|-----------|--------|
| **admin** | ALL | Full access |
| **office** | SELECT | All payments in their tenant |
| **office** | INSERT | Payments in their tenant |
| **parent** | SELECT | Payments linked to their registration only |

### 2.4 student_class

| Role | Operation | Policy |
|------|-----------|--------|
| **admin** | ALL | Full access |
| **office** | SELECT/INSERT | All student_class rows in their tenant |
| **teacher** | SELECT | Only students in their assigned classes |
| **student** | SELECT | Only their own `student_class` row |
| **parent** | SELECT | Their child's `student_class` row (via parent_student_link) |

### 2.5 activity_log

| Role | Operation | Policy |
|------|-----------|--------|
| **admin** | ALL | Full access |
| **office** | SELECT | All activity for their tenant |
| **office** | INSERT | Log activity for their tenant |
| **parent** | SELECT | Activity for their own registration |

### 2.6 email_logs

| Role | Operation | Policy |
|------|-----------|--------|
| **admin** | ALL | Full access |
| **office** | SELECT | All email logs in their tenant |
| **office** | INSERT | Create email logs in their tenant |

---

## 3. Triggers (4)

### 3.1 Registration Status → Invoice Sync

When `reg_status` changes to `'approved'`:
- Create invoice if none exists
- Set invoice status to `'draft'`, issued_at to now
- Set `payment_status = 'unpaid'`

When `reg_status` changes to `'enrolled'`:
- Invoice must already be created
- Do NOT auto-create invoice if missing

When `reg_status` changes to `'rejected'`:
- Cancel all open invoices (status → `'cancelled'`)
- Set payment_status to `'cancelled'`

### 3.2 Updated_at Auto-Refresh

Set `updated_at = now()` on every UPDATE to:
- `office_desk.registrations`
- `office_desk.invoices`

### 3.3 Registration Activity Log

On INSERT to `office_desk.registrations`:
- Insert activity log entry: `action = 'created'`

On UPDATE to `reg_status`:
- Insert activity log entry: `action = 'status_change'`, `details = {from: old, to: new}`

---

## 4. RPCs (3)

### 4.1 `office_desk.approve_registration(p_registration_id UUID)`

Steps:
1. UPDATE `reg_status = 'approved'`
2. Trigger fires → auto-creates invoice if missing
3. INSERT into `activity_log`: `action = 'approved'`
4. Call `school_desk.create_student_profile_from_registration()` to create profile
5. Auto-enroll: INSERT into `student_class` with `class_id` resolved from course + school_year
6. Return updated registration row

### 4.2 `office_desk.record_payment(p_invoice_id, p_amount, p_method, p_reference, p_notes)`

Steps:
1. INSERT into `office_desk.payments`
2. UPDATE `invoices.amount_paid += p_amount`
3. If `amount_paid >= total_amount` → `invoices.status = 'paid'`, `invoices.paid_at = now()`
4. UPDATE `registrations.payment_status` based on invoice status
5. INSERT into `activity_log`: `action = 'payment_recorded'`
6. Return updated invoice + payment

### 4.3 `office_desk.get_financial_summary(p_school_year_id UUID, p_tenant_id UUID)`

Returns:
- `total_registrations` — count of registrations for that school year
- `total_enrolled` — count where `reg_status = 'enrolled'`
- `total_revenue` — sum of all `payments.amount` where status = `'completed'`
- `outstanding_amount` — sum of `invoices.total_amount - invoices.amount_paid` where invoice status != `'paid'`
- `overdue_count` — count of invoices where `status = 'overdue'`
- `by_status` — JSONB array grouping registrations by status
- `by_course` — JSONB array grouping revenue by course

---

## 5. Edge Functions (1)

### 5.1 `office_desk_process_registration`

**Trigger:** HTTP POST from website form (Turnstile verified)

**Steps:**
1. Verify Turnstile token
2. Insert into `office_desk.registrations` with status = `'pending'`
3. Insert `activity_log`: `action = 'submitted'`
4. Send email to office desk team (New Registration Alert)
5. Return `{ success: true, registration_id: ... }`

**Payload:**
```json
{
  "parent_email": "string",
  "parent_first_name": "string",
  "parent_last_name": "string",
  "parent_phone": "string",
  "student_first_name": "string",
  "student_last_name": "string",
  "student_dob": "YYYY-MM-DD",
  "school_year_id": "UUID",
  "course_id": "UUID",
  "teacher_preference": "string",
  "source": "website",
  "turnstile_token": "string"
}
```

---

## 6. Realtime Publications

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE office_desk.registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE office_desk.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE office_desk.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE office_desk.activity_log;
```

All four tables broadcast on `office_desk` channel. The mobile app subscribes
to all four and updates the local UI in real time when a parent views their
enrollment dashboard.

---

## 7. Mobile Sync Flow

```
Parent opens mobile → loads registration → sees:
  - enrollment status (registrations table)
  - invoices + payment status (invoices/payments)
  - class schedule (student_class → classes)
  - attendance (reads from school_desk.attendance)
  - activity timeline (activity_log)
```

All reads via PostgREST. No writes from mobile except `office_desk_process_registration`.
Realtime subscription keeps mobile view live as office staff make changes.

---

## 8. RLS Enforcement Notes

### 8.1 internal_notes Column Security

The `internal_notes` column in `registrations` must NEVER be visible to
parent/student roles. Two approaches:

**Option A — Column-Level Grants (preferred):**
```sql
REVOKE SELECT(internal_notes, internal_notes_lower)
  ON office_desk.registrations
  FROM authenticated;
GRANT SELECT(id, tenant_lms, parent_email, ..., created_at, updated_at)
  ON office_desk.registrations
  TO authenticated;
```

**Option B — View-based:**
Create `office_desk.v_registrations_public` that excludes `internal_notes`.

### 8.2 parent_student_link Verification

All parent SELECT policies must verify `auth.uid()` is the parent via
`public.parent_student_link`. Never rely on email matching alone.

### 8.3 Anon Access

`office_desk.registrations` is INSERT-only for anon (via Edge Function).
All other tables are `REVOKE ALL ON ... FROM anon` (no anonymous read/write).

---

## 9. Build Plan — Implementation Tiers

### Tier 1: Schema + RLS + Triggers + Publications

**Files to create:**
1. `supabase/migrations/NNN_office_desk_schema_rls.sql` — CREATE TABLE + RLS policies
2. `supabase/migrations/NNN_office_desk_triggers.sql` — All 4 triggers
3. `supabase/migrations/NNN_office_desk_rpcs.sql` — All 3 RPCs

**What builds:**
- `office_desk.registrations`, `office_desk.invoices`, `office_desk.payments` tables (if not existing)
- `office_desk.student_class` table (if not existing)
- `office_desk.activity_log` table (if not existing)
- `office_desk.email_logs` table (if not existing)
- RLS policies for all 6 tables
- 3 triggers (invoice sync, updated_at, activity log)
- 3 RPCs (`approve_registration`, `record_payment`, `get_financial_summary`)
- Realtime publications

---

### Tier 2: Edge Function + Website Form

**Files to create:**
1. `supabase/functions/office_desk_process_registration/index.ts`
2. `apps/web/src/features/lms/components/RegistrationForm.tsx` (or update existing)

**What builds:**
- Edge Function: Turnstile verify → insert → activity log → email notification
- Registration form: Parent-facing form on website
- Integration: Form POST → Edge Function → database

---

### Tier 3: Office Desk Admin UI

**Files to create/update:**
1. `apps/web/src/features/lms/pages/OfficeDeskPage.tsx`
2. `apps/web/src/features/lms/components/RegistrationReviewCard.tsx`
3. `apps/web/src/features/lms/components/PaymentTracker.tsx`
4. `apps/web/src/features/lms/components/FinancialDashboard.tsx`
5. `apps/web/src/features/lms/components/ActivityTimeline.tsx`

**What builds:**
- Registration review queue (admin/office sees pending, can approve/reject)
- Payment tracker (record payments, view history)
- Financial summary dashboard (revenue, outstanding, overdue)
- Activity timeline (audit log per registration)

---

### Tier 4: Mobile Integration

**Files to create/update:**
1. `apps/mobile/src/screens/EnrollmentDashboard.tsx`
2. `apps/mobile/src/screens/InvoiceList.tsx`

**What builds:**
- Parent mobile: Realtime subscription to registrations, invoices, payments
- Invoice view: See invoices, payment status
- Activity feed: See activity timeline for their registration

---

## 10. Quality Gates

Before any tier is marked complete:

- [ ] **Typecheck:** `npm run typecheck` passes (no TS errors)
- [ ] **Lint:** `npm run lint` passes (no ESLint errors)
- [ ] **Build:** `npm run build` succeeds (clean production build)
- [ ] **SQL syntax:** No Postgres syntax errors in migrations
- [ ] **RLS check:** All policies enforce tenant isolation
- [ ] **Test run:** All existing tests pass (`npm run test`)
- [ ] **Supabase push:** Migrations deploy to remote successfully

---

## 11. Open Questions (Resolved in This Session)

| Question | Answer |
|----------|--------|
| Where does `student_class` live? | `public` schema (already exists with extra columns) |
| Which RPCs exist in `public` vs `school_desk`? | Most in `public`; only `set_course_schedule_updated_at` in `school_desk` |
| Is migration 165 deployable? | Yes — after fix (DROP IF EXISTS email_logs) |
| Does `front_desk.email_logs` need a migration? | No — table confirmed on remote, schema preserved |
| Where does the Front Desk planning doc live? | `docs/spec/front-desk-architecture.md` |
| Where does the Office Desk doc go? | `docs/spec/office-desk-admin.md` (this file) |
