# OFFICE DESK ARCHITECTURE — UPDATED (Integrated Best Practices)

**Status:** CORRECTED & ENHANCED — Ready for migration & building

**Date:** 2026-08-22

---

**Key Additions:**

- Multi-student registration from single family account
- Two-stage data separation (registration form vs. enrollment profile)
- Role-based user profile architecture (Family, Student, Teacher, Admin)
- Invoice-first payment ledger (Invoice → Debit Order → Payment)
- Activity log for complete transaction audit trail

---

## 1. REGISTRATION & ENROLLMENT ARCHITECTURE (CORRECTED)

### 1.1 Multi-Student Registration from Single Family Account

**Current Gap:** Existing schema treats registration as 1:1 with student.

**Corrected Model:** One family account can initiate multiple registrations (for siblings).

**Architecture:**

**Registration Session** (temporary, inquiry-focused): Lightweight, reusable across siblings

- Family logs in → initiates "Add Student" in registration flow
- Captures: student name, DOB, intake group, curriculum choice
- Payment made at registration session level

**Student Enrollment Profile** (persistent, academic-focused): Created only after acceptance

- Contains all Fields.pdf STUDENT attributes (grade, subjects, clubs, enrichment)
- Auto-created via Make.com webhook on acceptance
- Synced to School Desk for class assignment

**Workflow:**

1. Family initiates registration session (sibling 1)
2. Payment processed → registration archived to Office Desk
3. On acceptance → student profile created in Supabase
4. For sibling 2: same family account → new registration session → separate student profile
5. Both students linked to one family account (billing anchor)

**Advantage:** No duplication; one family contact record; each student has independent academic history.

---

### 1.2 Two-Stage Data Separation

| Layer | Purpose | Fields | Owner |
|-------|---------|--------|-------|
| **Registration Form** | Inquiry & intent capture | Name, DOB, intake group, core curriculum choice, preferred schedule zone | Family (Supabase, admin panel) |
| **Enrollment Profile** | Academic & operational identity | Current subjects + teachers, clubs, grade, years enrolled, report cards, access_expiry | LMS (Supabase, Redhouse) |
| **Booking/Contract** | Payment & access control | Invoice, debit_order, payment status, class schedule (student_class) | Office Desk (Admin) |

**Workflow:**

1. Registration form → Supabase registration + scheduling link
2. On acceptance → Make.com webhook writes student to Supabase with status `pending_init`
3. Enrollment profile auto-populates from curriculum choice, teacher assignments post-registration
4. Schedule/calendar sync via `student_class` only after enrollment status = `active`

---

### 1.3 User Profile Architecture (Family Account Focus)

**Family Account** (Auth: email, password; Supabase `auth.users`)

- Billing contact, invoice recipient
- Can manage multiple student children
- Role: `parent` (includes payment authority)

**Student Profile** (linked to Family Account)

- Fields from Fields.pdf STUDENT table
- No standalone auth (parent logs in, selects child)
- Contains academic state: grade, subjects, report cards, clubs, enrichment, status
- Auto-generates on Make.com webhook acceptance

**Teacher/Admin Profile** (Phase 2 — Out of MVP)

- Separate auth, separate login
- Subject/club assignment, grade submission

**Schema:**

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  timezone TEXT,
  role TEXT DEFAULT 'parent', -- parent, teacher, admin
  created_at TIMESTAMP
);

CREATE TABLE students (
  id UUID PRIMARY KEY,
  family_id UUID REFERENCES profiles(id), -- multi-student link
  name TEXT NOT NULL,
  surname TEXT NOT NULL,
  date_of_birth DATE,
  current_grade TEXT,
  core_curriculum TEXT,
  status TEXT DEFAULT 'pending_init', -- pending_init, active, paused, inactive
  access_expiry DATE,
  created_at TIMESTAMP
);

CREATE TABLE student_class (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  subject_id UUID,
  teacher_id UUID,
  class_schedule JSONB,
  status TEXT,
  enrolled_at TIMESTAMP
);
```

---

## 2. PAYMENT PROCESSING ARCHITECTURE (CORRECTED)

### 2.1 Invoice-First Payment Ledger

**FIXED:** All payments must have an invoice first. Debit order executes against invoice.

**Payment Flow:**

1. **Create Invoice** (Office Desk)
   - Tied to family/student
   - `invoice_id`, `family_id`, `student_id`, `amount`, `due_date`, `items`
   - Status: `draft → issued → paid / overdue / disputed`

2. **Present Invoice to Family**
   - Email, portal, payment link
   - Family reviews line items

3. **Authorize Debit Order**
   - Family clicks payment link
   - Approves debit order amount & frequency
   - Debit order status → `pending`

4. **Payment Processor Executes**
   - Debit order processes
   - Payment received
   - Debit order status → `processed`
   - Activity log: `payment_received`, amount, timestamp

5. **Reconciliation**
   - If paid in full: invoice status → `paid`
   - If partial: create new invoice for remainder
   - Unlink paid debit order

**Schema:**

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  family_id UUID REFERENCES profiles(id),
  student_id UUID REFERENCES students(id),
  invoice_number TEXT UNIQUE,
  amount_due DECIMAL(10, 2),
  issued_date DATE,
  due_date DATE,
  items JSONB, -- [{course_id, description, amount}, ...]
  status TEXT DEFAULT 'draft', -- draft, issued, paid, overdue, disputed
  created_at TIMESTAMP
);

CREATE TABLE debit_orders (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) NOT NULL,
  family_id UUID REFERENCES profiles(id),
  amount DECIMAL(10, 2),
  frequency TEXT, -- once, monthly, per_term
  status TEXT DEFAULT 'pending', -- pending, processed, failed, refunded
  processed_at TIMESTAMP,
  created_at TIMESTAMP
);

CREATE TABLE family_activity (
  id UUID PRIMARY KEY,
  family_id UUID REFERENCES profiles(id),
  student_id UUID REFERENCES students(id),
  invoice_id UUID REFERENCES invoices(id),
  debit_order_id UUID REFERENCES debit_orders(id),
  action TEXT, -- invoice_created, payment_received, refund_issued, etc.
  amount DECIMAL(10, 2),
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

### 2.2 Payment Types in Office Desk

#### 1. Registration Payment (From Front Desk)

- Family fills form → makes payment → payment confirmed in bank → archived to Office Desk
- Office Desk uses registration code to match and activate enrollment

#### 2. Debit Orders (Monthly Recurring)

- Monthly invoices sent before debit taken
- Marked "paid" once debit order processes
- Office Desk can adjust amount, add additional orders
- Amount scales by pack choice + year selection

#### 3. Failed Debit Handling

- Per plan when debit does not go through
- Tech can invoice separately for ad-hoc charges

#### 4. Ad-Hoc Invoices (Office Desk Admin Charges)

- School administration invoices for service providers
- Must attach invoice from service provider
- Separate from student enrollment payment
- Attached to family account (not individual student)

---

### 2.3 Family Account Structure

- One family account = one login
- Family account has multiple users attached:
  - **Adult users:** Father, Mother, Guardian, Grandparent, Family Member, Sponsor, Other
  - **Student users:** Children (multiple possible)
  - **Teacher users:** (Phase 2, managed by Office Desk)
  - **Admin users:** (Phase 2)
- Each user type has own profile
- **Family account is billed — not individual students**
- All payments/debit orders/invoices tied to family account

---

### 2.4 Score Packages & Add-On Payments

**Score Packages** (Different pricing tiers on debit)

- Package A, Package B, Package C
- Each has base pricing
- Invoice determines which package → sets debit amount
- Can be scaled by year selection (annual vs. termly)

**Add-On Payments** (Extra services, separate line items)

- Tech charges, enrichment modules, service provider fees
- Invoiced separately or combined per family policy
- Tracked in `add_on_payments` table
- Attached to either family account or student profile

**Schema:**

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_name TEXT UNIQUE NOT NULL,
  grade TEXT,
  base_amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'termly', 'annual')),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE add_on_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id),
  invoice_id UUID REFERENCES invoices(id),
  add_on_type TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid', 'archived')),
  created_at TIMESTAMP DEFAULT now()
);
```

---

### 2.5 Payment vs. Debit Order vs. Invoice

| Concept | Owner | Purpose | Timing | Status |
|---------|-------|---------|--------|--------|
| **Payment** | Office Desk | Family makes payment (one-time or recurring) | Per transaction | Pending → Completed/Failed |
| **Debit Order** | Office Desk | Monthly invoice sent before debit taken | Monthly (recurring) | Pending → Active/Paused/Failed |
| **Invoice** | Office Desk | School admin charges (service provider, ad-hoc) | As needed | Draft → Issued → Paid |
| **Activity Log Entry** | Office Desk | Audit trail of all payment activity | Every transaction | Immutable record |

---

## 3. OFFICE DESK CORE RESPONSIBILITIES (EXISTING + CORRECTED)

### 3.1 Enrollment Completion

- Accept leads from Front Desk (pre-screened)
- Create student profile (name, DOB, grade, academic group)
- Assign students to Core Classes & Teachers (read-only from School Desk)
- Collect parent/guardian contact info and consent
- Activate enrollment → triggers Family app access grant
- Set up initial invoice & payment record

### 3.2 Payment Processing (CORRECTED)

- **Create invoice first** (tied to family/student, with line items)
- **Create debit order against invoice** (amount, frequency)
- Process Stripe card payments securely
- Handle refunds and payment disputes
- Generate receipts and tax invoices
- Monitor debit order failures and retry
- **Log all activity to `family_activity` table**

### 3.3 Profile Management

- Edit Academic: grade, subjects, enrichment
- Edit Groups: assign/reassign academic cohorts
- Edit Account: contact info, billing address, emergency contacts
- Edit General: notes, flags, custom fields
- All edits synced one-way to downstream systems

### 3.4 Accounting & Reconciliation

- View payment history per student/family
- Generate invoices (monthly, per-term, custom)
- Export accounting reports (VAT, ledger, outstanding balances)
- Reconcile Stripe transactions
- Flag and resolve discrepancies

### 3.5 Outstanding Notices

- View overdue payments and delinquency flags
- Generate and send payment reminders
- Track contract status (active, pending, terminated)
- Monitor compliance flags (missing docs, consent gaps)

---

## 4. SCHEMA MIGRATION STRATEGY

### Current → Corrected

| What Exists (Migrations 100 + 179) | Corrected Schema |
|-------------------------------------|------------------|
| `office_desk.registrations` (flat: student_name, student_email, parent_email) | `family_accounts` → `users` → `students` (normalized) |
| `office_desk.payments` FK → `invoices` | `payments` FK → `family_accounts` (standalone) |
| `office_desk.invoices` FK → `registrations` | `invoices` FK → `family_accounts` (admin/service) |
| No packages table | `packages` table for pricing tiers |
| Broken `debit_orders` (migration 171 FK issue) | `debit_orders` FK → `family_accounts` + `students` + `packages` |
| No `add_on_payments` | `add_on_payments` for extras |
| No `family_accounts` | `family_accounts` as billing anchor |
| No `users` table | `users` table with `user_type` + `role` |
