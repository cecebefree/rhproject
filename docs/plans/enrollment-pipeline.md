# Enrollment Pipeline — Complete Design Plan

**Status:** DRAFT — Awaiting Cece Review
**Date:** 2026-09-10 (v3 — all decisions resolved)

---

## 1. Key Definitions

### Curriculum Model (NON-NEGOTIABLE)
- Each student has **ONE core curriculum**: Cambridge, IB, KABV, or Home School
- Students can additionally join **clubs** (Junior/Mid/Senior school) and **enrichment courses** (Junior/Senior school)
- No curriculum mixing — one core, many extras

### Class Structure
- **Intake groups** — which intake cohort the student belongs to
- **Zones** — geographic or organizational groupings
- **Classes** — Class A, Class B, Class C, etc. within a grade/curriculum
- A student is assigned to ONE class per core curriculum

### Debit Order Minimum
- R5 — just confirms account is open and connected
- NOT a financial threshold — verification only

### Email Provider
- **Brevo** (production: noreply@redhouse.co.za)
- `BREVO_API_KEY` — Server-only, Edge Functions

---

## 2. Pipeline Architecture

### 2.1 Two Parallel Pipelines

```
WEBSITE SIGN-UP
      |
      v
FRONT DESK (existing) --> hand-off --> OFFICE DESK
                                           |
                          +----------------+----------------+
                          v                v                v
                    FAMILY ENROLLMENT  TEACHER ENROLLMENT  (future: staff)
```

### 2.2 Family Enrollment Pipeline — 10 Stages

| # | Stage | Trigger | Auto-Email | Action |
|---|-------|---------|------------|--------|
| 1 | Registration Confirmed | Front Desk hand-off | "Registration received — what happens next" | Office Desk picks up |
| 2 | Enrollment Form Sent | Agent sends link | "Complete your enrollment form" | Unique form link (NO expiry — stays open until manually closed) |
| 3 | Form Submitted | Family submits form | "Enrollment received — reviewing" | Form data stored for processing |
| 4 | Profiles Created | Agent creates accounts | "Family account set up — login details" | family_account + adult + student profiles |
| 5 | Contract Generated | System auto-generates | "Your enrollment contract is ready" | PDF contract (enrollment terms + payment mandate) |
| 6 | Contract Signed | Family signs (digital or PDF upload) | "Contract received — thank you" | Signature captured, contract stored |
| 7 | Curriculum & Schedule Selected | Agent assigns | "Curriculum and schedule assigned" | Core curriculum + class + intake + zone + clubs/enrichment |
| 8 | Debit Verified | R5 minimum check | "Payment verified" OR "Payment issue" | Gating step — confirms account works |
| 9 | Human Review & Approve | Manager reviews | "Enrollment approved — welcome!" | profiles.registration_status = approved |
| 10 | Active | System activates | (none — already sent) | Student can log in, LMS, mobile app |

### 2.3 Form Lifecycle — No Expiry, Auto Follow-Up

**The enrollment form has NO expiry.** The pipeline manages follow-up automatically:

```
Form Sent (Stage 2)
      |
      +--> Day 3: Auto-reminder email ("Complete your enrollment form")
      |
      +--> Day 7: Auto-reminder email ("Reminder: complete your form")
      |
      +--> Day 14: Auto-reminder email ("Final reminder: form still open")
      |
      +--> Day 21: Pipeline agent calls family (manual follow-up)
      |
      +--> Day 30+: Pipeline stays open, agent decides:
             - Keep following up (family interested but slow)
             - Close pipeline (registration didn't convert)
                   -> Auto-email: "We haven't heard from you — re-enroll anytime"
                   -> Pipeline status = 'closed_no_conversion'
```

**Best practice (from industry research):**
- Forms stay open until manually closed by an agent
- Auto-follow-up cadence: 3 days, 7 days, 14 days, then manual
- Closed pipelines can be re-opened if family responds
- No hard expiry — families may take weeks to decide
- Agent has final say on when to close

**Contract signing follows the same pattern:**
- No expiry on contract link
- Auto-reminders at 3, 7, 14 days
- Stays open until signed or manually voided

### 2.4 Teacher Enrollment Pipeline — 7 Stages

| # | Stage | Trigger | Auto-Email | Action |
|---|-------|---------|------------|--------|
| 1 | Application Received | Website form or manual | "Application received" | Office Desk picks up |
| 2 | Profile Created | Agent creates profile | "Teacher profile set up" | profile(role=teacher) created |
| 3 | Contract Generated | System auto-generates | "Your teaching contract is ready" | PDF contract |
| 4 | Contract Signed | Teacher signs | "Contract received — thank you" | Signature captured |
| 5 | Subjects & Schedule Assigned | Agent assigns | "Assignments and schedule ready" | Subjects, grades, class instances |
| 6 | Human Review & Approve | Manager reviews | "Welcome to the team!" | profiles.registration_status = approved |
| 7 | Active | System activates | (none) | Teacher can manage classes |

---

## 3. Contract System

### 3.1 Contract Content
Single document combining:
- **Enrollment terms** — school rules, policies, expectations, code of conduct
- **Payment mandate** — debit order authorization, payment schedule, fees

### 3.2 Contract Generation
- Auto-generated from a template using **jsPDF** (open source, MIT)
- System fills in: family name, student names, curriculum, grade, fees, payment details
- Generated at Stage 5 (after profiles created, before scheduling)
- Stored as PDF in Supabase Storage

### 3.3 Digital Signature — Custom Build

**Decision: Custom implementation using open-source libraries.**

**Why custom (not third-party like DocuSign):**
- No per-signature cost
- Full control over UX
- Self-hosted, no external dependency
- Fits existing stack (Supabase + Edge Functions)
- South African market — DocuSign/HelloSign expensive and unfamiliar to families

**Libraries:**
- `signature_pad` (v4.x) — MIT license, 12k+ GitHub stars, canvas-based signature capture
- `jsPDF` (v2.x) — MIT license, PDF generation and manipulation

**Implementation:**
1. Family opens contract link in browser
2. Reviews PDF contract in viewer
3. Signs using canvas pad (draw with mouse/finger)
4. Signature embedded into PDF
5. Signed PDF stored in Supabase Storage
6. Signature metadata (who, when, IP) stored in database
7. Contract status updated to "signed"

**Also supports:** PDF download + wet ink upload (for families who prefer paper)

### 3.4 Contract Storage
- Original (unsigned) PDF stored in Supabase Storage
- Signed PDF stored alongside
- Signature metadata (who, when, method, IP) stored in `office_desk.contracts`
- Contract version tracked (for yearly renewals)

---

## 4. Returning Students — Yearly Rollover

### 4.1 Automatic Yearly Rollover

**Decision: Automatic each year, triggered by admin.**

**What happens annually:**
1. Admin triggers yearly rollover (or it runs on a configured date)
2. All students with `registration_status = 'approved'` and `status = 'active'` are eligible
3. System auto-promotes each student to next grade (once passed on report card)
4. New enrollment year/term created
5. Students become "Returning" type with "Pending" contract status
6. New contract auto-generated for the new year
7. Family receives contract to sign
8. Once signed, student is active for new year

**What stays the same:**
- Student profile (name, DOB, etc.)
- Family account
- Payment method (unless family updates)
- Core curriculum (unless family requests change)

**What changes:**
- Grade (auto-promoted)
- Contract (new year, new signature)
- Class assignment (may change based on new grade)
- Schedules (updated for new term)
- Payments (updated for new year fees)

### 4.2 Grade Progression

**Decision: Auto-promote once passed on report card.**

- System checks `school_desk.gradebook` for final grades
- Students who pass are auto-promoted to next grade
- Students who fail stay in current grade (manual review by Office Desk)
- Graduating students (final grade) become Alumni
- Grade promotion happens during yearly rollover

### 4.3 Student Lifecycle

| Status | Meaning | Next Action |
|--------|---------|-------------|
| Active | Currently enrolled, attending | Yearly rollover |
| Active - On Hold | Enrolled but paused (payment issue, etc.) | Resolve hold, then rollover |
| Withdrawn | Left mid-year | Archive after EOY |
| Graduated | Completed final grade | Move to Alumni |
| Alumni | Former student (full retention) | Archive for reference |

### 4.4 Archive — Full Retention

**Decision: Full retention always, no purging.**

- Alumni data retained indefinitely
- Withdrawn students archived but restorable
- All historical records (grades, attendance, contracts, payments) preserved
- No auto-purge
- Archive is for organizational purposes, not deletion

---

## 5. Automated Class Assignment

### 5.1 Why Automation is Required

At 1000+ students, manual class assignment is impossible. System must auto-assign with human approval.

### 5.2 Assignment Algorithm

```
For each student in enrollment pipeline (Stage 7):

1. FILTER available class instances by:
   - program_id matches student's core curriculum
   - grade matches student's grade
   - term matches current enrollment term
   - status = 'published' (not draft)
   - current_students < max_students (capacity available)

2. CHECK constraints:
   - No time overlap with student's existing enrolled classes
   - Student's intake group matches class intake group (if configured)
   - Student's zone matches class zone (if configured)

3. SCORE each available class instance:
   - +10: Class has fewer students (prefer smaller classes)
   - +5: Class has students from same zone
   - +3: Class time matches student preference (morning/afternoon)
   - +1: Class has students from same intake group

4. ASSIGN to highest-scoring class instance
   - If no class available: flag for manual assignment
   - If capacity full: flag for waitlist or manual review

5. HUMAN CHECK:
   - Office Desk agent reviews all auto-assignments
   - Can override/reassign before approval
   - Once approved: enrollment confirmed, email sent
```

### 5.3 Assignment Approval Flow

```
System auto-assigns students to classes
      |
      v
Office Desk Dashboard shows:
  - Auto-assigned students (pending approval)
  - Conflicts requiring manual resolution
  - Waitlist for full classes
      |
      v
Agent reviews each assignment:
  - Approve (individual or bulk)
  - Reassign (change class)
  - Flag for manager review
      |
      v
Manager final approval
      |
      v
Auto-email: "Your classes have been assigned — here's your schedule"
```

### 5.4 Database Design

```sql
CREATE TABLE office_desk.class_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  class_instance_id UUID NOT NULL REFERENCES office_desk.class_instances(id),
  pipeline_id UUID REFERENCES office_desk.enrollment_pipelines(id),
  assignment_type TEXT DEFAULT 'auto' CHECK (assignment_type IN ('auto', 'manual')),
  score NUMERIC(5,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waitlisted')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(student_id, class_instance_id)
);
```

---

## 6. Data Model — New Tables

### 6.1 `office_desk.enrollment_pipelines`

```sql
CREATE TABLE office_desk.enrollment_pipelines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  registration_id UUID REFERENCES office_desk.registrations(id),
  lead_id UUID REFERENCES front_desk.leads(id),
  pipeline_type TEXT NOT NULL CHECK (pipeline_type IN ('family', 'teacher')),
  stage TEXT NOT NULL DEFAULT 'registration_confirmed',
  family_account_id UUID REFERENCES office_desk.family_accounts(id),
  form_token TEXT UNIQUE,
  form_sent_at TIMESTAMPTZ,
  form_submitted_at TIMESTAMPTZ,
  contract_id UUID REFERENCES office_desk.contracts(id),
  stage_updated_at TIMESTAMPTZ DEFAULT NOW(),
  stage_history JSONB DEFAULT '[]'::JSONB,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  access_approved_at TIMESTAMPTZ,
  access_approved_by UUID,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold', 'closed_no_conversion')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### 6.2 `office_desk.enrollment_forms`

```sql
CREATE TABLE office_desk.enrollment_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  pipeline_id UUID REFERENCES office_desk.enrollment_pipelines(id),
  form_type TEXT NOT NULL CHECK (form_type IN ('family', 'teacher')),
  form_data JSONB NOT NULL,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'processing', 'processed', 'rejected')),
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### 6.3 `office_desk.contracts`

```sql
CREATE TABLE office_desk.contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  pipeline_id UUID REFERENCES office_desk.enrollment_pipelines(id),
  family_account_id UUID REFERENCES office_desk.family_accounts(id),
  contract_type TEXT NOT NULL CHECK (contract_type IN ('enrollment', 'teacher', 'renewal')),
  version INTEGER DEFAULT 1,
  template_version TEXT NOT NULL,
  pdf_storage_path TEXT,
  signed_pdf_storage_path TEXT,
  signature_method TEXT CHECK (signature_method IN ('digital', 'pdf_upload')),
  signed_by UUID,
  signed_at TIMESTAMPTZ,
  signature_data JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'expired', 'voided')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### 6.4 `office_desk.class_instances`

```sql
CREATE TABLE office_desk.class_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  program_id UUID NOT NULL REFERENCES school_desk.programs(id),
  teacher_id UUID REFERENCES public.profiles(id),
  term TEXT NOT NULL,
  grade TEXT NOT NULL,
  class_section TEXT NOT NULL,
  intake_group TEXT,
  zone TEXT,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_students INTEGER DEFAULT 30,
  current_students INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### 6.5 `office_desk.class_assignments`

```sql
CREATE TABLE office_desk.class_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  class_instance_id UUID NOT NULL REFERENCES office_desk.class_instances(id),
  pipeline_id UUID REFERENCES office_desk.enrollment_pipelines(id),
  assignment_type TEXT DEFAULT 'auto' CHECK (assignment_type IN ('auto', 'manual')),
  score NUMERIC(5,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waitlisted')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(student_id, class_instance_id)
);
```

### 6.6 `office_desk.student_class_enrollments`

```sql
CREATE TABLE office_desk.student_class_enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  class_instance_id UUID NOT NULL REFERENCES office_desk.class_instances(id),
  pipeline_id UUID REFERENCES office_desk.enrollment_pipelines(id),
  enrollment_type TEXT DEFAULT 'new' CHECK (enrollment_type IN ('new', 'returning')),
  status TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'active', 'withdrawn', 'transferred')),
  enrolled_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(student_id, class_instance_id)
);
```

### 6.7 `office_desk.enrollment_history`

```sql
CREATE TABLE office_desk.enrollment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  family_account_id UUID REFERENCES office_desk.family_accounts(id),
  enrollment_year TEXT NOT NULL,
  grade TEXT NOT NULL,
  curriculum TEXT NOT NULL,
  class_section TEXT,
  status TEXT NOT NULL,
  contract_id UUID REFERENCES office_desk.contracts(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### 6.8 Modifications to Existing Tables

**`office_desk.family_accounts` — add:**
- `primary_adult_id UUID REFERENCES public.profiles(id)`
- `contact_email TEXT`
- `contact_phone TEXT`
- `address JSONB`
- `payment_method TEXT CHECK (payment_method IN ('debit_order', 'card', 'eft', 'cash'))`
- `debit_order_minimum NUMERIC(10,2)`
- `pipeline_id UUID REFERENCES office_desk.enrollment_pipelines(id)`

**`public.profiles` — add:**
- `family_account_id UUID REFERENCES office_desk.family_accounts(id)`
- `date_of_birth DATE`
- `student_number TEXT`
- `enrollment_pipeline_id UUID REFERENCES office_desk.enrollment_pipelines(id)`
- `access_granted_at TIMESTAMPTZ`
- `onboarding_completed_at TIMESTAMPTZ`
- `intake TEXT`
- `zone TEXT`
- `class_section TEXT`
- `enrollment_year TEXT`
- `next_grade TEXT`
- `enrollment_type TEXT DEFAULT 'new' CHECK (enrollment_type IN ('new', 'returning'))`

**`office_desk.registrations` — add:**
- `pipeline_id UUID REFERENCES office_desk.enrollment_pipelines(id)`

---

## 7. Enrollment Form Fields (Delta from Registration)

### 7.1 What Registration Form Already Collects

| Field | Registration | Enrollment Form |
|-------|-------------|-----------------|
| Family email | Yes | Pre-filled (read-only) |
| Child first name | Yes (as "child_name") | Pre-filled (read-only) |
| Child DOB | Yes | Pre-filled (read-only) |
| Payment amount | Yes | Pre-filled (read-only) |
| Payment method | Yes (Stripe/PayPal) | Pre-filled (read-only) |

### 7.2 What Enrollment Form Must Collect (NEW fields)

**Section A: Family Information** (required)
- Family surname
- Contact phone
- Physical address: street, city, province, postal code
- Payment method confirmation (debit_order | card | eft | cash)

**Section B: Parent/Guardian Details** (min 1, max 3 — all required)
- First name
- Last name
- Email
- Phone
- Relationship: father | mother | guardian | sponsor | grandparent | other
- Is primary contact? (one must be primary)
- ID/Passport number

**Section C: Student Details** (min 1, max 6 — all required)
- Last name (first name pre-filled from registration)
- Gender
- Grade (dropdown from configured grades)
- Core curriculum: Cambridge | IB | KABV | Home School
- Intake group (dropdown)
- Zone (dropdown)
- Class preference: A | B | C (optional — system can auto-assign)
- Medical conditions / allergies (free text)
- Emergency contact name
- Emergency contact phone

**Section D: Additional Students** (optional — add more children)
- Same fields as Section C for each additional student

**Section E: Preferences** (optional)
- Preferred schedule: morning | afternoon | flexible
- Clubs of interest: multi-select from configured clubs
- Enrichment courses: multi-select from configured courses
- Special needs / notes: free text

---

## 8. Office Desk Management UI

### 8.1 Enrollment Pipeline Dashboard

**View: Kanban board with columns per stage**
- Registration Confirmed
- Form Sent (with follow-up count)
- Form Submitted
- Profiles Created
- Contract Sent
- Contract Signed
- Curriculum Selected
- Debit Verified
- Human Review
- Active

**Filters:** Pipeline type (family/teacher), status, date range, agent

**Actions per pipeline:**
- View pipeline details (timeline, form data, profiles, contract)
- Move to next stage (with validation)
- Send email (auto or manual)
- Generate/send contract
- Add notes
- Hold / Close

### 8.2 Class Assignment Dashboard

**View: Table with auto-assigned students**
- Student name, grade, curriculum
- Assigned class instance
- Assignment score
- Status (pending/approved/rejected)
- Conflict flags

**Actions:**
- Approve individual assignments
- Bulk approve all
- Reassign to different class
- Flag for manager review
- View conflict details

### 8.3 Family Account Management

**View: Family detail page**
- Family account info
- Linked adults and students
- Enrollment history (by year)
- Schedule overview
- Contract status
- Payment status
- Activity log

### 8.4 Teacher Management

**View: Teacher list + detail page**
- Profile info
- Assigned subjects and grades
- Class instances (schedule)
- Student roster per class
- Contract status

### 8.5 Class Instance Management

**View: Class instance list (filterable by term, program, teacher, grade, section)**
- Program name, teacher, time slot
- Current enrollment vs capacity
- Grade, section, intake group, zone

---

## 9. Mobile App Integration

| Screen | Data Source | Notes |
|--------|------------|-------|
| Home | `school_desk.enrollments` + `class_instances` | Combined schedule view |
| Classes | `student_class_enrollments` + `class_instances` | Student's enrolled classes |
| Schedule | `class_instances` filtered by student | Weekly timetable |
| Profile | `public.profiles` | Student/parent profile |
| Notifications | `office_desk.notifications` | Enrollment status updates |

---

## 10. Auto-Email Templates

### 10.1 Family Pipeline (8 emails)

| Stage | Subject | Key Content |
|-------|---------|-------------|
| 1. Registration Confirmed | Welcome to Redhouse — Registration Received | Thank you. Next: complete enrollment form. |
| 2. Form Sent | Complete Your Redhouse Enrollment | Unique form link. No expiry — complete at your pace. |
| 3. Form Submitted | Enrollment Received — Review in Progress | We have your details. Office team reviewing. |
| 4. Profiles Created | Your Family Account is Ready | Login credentials, portal access, what's next. |
| 5. Contract Generated | Your Enrollment Contract is Ready | Review and sign. Link to digital signature or PDF upload. |
| 6. Contract Signed | Contract Received — Thank You | Confirmation. Next: curriculum and schedule assignment. |
| 7. Curriculum Selected | Curriculum & Schedule Assigned | Summary of curriculum, classes, timetable. |
| 8. Debit Verified / Access Approved | Welcome to Redhouse! | Full access details, LMS login, mobile app. |

### 10.2 Follow-Up Emails (auto-scheduled)

| Day | Subject | Trigger |
|-----|---------|---------|
| Day 3 | Reminder: Complete Your Enrollment Form | Form not submitted |
| Day 7 | Reminder: Your Form is Still Open | Form not submitted |
| Day 14 | Final Reminder: Form Still Open | Form not submitted |
| Day 3 | Reminder: Sign Your Contract | Contract not signed |
| Day 7 | Reminder: Contract Still Awaiting Signature | Contract not signed |

### 10.3 Teacher Pipeline (6 emails)

| Stage | Subject | Key Content |
|-------|---------|-------------|
| 1. Application Received | Teacher Application Received | Thank you. Review timeline. |
| 2. Profile Created | Your Teacher Account is Ready | Login credentials, portal access. |
| 3. Contract Generated | Your Teaching Contract is Ready | Review and sign. |
| 4. Contract Signed | Contract Received — Thank You | Confirmation. Next: assignments. |
| 5. Subjects Assigned | Teaching Assignments Set Up | Subjects, grades, availability. |
| 6. Access Approved | Welcome to the Team! | Full access, first-day instructions. |

---

## 11. Implementation Phases

### Phase 1: Database Schema
1. Create `office_desk.enrollment_pipelines`
2. Create `office_desk.enrollment_forms`
3. Create `office_desk.contracts`
4. Create `office_desk.class_instances`
5. Create `office_desk.class_assignments`
6. Create `office_desk.student_class_enrollments`
7. Create `office_desk.enrollment_history`
8. Modify `office_desk.family_accounts` (add columns)
9. Modify `public.profiles` (add columns)
10. Modify `office_desk.registrations` (add column)
11. Add RLS policies
12. Add indexes

### Phase 2: Edge Functions
1. `create-pipeline` — Initialize pipeline from registration
2. `send-enrollment-form` — Generate form token, send email
3. `submit-enrollment-form` — Receive form, store data
4. `process-enrollment` — Create profiles from form data
5. `generate-contract` — Auto-generate PDF from template (jsPDF)
6. `send-contract` — Send contract link via email
7. `sign-contract` — Capture digital signature (signature_pad)
8. `verify-debit-order` — R5 minimum check
9. `approve-enrollment` — Final approval, grant access
10. `send-pipeline-email` — Stage-specific email via Brevo
11. `auto-assign-classes` — Run assignment algorithm
12. `yearly-rollover` — Grade promotion + contract renewal

### Phase 3: Office Desk UI
1. Pipeline dashboard (Kanban/table)
2. Pipeline detail view
3. Class assignment dashboard (approve/reassign)
4. Family account management page
5. Teacher management page
6. Class instance management page
7. Contract viewer/signer (signature_pad integration)
8. Yearly rollover management

### Phase 4: Integration
1. Wire Front Desk hand-off to pipeline creation
2. Wire mobile app to read class_instances
3. Wire LMS to read enrollments from new tables
4. Test end-to-end flow

---

## 12. Open Items

1. **Contract template** — Dummy template to be created, then refined with Cece
2. **Enrollment form UI** — Full form with all fields listed in Section 7
3. **Class assignment algorithm** — Scoring weights to be tuned after first semester data
4. **Report card integration** — How grades feed into promotion logic (Phase 2+)
