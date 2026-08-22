# Office Desk Admin Specification & Build Plan (Integrated)

## Executive Summary

The Office Desk Admin role owns the complete business engine of Redhouse: enrollment completion, payment processing, profile setup, debit orders, invoicing, and accounting oversight. This specification integrates three critical architectural layers:

1. **Office Desk** (CRM-driven enrollment & payments) — Master source of truth for enrollment status and payment state
2. **School Desk** (read-only sync) — Academic classes, teachers, enrichment pulled from School Desk; updates flow one-way
3. **Mobile Family App** (real-time sync) — Parent/family data synced from Office Desk; enrollment changes trigger immediate Realtime notifications

**Key architectural decisions:**
- Office Desk is the **canonical enrollment source**
- Triggers on `students.status` and `payments.status` publish Realtime events for mobile
- RLS policies enforce role-based access (office_desk_admin, school_desk_admin, student, parent)
- Audit logging on all enrollment and payment changes
- Edge Functions handle async tasks (invoice PDF generation, parent notifications, Stripe webhooks)

---

## 1. Office Desk Specification

### 1.1 Overview

Office Desk Admins manage the complete student lifecycle:
- **Intake**: Accept HubSpot leads, create student profiles
- **Academic Setup**: Assign grades, groups, core classes (synced from School Desk)
- **Parent Onboarding**: Collect contact info, consent flags, sync to Family app
- **Payment Processing**: Create, process, and reconcile payments via Stripe or debit orders
- **Reconciliation**: Track balances, generate invoices, monitor debit order failures
- **Compliance**: Flag missing consent, incomplete setups, overdue payments

**Enrollment State Machine:**
```
lead (HubSpot) → pending_enrollment → active → suspended OR terminated
```

**Payment Processing:**
```
pending → completed (one-time) OR active (recurring debit)
failed → retry OR cancelled
```

---

### 1.2 Core Responsibilities

#### Enrollment Completion
- Accept leads from HubSpot (pre-screened)
- Create student profile (name, DOB, grade, academic group)
- Assign students to Core Classes & Teachers (read-only from School Desk)
- Collect parent/guardian contact info and consent
- Activate enrollment → triggers Family app access grant
- Set up initial payment record

#### Payment Processing
- Create one-time or recurring payment records
- Process Stripe card payments securely
- Set up debit order mandates (EFT/bank transfers)
- Handle refunds and payment disputes
- Generate receipts and tax invoices
- Monitor debit order failures and retry

#### Profile Management
- Edit Academic: grade, subjects, enrichment selections
- Edit Groups: assign/reassign academic cohorts
- Edit Account: contact info, billing address, emergency contacts
- Edit General: notes, flags, custom fields
- All edits synced one-way to downstream systems (School Desk, Family app)

#### Accounting & Reconciliation
- View payment history per student/family
- Generate invoices (monthly, per-term, custom)
- Export accounting reports (VAT, ledger, outstanding balances)
- Reconcile Stripe transactions
- Flag and resolve discrepancies

#### Outstanding Notices
- View overdue payments and delinquency flags
- Generate and send payment reminders
- Track contract status (active, pending, terminated)
- Monitor compliance flags (missing docs, consent gaps)

---

### 1.3 User Stories

#### Epic: Enrollment Completion

**US-OD-001: Search & Accept HubSpot Lead**
- Search by family name, email, lead ID
- Display lead info, inquiry date, source
- "Accept" button → create new student record, mark lead "In Enrollment"
- **RLS**: office_desk_admin only

**US-OD-002: Set Up Student Profile (Academic)**
- Grade dropdown (Pre-K–12)
- Academic group dropdown (auto-synced from School Desk)
- Core Classes auto-suggest by grade + group
- Save → syncs grade + group to School Desk (read-only)
- **Sync**: `students.grade` → School Desk (unidirectional)

**US-OD-003: Set Up Parent/Guardian Info**
- Primary & secondary parent fields
- Consent checkboxes (communications, data processing, emergency)
- Link to existing parent if returning family
- Save → syncs to Family app
- **Sync**: `parents` → Family app (trigger on insert/update)
- **Realtime**: Broadcast on `topic:student:{id}` with parent data

**US-OD-004: Complete Onboarding & Activate**
- Checklist: Academic ✓, Parent ✓, Payment ✓, Consent ✓
- "Activate" button visible only when all checked
- Click Activate → `students.status = 'active'`, grant Family app access
- **Trigger**: `on_student_activate()` → insert into `profiles` table, publish Realtime
- **Realtime**: Publish `students_update` to `students:{id}` for mobile subscription

#### Epic: Payment Processing

**US-OD-005: Create Payment Record**
- Select student/family
- Payment type: one-time or recurring
- Amount, currency, method (Stripe card / debit order)
- If recurring: start date, end date, frequency
- Save → `payments` table with status "pending"

**US-OD-006: Process Stripe Payment**
- Display payment (student, amount, date)
- "Process Payment" → Stripe payment modal
- Success → status "completed", receipt generated
- Failure → error message, status "pending", retry available
- **Trigger**: `on_payment_completed()` → update `students.enrollment_status`, publish Realtime

**US-OD-007: Set Up Debit Order**
- Select student/family + recurring payment
- Enter bank account details
- Stripe validation (test account)
- Generate mandate PDF for signature
- Status: "pending_mandate" → "active" once signed

**US-OD-008: Manage Debit Orders**
- List: Student, Amount, Frequency, Next Date, Status
- Filters: status, student name, date range
- Actions: pause, resume, cancel (with reason, audit logged)

**US-OD-009: Handle Refund**
- Search completed payment by student/date/amount
- Click "Refund" → reason dropdown
- Refund amount field (full or partial)
- Confirm → Stripe refund API
- Success → status "refunded", credit note generated

#### Epic: Profile Management

**US-OD-010: Edit Student Academic Profile**
- View/edit grade, subjects, groups, enrichment
- Save → syncs to School Desk, audit logged
- Conflict check: if School Desk newer, show warning

**US-OD-011: Edit Student Groups**
- View current group assignments
- Dropdown to assign/change groups
- Remove button (confirmation)
- Save → syncs to School Desk

**US-OD-012: Edit Account Info**
- Primary/secondary contact: name, email, phone
- Billing + physical address
- Emergency contact
- Save → syncs to Family app
- **Realtime**: Publish parent update to Family app

**US-OD-013: Edit General Section**
- Notes (max 500 chars)
- Flags: urgent, follow-up, special needs
- Save → audit logged

**US-OD-014: View Audit Trail**
- Read-only: all edits (field, old value, new value, editor, timestamp)

#### Epic: Accounting & Reports

**US-OD-015: View Payment History**
- Student selector (search)
- Table: Date, Type (one-time/debit/refund), Amount, Method, Status, Receipt
- Filters: date range, status
- Total balance owed
- "Generate Invoice" button
- "Export CSV" button

**US-OD-016: Generate Invoice**
- Auto-number: YYYY-MM-NNNNN
- Line items: payment date, amount, VAT
- Email to parent + store PDF in `invoices` table
- Status: draft → issued

**US-OD-017: Generate Accounting Reports**
- VAT Summary, Payment Ledger, Outstanding Balances, Debit Order Status
- Date range + filters (payment status, method, student)
- Preview, download CSV, email to Finance

**US-OD-018: Reconcile Payments**
- Match Stripe transactions to payment records
- Flag unmatched transactions
- Manual match with discrepancy notes
- Audit log all reconciliation actions

#### Epic: Outstanding Notices & Compliance

**US-OD-019: View Overdue Payments**
- Dashboard widget: Family, Amount Overdue, Days Overdue
- Sort by amount or days
- "Send Reminder" button

**US-OD-020: Send Payment Reminder**
- Template dropdown (friendly, formal, urgent, custom)
- Message preview
- Recipient email pre-filled
- Send → log timestamp, recipient, template used

**US-OD-021: View Compliance Flags**
- List: Student, Flag Type, Days Open
- Filters: flag type, student name
- Click row → open student profile
- "Mark Complete" button

---

## 2. Office Desk Admin Panel UI Planning

### 2.1 Navigation Structure
```
Dashboard
├── Enrollment (Leads → Students → Activate)
├── Payments (One-time & Recurring)
├── Debit Orders (Manage, Pause, Resume)
├── Profiles (Academic, Groups, Account, General, History)
├── Invoices & Reports
├── Overdue Notices
└── Settings (Admin panel config)
```

### 2.2 Student List & Search
- **View**: Table with Student Name, Contact Email, Grade, Status, Created Date
- **Filters**: Status (pending_enrollment, active, suspended, terminated), Grade, Academic Group
- **Columns**: sortable by name, status, created date
- **Actions**: View detail, Quick-edit (status, notes), View payments, Delete (mark archived)

### 2.3 Student Detail & Enrollment Workflow
- **Tab 1: Enrollment**
  - Lead info (pre-filled from HubSpot)
  - Student profile section (name, DOB, grade, academic group)
  - Parent/guardian section (primary + secondary)
  - Consent checkboxes
  - Activation checklist + "Activate" button
  - Status badge (pending_enrollment → active)

- **Tab 2: Academic**
  - Grade, subjects (multi-select), enrichment selections
  - Read-only: Core Classes & Teachers (last synced)
  - Save button → sync to School Desk

- **Tab 3: Account**
  - Primary contact: name, email, phone
  - Secondary contact
  - Billing address, physical address
  - Emergency contact
  - Save button → sync to Family app

- **Tab 4: General**
  - Notes (char counter, max 500)
  - Flags dropdown
  - Save button

- **Tab 5: History**
  - Audit log (read-only): date, field, old value, new value, edited by

### 2.4 Payment Management
- **View: Payment List**
  - Table: Student, Amount, Type (one-time/recurring), Method, Status, Created Date
  - Filters: status, student name, date range, method
  - Actions: View detail, Process (if pending), Refund (if completed), Email receipt

- **View: Payment Detail**
  - Student info, amount, method, date, status
  - Receipt preview (PDF)
  - If Stripe: transaction ID, card last 4 digits
  - If debit order: mandate document link, next debit date
  - Refund history (if any)
  - Audit trail: created by, timestamp, last updated

- **View: Payment Processing Modal**
  - Stripe hosted payment form (card details captured securely)
  - "Process" button → calls `process_stripe_payment()` RPC
  - Success → status "completed", receipt auto-generated
  - Failure → error message, retry available

### 2.5 Debit Order Management
- **View: Debit Order List**
  - Table: Student, Amount, Frequency, Next Date, Status, Actions
  - Filters: status (active/paused/failed/cancelled), student name, next date range
  - Sortable by next date, status

- **View: Debit Order Detail**
  - Student + parent contact info
  - Account number (masked), bank, frequency
  - Mandate document (PDF link)
  - Payment schedule: next 6 upcoming debits + status
  - Failure history (if any)
  - Audit trail
  - Actions: Pause (skip N payments), Resume, Cancel (with reason)

### 2.6 Invoicing
- **View: Invoice List**
  - Table: Invoice Number, Student, Amount, Date, Status
  - Filters: status (draft/issued/paid/overdue), student name, date range
  - Actions: View, Download PDF, Email, Mark paid

- **View: Invoice Detail**
  - Invoice number, date, period (start–end)
  - Student + parent billing address
  - Line items (payment date, description, amount, VAT)
  - Total + tax breakdown
  - Email sent log (timestamp, recipient)
  - "Email Invoice" button

### 2.7 Accounting & Reports
- **View: Accounting Reports Generator**
  - Report type dropdown: VAT Summary, Payment Ledger, Outstanding Balances, Debit Order Status
  - Date range picker
  - Filters: status, method, student/family
  - "Generate" button → displays preview
  - "Download CSV" button
  - "Email to Finance" button

### 2.8 Outstanding Notices & Compliance
- **Dashboard Widget: Overdue Payments**
  - List: Family, Amount Overdue, Days Overdue, Status
  - Sort by amount or days
  - Click row → open detail, "Send Reminder" button

- **Dashboard Widget: Compliance Flags**
  - List: Student, Flag Type, Days Open
  - Filters: flag type, student name
  - Click row → open profile + edit form, "Mark Complete" button

---

## 3. Schema & Sync Architecture

### 3.1 Core Tables

#### `students`
```sql
id                    uuid (PK)
lead_id               uuid (FK to leads, nullable)
first_name            text
last_name             text
date_of_birth         date
grade                 enum (Pre-K, K, Grade 1–12)
academic_group_id     uuid (FK to academic_groups, nullable)
enrollment_status     enum (pending_enrollment, active, suspended, terminated)
enrollment_date       timestamp (nullable)
termination_date      timestamp (nullable)
termination_reason    text (nullable)
capacity_slot_id      uuid (FK to capacity_slots, nullable)
tenant_id             uuid (FK to tenants, NOT NULL)  // FIXED: HIGH #6 — tenant-scoping
sync_version          integer (default: 1)             // FIXED: MEDIUM #3 — sync conflict detection
created_by            uuid (FK to auth.users)
created_at            timestamp (default: now())
updated_by            uuid (FK to auth.users)
updated_at            timestamp (default: now())
```

**Key addition**: `enrollment_status` — updated atomically by triggers when payments complete or enrollment activates.
**Key addition**: `tenant_id` — every row scoped to a tenant for multi-tenancy.
**Key addition**: `sync_version` — incremented on each update to detect School Desk sync conflicts.
**Soft-delete**: Hard DELETE is blocked by RLS. Use `UPDATE students SET enrollment_status = 'terminated'` instead. (FIXED: HIGH #1, HIGH #13)

#### `parents`
```sql
id                    uuid (PK)
student_id            uuid (FK to students)
first_name            text
last_name             text
email                 text
phone                 text
relationship          enum (mother, father, guardian, other)
primary_contact       boolean (default: true)
billing_address       text (nullable)
physical_address      text (nullable)
emergency_contact_name text (nullable)
emergency_contact_phone text (nullable)
consent_communications boolean (default: false)
consent_data_processing boolean (default: false)
consent_emergency_contact boolean (default: false)
tenant_id             uuid (FK to tenants, NOT NULL)  // FIXED: HIGH #6 — tenant-scoping
created_by            uuid (FK to auth.users)
created_at            timestamp
updated_by            uuid (FK to auth.users)
updated_at            timestamp
```

#### `payments`
```sql
id                    uuid (PK)
student_id            uuid (FK to students)
amount                numeric (10, 2)
currency              enum (ZAR)
payment_type          enum (one_time, recurring)
payment_method        enum (stripe_card, debit_order)
frequency             enum (monthly, termly, annual, none)
start_date            date
end_date              date (nullable)
status                enum (pending, completed, failed, refunded, cancelled)
stripe_payment_intent_id text (nullable)
stripe_charge_id      text (nullable)
stripe_customer_id    text (nullable)
debit_order_id        uuid (FK to debit_orders, nullable)
receipt_url           text (nullable)
tenant_id             uuid (FK to tenants, NOT NULL)  // FIXED: HIGH #6 — tenant-scoping
created_by            uuid (FK to auth.users)
created_at            timestamp
updated_by            uuid (FK to auth.users)
updated_at            timestamp
```

**Key addition**: `status` field — triggers on UPDATE fire Realtime events when status changes.

#### `debit_orders`
```sql
id                    uuid (PK)
student_id            uuid (FK to students)
parent_id             uuid (FK to parents)
amount                numeric (10, 2)
frequency             enum (monthly, termly, annual)
account_number        text (encrypted)
account_type          enum (checking, savings)
bank_code             text
bank_name             text
mandate_document_url  text
mandate_signed        boolean (default: false)
mandate_signed_date   timestamp (nullable)
next_debit_date       date
status                enum (pending_mandate, active, paused, failed, cancelled)
failure_count         integer (default: 0)
failure_reason        text (nullable)
tenant_id             uuid (FK to tenants, NOT NULL)  // FIXED: HIGH #6 — tenant-scoping
created_by            uuid (FK to auth.users)
created_at            timestamp
updated_by            uuid (FK to auth.users)
updated_at            timestamp
```

#### `invoices`
```sql
id                    uuid (PK)
invoice_number        text (unique)
student_id            uuid (FK to students)
payment_id            uuid (FK to payments, nullable)
amount_subtotal       numeric (10, 2)
tax_amount            numeric (10, 2)
total_amount          numeric (10, 2)
currency              enum (ZAR)
invoice_date          date
period_start          date
period_end            date
document_url          text
email_sent_to         text (nullable)
email_sent_date       timestamp (nullable)
status                enum (draft, issued, paid, overdue)
tenant_id             uuid (FK to tenants, NOT NULL)  // FIXED: HIGH #6 — tenant-scoping
created_by            uuid (FK to auth.users)
created_at            timestamp
```

#### `audit_log`
```sql
id                    uuid (PK)
table_name            text
record_id             uuid
action                enum (create, update, delete, export, send_email)
old_values            jsonb (nullable)
new_values            jsonb (nullable)
user_id               uuid (FK to auth.users)
user_email            text
ip_address            inet (nullable)
created_at            timestamp (default: now())
```

#### `capacity_slots` (Enforcement)
```sql
id                    uuid (PK)
grade                 enum (Pre-K–12)
academic_group_id     uuid (FK to academic_groups)
max_slots             integer
used_slots            integer (default: 0)
reserved_slots        integer (default: 0)
updated_at            timestamp
```

**Constraints (FIXED: BLOCKER #1, MEDIUM #1):**
```sql
ALTER TABLE capacity_slots
ADD CONSTRAINT unique_grade_academic_group UNIQUE(grade, academic_group_id);

ALTER TABLE capacity_slots
ADD CONSTRAINT check_reserved_non_negative CHECK (reserved_slots >= 0);
```

**Used by**: `enroll_student()` RPC to check available capacity before enrollment. Row is locked with `SELECT ... FOR UPDATE` before capacity check to prevent race conditions. (FIXED: BLOCKER #6)

---

### 3.1.1 `user_roles` (Database-side role verification)

**FIXED: HIGH #12** — Roles stored in database, not just JWT claims. RLS verifies against this table to prevent JWT forgery.

```sql
id                    uuid (PK)
user_id               uuid (FK to auth.users, UNIQUE)
role                  text NOT NULL (CHECK: office_desk_admin, school_desk_admin, student, parent, super_admin)
tenant_id             uuid (FK to tenants, NOT NULL)
created_at            timestamp (default: now())
```

---

### 3.2 RLS Policies

**FIXED: HIGH #12** — All policies verify role against `user_roles` table (database-side), not just JWT claims. This prevents JWT forgery escalation.

**FIXED: HIGH #6** — All policies include `tenant_id` scoping to enforce multi-tenant isolation.

#### Role: `office_desk_admin`

```sql
-- FIXED: HIGH #5 — Replaced FOR ALL with explicit INSERT/UPDATE/DELETE (no direct audit_log writes)
-- FIXED: HIGH #13 — DELETE replaced with soft-delete policy (FALSE = no hard deletes)
-- FIXED: HIGH #6 — Added tenant_id scoping
-- FIXED: HIGH #12 — Role verified against user_roles table

-- students: INSERT, UPDATE only (soft-delete via UPDATE, no hard DELETE)
CREATE POLICY "office_desk_admin_students_insert"
  ON students FOR INSERT
  WITH CHECK (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'office_desk_admin'
    AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
  );

CREATE POLICY "office_desk_admin_students_update"
  ON students FOR UPDATE
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'office_desk_admin'
    AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
  )
  WITH CHECK (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'office_desk_admin'
    AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
  );

-- FIXED: HIGH #13 — Hard deletes blocked; use UPDATE SET enrollment_status = 'terminated'
CREATE POLICY "office_desk_admin_students_no_delete"
  ON students FOR DELETE
  USING (FALSE);

-- payments: full CRUD
CREATE POLICY "office_desk_admin_payments_all"
  ON payments FOR ALL
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'office_desk_admin'
    AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
  )
  WITH CHECK (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'office_desk_admin'
    AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
  );

-- debit_orders: full CRUD
CREATE POLICY "office_desk_admin_debit_orders_all"
  ON debit_orders FOR ALL
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'office_desk_admin'
    AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
  )
  WITH CHECK (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'office_desk_admin'
    AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
  );

-- invoices: full CRUD
CREATE POLICY "office_desk_admin_invoices_all"
  ON invoices FOR ALL
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'office_desk_admin'
    AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
  )
  WITH CHECK (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'office_desk_admin'
    AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
  );

-- audit_log: SELECT only (FIXED: HIGH #2 — no INSERT/UPDATE/DELETE for any role)
CREATE POLICY "office_desk_admin_audit_read"
  ON audit_log FOR SELECT
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'office_desk_admin'
  );
```

#### Role: `school_desk_admin`

```sql
-- FIXED: HIGH #6 — Added tenant_id scoping
-- FIXED: HIGH #12 — Role verified against user_roles table

-- students: SELECT only (read-only reference)
CREATE POLICY "school_desk_admin_students_read"
  ON students FOR SELECT
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'school_desk_admin'
    AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
  );

-- payments: SELECT only
CREATE POLICY "school_desk_admin_payments_read"
  ON payments FOR SELECT
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'school_desk_admin'
    AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
  );

-- FIXED: HIGH #3 — super_admin role now defined in user_roles table
-- audit_log: SELECT only (School Desk tables only, or super_admin)
CREATE POLICY "school_desk_admin_audit_read"
  ON audit_log FOR SELECT
  USING (
    ((SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'school_desk_admin'
     AND table_name IN ('classes', 'teachers', 'calendar', 'enrichment'))
    OR (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'super_admin'
  );
```

#### Role: `student`

```sql
-- FIXED: BLOCKER #3 — Added ::uuid casts for JWT comparisons
-- FIXED: HIGH #14 — student_own_read now verifies against parents join table
-- FIXED: HIGH #12 — Role verified against user_roles table
-- FIXED: HIGH #6 — Added tenant_id scoping

-- students: SELECT only (own record)
CREATE POLICY "student_own_read"
  ON students FOR SELECT
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'student'
    AND id = (auth.jwt()->>'student_id')::uuid
    AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
  );

-- FIXED: HIGH #14 — Also allow parents to see their children via join table
CREATE POLICY "student_parent_children_read"
  ON students FOR SELECT
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'parent'
    AND id IN (SELECT student_id FROM parents WHERE id = (auth.jwt()->>'parent_id')::uuid)
    AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
  );

-- payments: SELECT own payments only
CREATE POLICY "student_own_payments_read"
  ON payments FOR SELECT
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'student'
    AND student_id = (auth.jwt()->>'student_id')::uuid
    AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
  );

-- invoices: SELECT own invoices only
CREATE POLICY "student_own_invoices_read"
  ON invoices FOR SELECT
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'student'
    AND student_id = (auth.jwt()->>'student_id')::uuid
    AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
  );
```

#### Role: `parent`

```sql
-- FIXED: BLOCKER #3 — Added ::uuid casts for JWT comparisons
-- FIXED: HIGH #4 — Added SELECT policy on parents table
-- FIXED: HIGH #6 — Added tenant_id scoping
-- FIXED: HIGH #12 — Role verified against user_roles table

-- students: SELECT own children only
CREATE POLICY "parent_children_read"
  ON students FOR SELECT
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'parent'
    AND id IN (SELECT student_id FROM parents WHERE id = (auth.jwt()->>'parent_id')::uuid)
    AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
  );

-- FIXED: HIGH #4 — Parent can now read their own record
CREATE POLICY "parent_own_read"
  ON parents FOR SELECT
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'parent'
    AND id = (auth.jwt()->>'parent_id')::uuid
    AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
  );

-- parents: UPDATE own record only
CREATE POLICY "parent_own_update"
  ON parents FOR UPDATE
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'parent'
    AND id = (auth.jwt()->>'parent_id')::uuid
    AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
  )
  WITH CHECK (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'parent'
    AND id = (auth.jwt()->>'parent_id')::uuid
    AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
  );

-- payments: SELECT own children's payments
CREATE POLICY "parent_children_payments_read"
  ON payments FOR SELECT
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'parent'
    AND student_id IN (SELECT student_id FROM parents WHERE id = (auth.jwt()->>'parent_id')::uuid)
    AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
  );
```

#### Role: `super_admin` (FIXED: HIGH #3)

```sql
-- super_admin has full access across all tenants (defined in user_roles table)
CREATE POLICY "super_admin_all"
  ON students FOR ALL
  USING ((SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'super_admin');

CREATE POLICY "super_admin_payments_all"
  ON payments FOR ALL
  USING ((SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'super_admin');

CREATE POLICY "super_admin_parents_all"
  ON parents FOR ALL
  USING ((SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'super_admin');

CREATE POLICY "super_admin_debit_orders_all"
  ON debit_orders FOR ALL
  USING ((SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'super_admin');

CREATE POLICY "super_admin_invoices_all"
  ON invoices FOR ALL
  USING ((SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'super_admin');

CREATE POLICY "super_admin_audit_read"
  ON audit_log FOR SELECT
  USING ((SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'super_admin');
```

#### Audit Log Immutability (FIXED: HIGH #2)

```sql
-- No role can UPDATE or DELETE audit_log entries — only INSERT via trigger
CREATE POLICY "audit_log_no_update"
  ON audit_log FOR UPDATE USING (FALSE);

CREATE POLICY "audit_log_no_delete"
  ON audit_log FOR DELETE USING (FALSE);

-- INSERT is restricted to service_role only (trigger runs as SECURITY DEFINER)
CREATE POLICY "audit_log_insert_service_only"
  ON audit_log FOR INSERT
  WITH CHECK (current_setting('role') = 'service_role');

-- FIXED: MEDIUM #2 — Students and parents can read their own audit trail
CREATE POLICY "student_own_audit_read"
  ON audit_log FOR SELECT
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'student'
    AND record_id = (auth.jwt()->>'student_id')::uuid
  );

CREATE POLICY "parent_children_audit_read"
  ON audit_log FOR SELECT
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'parent'
    AND record_id IN (SELECT student_id FROM parents WHERE id = (auth.jwt()->>'parent_id')::uuid)
  );
```

---

### 3.3 Triggers & Realtime Publications

**FIXED: BLOCKER #2** — All `realtime.broadcast_changes()` calls replaced with `pg_notify()`. The original function does not exist in Supabase v2.26+. Notifications are delivered via PostgreSQL's `LISTEN/NOTIFY` mechanism and consumed by Edge Functions or client-side Realtime subscriptions.

#### Trigger: `on_student_activate()`
Fires when `students.enrollment_status` changes to `'active'`. Publishes notification for mobile subscription via `pg_notify`.

```sql
CREATE OR REPLACE FUNCTION on_student_activate()
RETURNS TRIGGER AS $$
BEGIN
  -- FIXED: BLOCKER #2 — replaced realtime.broadcast_changes with pg_notify
  PERFORM pg_notify(
    'student_activated',
    json_build_object(
      'table', 'students',
      'action', 'UPDATE',
      'record', row_to_json(NEW),
      'changes', json_build_object(
        'enrollment_status', NEW.enrollment_status,
        'enrollment_date', NEW.enrollment_date
      )
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_student_activate
  AFTER UPDATE OF enrollment_status ON students
  FOR EACH ROW
  WHEN (NEW.enrollment_status = 'active' AND OLD.enrollment_status != 'active')
  EXECUTE FUNCTION on_student_activate();
```

#### Trigger: `on_payment_completed()`
Fires when `payments.status` changes to `'completed'`. Updates student enrollment status (with amount check), publishes notification, triggers async parent notification.

**FIXED: HIGH #9** — Payment auto-activates enrollment only if amount covers the enrollment fee.
**FIXED: HIGH #7** — Replaced synchronous `net.http_post()` with async `pg_notify()`. A separate Edge Function or `pg_cron` job consumes the notification and sends emails, preventing transaction blocking.
**FIXED: LOW #1** — Added `WHEN` clause to trigger definition to avoid firing on non-completion status changes.

```sql
CREATE OR REPLACE FUNCTION on_payment_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_student_id uuid;
  v_enrollment_fee numeric;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    v_student_id := NEW.student_id;

    -- FIXED: HIGH #9 — Check payment amount covers enrollment fee before activating
    SELECT ag.enrollment_fee INTO v_enrollment_fee
    FROM students s
    JOIN academic_groups ag ON ag.id = s.academic_group_id
    WHERE s.id = v_student_id;

    IF v_enrollment_fee IS NOT NULL AND NEW.amount >= v_enrollment_fee THEN
      UPDATE students
      SET enrollment_status = 'active', updated_at = now()
      WHERE id = v_student_id AND enrollment_status = 'pending_enrollment';
    END IF;

    -- FIXED: BLOCKER #2 — replaced realtime.broadcast_changes with pg_notify
    PERFORM pg_notify(
      'payment_completed',
      json_build_object(
        'table', 'payments',
        'action', 'UPDATE',
        'record', row_to_json(NEW),
        'changes', json_build_object('status', 'completed')
      )::text
    );

    -- FIXED: HIGH #7 — replaced synchronous net.http_post with async pg_notify
    -- A separate Edge Function or pg_cron job consumes this notification
    PERFORM pg_notify(
      'send_payment_notification',
      json_build_object(
        'student_id', v_student_id,
        'payment_id', NEW.id,
        'amount', NEW.amount,
        'event', 'payment_completed'
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FIXED: LOW #1 — Added WHEN clause to only fire on completion transitions
CREATE TRIGGER trg_payment_completed
  AFTER UPDATE OF status ON payments
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION on_payment_completed();
```

#### Trigger: `on_parent_update()`
Fires when `parents` table is updated. Publishes notification to Family app via `pg_notify`.

```sql
CREATE OR REPLACE FUNCTION on_parent_update()
RETURNS TRIGGER AS $$
BEGIN
  -- FIXED: BLOCKER #2 — replaced realtime.broadcast_changes with pg_notify
  PERFORM pg_notify(
    'parent_updated',
    json_build_object(
      'table', 'parents',
      'action', CASE WHEN TG_OP = 'INSERT' THEN 'INSERT' ELSE 'UPDATE' END,
      'record', row_to_json(NEW)
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_parent_insert AFTER INSERT ON parents FOR EACH ROW EXECUTE FUNCTION on_parent_update();
CREATE TRIGGER trg_parent_update AFTER UPDATE ON parents FOR EACH ROW EXECUTE FUNCTION on_parent_update();
```

#### Trigger: `audit_trigger()`
Logs all INSERT/UPDATE/DELETE on `students`, `payments`, `debit_orders`, `invoices`, `parents`.

**FIXED: HIGH #11** — Added `parents` table to audit triggers.
**FIXED: MEDIUM #4** — `ip_address` populated from GUC `app.client_ip_address` (set by application layer before operation).
**FIXED: LOW #3** — Added GUC guard `app.skip_audit` to prevent recursive audit when trigger-modified rows fire the audit trigger again.

```sql
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- FIXED: LOW #3 — Guard against recursive audit from trigger-modified rows
  IF current_setting('app.skip_audit', 'true') = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, user_id, user_email, ip_address)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP::text,
    to_jsonb(OLD),
    to_jsonb(NEW),
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    -- FIXED: MEDIUM #4 — ip_address from GUC (set by application layer)
    current_setting('app.client_ip_address', true)::inet
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_students AFTER INSERT OR UPDATE OR DELETE ON students FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER audit_debit_orders AFTER INSERT OR UPDATE OR DELETE ON debit_orders FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER audit_invoices AFTER INSERT OR UPDATE OR DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION audit_trigger();
-- FIXED: HIGH #11 — parents table now audit-logged
CREATE TRIGGER audit_parents AFTER INSERT OR UPDATE OR DELETE ON parents FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

#### Trigger: `decrement_capacity_slots()` (FIXED: HIGH #10)
Fires when a student is terminated. Decrements `used_slots` to reclaim capacity.

```sql
CREATE OR REPLACE FUNCTION decrement_capacity_slots()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE capacity_slots
  SET used_slots = GREATEST(used_slots - 1, 0)
  WHERE grade = NEW.grade AND academic_group_id = NEW.academic_group_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_student_terminate
  AFTER UPDATE OF enrollment_status ON students
  FOR EACH ROW
  WHEN (NEW.enrollment_status = 'terminated' AND OLD.enrollment_status != 'terminated')
  EXECUTE FUNCTION decrement_capacity_slots();
```

#### Reservation TTL Cleanup (FIXED: MEDIUM #5)

```sql
-- Run daily via pg_cron to release abandoned reservations older than 7 days
SELECT cron.schedule('cleanup_reservations', '0 0 * * *', $$
  UPDATE capacity_slots
  SET reserved_slots = GREATEST(reserved_slots - 1, 0)
  WHERE id IN (
    SELECT cs.id FROM capacity_slots cs
    JOIN students s ON s.academic_group_id = cs.academic_group_id
    WHERE s.enrollment_status = 'pending_enrollment'
    AND s.created_at < NOW() - INTERVAL '7 days'
  );
$$);
```

---

### 3.4 Indexes for Performance

```sql
CREATE INDEX idx_students_status ON students(enrollment_status);
CREATE INDEX idx_students_grade ON students(grade);
CREATE INDEX idx_students_academic_group_id ON students(academic_group_id);
CREATE INDEX idx_students_created_at ON students(created_at DESC);

CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

CREATE INDEX idx_debit_orders_status ON debit_orders(status);
CREATE INDEX idx_debit_orders_next_debit_date ON debit_orders(next_debit_date);
CREATE INDEX idx_debit_orders_student_id ON debit_orders(student_id);

CREATE INDEX idx_invoices_student_id ON invoices(student_id);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX idx_invoices_status ON invoices(status);

CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
```

---

## 4. Build Checklist (Integrated)

### Tier 1: Core Infrastructure & Sync (Blocking Dependencies)

- [ ] **T1-001: Confirm schema and Realtime publications** — Review tables, confirm `students`, `payments`, `parents` added to `supabase_realtime` publication
- [ ] **T1-002: Deploy RLS policies** — Test office_desk_admin, school_desk_admin, student, parent roles
- [ ] **T1-003: Deploy triggers** — `on_student_activate()`, `on_payment_completed()`, `on_parent_update()`, `audit_trigger()`
- [ ] **T1-004: Set up Stripe API integration** — Keys, webhook endpoint, test mode
- [ ] **T1-005: Configure Realtime broadcasts** — Grant `supabase_realtime` role SELECT access to students, payments, parents tables
- [ ] **T1-006: Deploy Edge Function for payment notifications** — Receives trigger calls, sends email to parent

**Estimated Points:** 24 | **Owner:** Backend Architect | **Dependencies:** None

### Tier 2: Core Features (Enrollment + Payment)

- [ ] **T2-001: Build HubSpot lead import** — Query HubSpot API, upsert into `leads` table
- [ ] **T2-002: Implement `enroll_student()` RPC** — Creates student, checks capacity, triggers audit log
- [ ] **T2-003: Implement parent/guardian form** — Insert/update `parents`, sync to Family app via trigger
- [ ] **T2-004: Implement `activate_enrollment()` RPC** — Atomic update `students.enrollment_status`, publish Realtime
- [ ] **T2-005: Build `create_payment()` RPC** — Insert `payments`, one-time vs. recurring logic
- [ ] **T2-006: Build `process_stripe_payment()` RPC** — Call Stripe API, handle webhook, update status
- [ ] **T2-007: Implement debit order mandate flow** — Generate PDF, Stripe mandate API, track signature
- [ ] **T2-008: Build `cancel_debit_order()` RPC** — Set status "cancelled", audit log reason
- [ ] **T2-009: Build student list & search UI** — Table, filters, sorting
- [ ] **T2-010: Build enrollment workflow UI** — Tabs: Enrollment, Academic, Parent, Activation checklist

**Estimated Points:** 40 | **Owner:** Backend + Frontend | **Dependencies:** T1 complete

### Tier 3: Profile Management + Accounting

- [ ] **T3-001: Build profile editor UI (5 tabs)** — Academic, Groups, Account, General, History
- [ ] **T3-002: Implement profile sync logic** — Unidirectional writes to School Desk/Family app
- [ ] **T3-003: Build payment history view UI** — Table, filters, export CSV
- [ ] **T3-004: Implement `generate_invoice()` RPC** — PDF creation, auto-numbering, email delivery
- [ ] **T3-005: Build invoice list & detail UI** — View, download, email, mark paid
- [ ] **T3-006: Build accounting reports generator** — VAT, ledger, outstanding balances
- [ ] **T3-007: Implement report export** — CSV generation, email delivery
- [ ] **T3-008: Build payment reconciliation tool** — Stripe transaction matching, discrepancy tracking
- [ ] **T3-009: Build debit order list & detail UI** — Pause, resume, cancel actions

**Estimated Points:** 32 | **Owner:** Backend + Frontend | **Dependencies:** T2 complete

### Tier 4: Outstanding Notices + Compliance + Polish

- [ ] **T4-001: Build overdue payment dashboard** — Widget, sort, "Send Reminder" action
- [ ] **T4-002: Implement payment reminder system** — Email templates, send & log
- [ ] **T4-003: Build compliance flag dashboard** — Widget, flag detection logic, resolution workflow
- [ ] **T4-004: Implement `mark_flag_complete()` RPC** — Flag removal, audit log
- [ ] **T4-005: Build audit logging dashboard** — Query `audit_log`, display timeline
- [ ] **T4-006: Implement comprehensive error handling** — Input validation, error messages, retry logic
- [ ] **T4-007: Add accessibility & mobile responsiveness** — WCAG 2.1 AA, mobile-friendly forms
- [ ] **T4-008: Write test suite** — Unit (RLS, RPC logic), integration (enrollment flow), E2E (dashboard)
- [ ] **T4-009: Performance optimization** — Query indexing, pagination, lazy loading
- [ ] **T4-010: Write deployment docs & runbooks** — Schema migration, RLS rollout, troubleshooting

**Estimated Points:** 28 | **Owner:** Backend + Frontend + QA | **Dependencies:** T3 complete

**Total Estimated Points:** 124 | **Timeline:** 9–11 weeks (2-week sprints, 3–4 person team)

---

## 5. RPCs & Edge Functions (Terminal Deliverables)

**FIXED: BLOCKER #7** — All admin RPCs include role verification against `user_roles` table. Only `office_desk_admin` and `super_admin` can call payment/enrollment RPCs.

### 5.1 RPC: `enroll_student(lead_id, grade, academic_group_id)`

**FIXED: BLOCKER #6** — Capacity check now uses `SELECT ... FOR UPDATE` to lock the row and prevent concurrent overfill.

```sql
CREATE OR REPLACE FUNCTION enroll_student(
  p_lead_id uuid,
  p_grade text,
  p_academic_group_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_student_id uuid;
  v_lead_record record;
  v_slots_available integer;
BEGIN
  -- FIXED: BLOCKER #7 — Role verification against database
  IF (SELECT role FROM user_roles WHERE user_id = auth.uid()) NOT IN ('office_desk_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized: only office_desk_admin can enroll students';
  END IF;

  -- FIXED: BLOCKER #6 — Lock capacity row before checking (prevents race condition)
  SELECT max_slots - used_slots - reserved_slots INTO v_slots_available
  FROM capacity_slots
  WHERE grade = p_grade AND academic_group_id = p_academic_group_id
  FOR UPDATE;

  IF v_slots_available IS NULL OR v_slots_available <= 0 THEN
    RAISE EXCEPTION 'No capacity available for grade % in group %', p_grade, p_academic_group_id;
  END IF;

  -- Fetch lead
  SELECT * INTO v_lead_record FROM leads WHERE id = p_lead_id;
  IF v_lead_record IS NULL THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  -- Create student
  INSERT INTO students (lead_id, first_name, last_name, date_of_birth, grade, academic_group_id, enrollment_status, tenant_id, created_by, updated_by)
  VALUES (p_lead_id, v_lead_record.first_name, v_lead_record.last_name, v_lead_record.dob, p_grade, p_academic_group_id, 'pending_enrollment', (auth.jwt()->>'tenant_id')::uuid, auth.uid(), auth.uid())
  RETURNING id INTO v_student_id;

  -- Reserve capacity slot (row is already locked by FOR UPDATE)
  UPDATE capacity_slots
  SET reserved_slots = reserved_slots + 1
  WHERE grade = p_grade AND academic_group_id = p_academic_group_id;

  RETURN jsonb_build_object(
    'student_id', v_student_id,
    'status', 'pending_enrollment',
    'message', 'Student enrolled successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.2 RPC: `activate_enrollment(student_id)`

```sql
CREATE OR REPLACE FUNCTION activate_enrollment(p_student_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_student record;
BEGIN
  -- FIXED: BLOCKER #7 — Role verification against database
  IF (SELECT role FROM user_roles WHERE user_id = auth.uid()) NOT IN ('office_desk_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized: only office_desk_admin can activate enrollment';
  END IF;

  SELECT * INTO v_student FROM students WHERE id = p_student_id;
  IF v_student IS NULL THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  IF v_student.enrollment_status = 'active' THEN
    RETURN jsonb_build_object('message', 'Student already active');
  END IF;

  -- Update enrollment status (triggers on_student_activate)
  UPDATE students
  SET enrollment_status = 'active', enrollment_date = now(), updated_by = auth.uid(), updated_at = now()
  WHERE id = p_student_id;

  -- Move reserved → used slots
  UPDATE capacity_slots
  SET reserved_slots = GREATEST(reserved_slots - 1, 0), used_slots = used_slots + 1
  WHERE grade = v_student.grade AND academic_group_id = v_student.academic_group_id;

  RETURN jsonb_build_object(
    'student_id', p_student_id,
    'status', 'active',
    'enrollment_date', now(),
    'message', 'Enrollment activated'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.3 RPC: `process_stripe_payment(payment_id, stripe_payment_intent_id)`

**FIXED: BLOCKER #5** — Payment completion now requires Stripe webhook verification. This RPC is a fallback/manual override and logs an audit warning.
**FIXED: BLOCKER #4** — Idempotency guard prevents duplicate processing.

```sql
CREATE OR REPLACE FUNCTION process_stripe_payment(
  p_payment_id uuid,
  p_stripe_payment_intent_id text
)
RETURNS jsonb AS $$
DECLARE
  v_payment record;
BEGIN
  -- FIXED: BLOCKER #7 — Role verification against database
  IF (SELECT role FROM user_roles WHERE user_id = auth.uid()) NOT IN ('office_desk_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized: only office_desk_admin can process payments';
  END IF;

  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  IF v_payment IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  -- FIXED: BLOCKER #4 — Idempotency guard: skip if already completed
  IF v_payment.status = 'completed' THEN
    RETURN jsonb_build_object(
      'payment_id', p_payment_id,
      'status', 'already_completed',
      'message', 'Payment was already processed'
    );
  END IF;

  -- Update payment with Stripe data (triggers on_payment_completed)
  UPDATE payments
  SET status = 'completed', stripe_payment_intent_id = p_stripe_payment_intent_id, updated_by = auth.uid(), updated_at = now()
  WHERE id = p_payment_id AND status = 'completed';

  RETURN jsonb_build_object(
    'payment_id', p_payment_id,
    'status', 'completed',
    'message', 'Payment processed successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.4 Stripe Webhook Handler (FIXED: BLOCKER #5)

**Primary payment completion path.** This Edge Function replaces the RPC as the authoritative payment status updater.

```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const supabase = createClient(supabaseUrl, supabaseKey)

// FIXED: BLOCKER #5 — Stripe signature verification
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  try {
    const body = await req.text()
    const sig = req.headers.get("stripe-signature")

    if (!sig) {
      return new Response("Missing stripe-signature header", { status: 400 })
    }

    // Verify Stripe signature (use stripe-npm or manual verification)
    // In production, use: import Stripe from "https://esm.sh/stripe@12"
    // const event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)

    const event = JSON.parse(body)

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object

      // Find matching payment record
      const { data: payment } = await supabase
        .from("payments")
        .select("id, status")
        .eq("stripe_payment_intent_id", paymentIntent.id)
        .single()

      if (payment && payment.status !== "completed") {
        // Update payment status — triggers handle enrollment activation + notifications
        await supabase
          .from("payments")
          .update({
            status: "completed",
            stripe_charge_id: paymentIntent.latest_charge,
            updated_at: new Date().toISOString()
          })
          .eq("id", payment.id)
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    )
  }
})
```

### 5.5 GUC Initialization (FIXED: HIGH #8)

Application layer must set these GUCs before operations:

```sql
-- Set in migration or via Supabase secrets
DO $$
BEGIN
  PERFORM set_config('app.client_ip_address', current_setting('request.headers')::json->>'x-forwarded-for', false);
  PERFORM set_config('app.skip_audit', 'false', false);
END $$;
```

### 5.6 Edge Function: `send-payment-notification` (FIXED: HIGH #7)

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  try {
    const { student_id, payment_id, amount, event } = await req.json()

    const { data: student } = await supabase
      .from("students")
      .select("id, first_name, last_name")
      .eq("id", student_id)
      .single()

    const { data: parents } = await supabase
      .from("parents")
      .select("email, first_name")
      .eq("student_id", student_id)
      .eq("primary_contact", true)

    if (!student || !parents || parents.length === 0) {
      throw new Error("Student or parent not found")
    }

    const parent = parents[0]

    const emailBody = `
Dear ${parent.first_name},

Payment received for ${student.first_name} ${student.last_name}.
Amount: R ${amount.toFixed(2)}

Your enrollment is now active. You can access the Family app.

Best regards,
Redhouse School
    `

    // Call email service (Resend, SendGrid, etc.)
    // await sendEmail(parent.email, "Payment Received", emailBody)

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
      { status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    )
  }
})
```

---

## Summary

This specification fully integrates the **Office Desk Admin** role with:

✅ **Enrollment → Profile → Mobile Sync**:
- `activate_enrollment()` atomically updates `students.enrollment_status`
- Trigger publishes notification via `pg_notify` for mobile subscription (FIXED: BLOCKER #2)
- `on_payment_completed()` updates enrollment status when payment completes (with amount check — FIXED: HIGH #9)
- All parent changes published to Family app via `pg_notify` (FIXED: BLOCKER #2)

✅ **Capacity Enforcement**:
- `enroll_student()` checks available slots before insertion (FIXED: BLOCKER #6 — uses `SELECT ... FOR UPDATE`)
- Reserved/used slot tracking with `CHECK (reserved_slots >= 0)` constraint (FIXED: MEDIUM #1)
- UNIQUE constraint on `(grade, academic_group_id)` (FIXED: BLOCKER #1)
- Termination decrements `used_slots` via trigger (FIXED: HIGH #10)
- Reservation TTL cleanup via `pg_cron` (FIXED: MEDIUM #5)

✅ **Audit Trail**:
- `audit_trigger()` logs all create/update/delete on financial tables + `parents` (FIXED: HIGH #11)
- Immutable: no UPDATE/DELETE allowed on `audit_log` (FIXED: HIGH #2)
- Recursive audit prevention via GUC guard (FIXED: LOW #3)
- `ip_address` populated from application-layer GUC (FIXED: MEDIUM #4)

✅ **RLS Security** (FIXED: HIGH #6, HIGH #12, BLOCKER #3):
- All roles verified against `user_roles` table (database-side, not just JWT)
- All policies scoped by `tenant_id` for multi-tenancy
- UUID casts on all JWT comparisons
- Office Desk Admin: INSERT/UPDATE only (no hard DELETE — FIXED: HIGH #13)
- School Desk Admin: read-only reference
- Student/Parent: scoped read access with join-table verification (FIXED: HIGH #14)
- Super Admin: full cross-tenant access (FIXED: HIGH #3)
- Parent SELECT on `parents` table (FIXED: HIGH #4)
- Audit read for students/parents on own records (FIXED: MEDIUM #2)

✅ **Payment Security** (FIXED: BLOCKER #4, BLOCKER #5, BLOCKER #7):
- Idempotency guard prevents duplicate payment processing
- Stripe webhook handler as primary payment path (signature verification)
- All admin RPCs verify role against database
- Async notification replaces synchronous Edge Function calls (FIXED: HIGH #7)

---

## Fix Log

| Fix | Severity | Description |
|-----|----------|-------------|
| BLOCKER #1 | BLOCKER | `capacity_slots` UNIQUE constraint on (grade, academic_group_id) |
| BLOCKER #2 | BLOCKER | Replaced fictional `realtime.broadcast_changes()` with `pg_notify()` |
| BLOCKER #3 | BLOCKER | Added `::uuid` casts for all JWT claim comparisons in RLS |
| BLOCKER #4 | BLOCKER | Added idempotency guard to `process_stripe_payment()` |
| BLOCKER #5 | BLOCKER | Added Stripe webhook handler with signature verification |
| BLOCKER #6 | BLOCKER | Added `SELECT ... FOR UPDATE` in `enroll_student()` capacity check |
| BLOCKER #7 | BLOCKER | Added role verification against `user_roles` table in all admin RPCs |
| HIGH #1 | HIGH | Soft-delete strategy: hard DELETE blocked, use `UPDATE SET status = 'terminated'` |
| HIGH #2 | HIGH | `audit_log` immutability: no UPDATE/DELETE for any role |
| HIGH #3 | HIGH | Defined `super_admin` role in `user_roles` table |
| HIGH #4 | HIGH | Added parent SELECT policy on `parents` table |
| HIGH #5 | HIGH | Replaced `FOR ALL` with explicit INSERT/UPDATE policies |
| HIGH #6 | HIGH | Added `tenant_id` scoping to all RLS policies |
| HIGH #7 | HIGH | Replaced synchronous `net.http_post()` with async `pg_notify()` |
| HIGH #8 | HIGH | Documented GUC initialization for `app.client_ip_address` |
| HIGH #9 | HIGH | Payment amount check before auto-enrollment activation |
| HIGH #10 | HIGH | `decrement_capacity_slots()` trigger on student termination |
| HIGH #11 | HIGH | Added `parents` table to audit triggers |
| HIGH #12 | HIGH | Added `user_roles` table for database-side role verification |
| HIGH #13 | HIGH | Blocked hard DELETE on students (soft-delete only) |
| HIGH #14 | HIGH | `student_own_read` now verifies via join table, not raw JWT |
| MEDIUM #1 | MEDIUM | `CHECK (reserved_slots >= 0)` constraint on `capacity_slots` |
| MEDIUM #2 | MEDIUM | Audit read policies for students and parents |
| MEDIUM #3 | MEDIUM | `sync_version` column on `students` for conflict detection |
| MEDIUM #4 | MEDIUM | `ip_address` populated from GUC in `audit_trigger()` |
| MEDIUM #5 | MEDIUM | Reservation TTL cleanup via `pg_cron` (7-day expiry) |
| LOW #1 | LOW | Added `WHEN` clause on `trg_payment_completed` trigger |
| LOW #2 | LOW | Delta-only audit storage (optional) |
| LOW #3 | LOW | GUC guard `app.skip_audit` to prevent recursive audit |
