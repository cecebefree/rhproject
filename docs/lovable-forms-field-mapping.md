# Lovable Forms → Supabase Field Mapping

| Field | Status |
|-------|--------|
| **Date** | 2026-09-08 |
| **Purpose** | Map all Lovable form fields to CRM/database columns for wiring |
| **Source** | https://redhouse.lovable.app |

---

## FORM 1: Contact Form (`/contact`)

**Source type:** `contact_form` → `front_desk.leads`

| # | Form Field | DB Column | Table | Notes |
|---|-----------|-----------|-------|-------|
| 1 | First name | `name` | `front_desk.leads` | Combine first + last into `name` |
| 2 | Last name | `name` | `front_desk.leads` | Combine first + last into `name` |
| 3 | Email | `email` | `front_desk.leads` | Required, unique per lead |
| 4 | Country | `tags` | `front_desk.leads` | Store as tag, e.g. `['country:South Africa']` |
| 5 | Phone | `phone` | `front_desk.leads` | |
| 6 | Preferred curriculum | `tags` | `front_desk.leads` | Store as tag, e.g. `['curriculum:Cambridge']` |
| 7 | Student age | `notes` | `front_desk.leads` | Append to notes: "Student age: X" |
| 8 | How can we help? | `notes` | `front_desk.leads` | Main message body |
| 9 | (auto) Source | `source` | `front_desk.leads` | Set to `'Contact Form'` |
| 10 | (auto) Source type | `source_type` | `front_desk.leads` | Set to `'contact_form'` |
| 11 | (auto) Status | `status` | `front_desk.leads` | Set to `'enquiry'` |
| 12 | (auto) Tenant ID | `tenant_id` | `front_desk.leads` | From JWT or default |

**Ticket number:** Auto-generated via `front_desk.leads.id` (UUID)

**Auto-email:** Send confirmation to submitter with ticket number

**Also insert into:** `front_desk.inquiries` (for SPA Front Desk view)

| # | Form Field | DB Column | Table | Notes |
|---|-----------|-----------|-------|-------|
| 1 | First + Last name | `contact_name` | `front_desk.inquiries` | |
| 2 | Email | `contact_email` | `front_desk.inquiries` | UNIQUE |
| 3 | Phone | `contact_phone` | `front_desk.inquiries` | |
| 4 | Country | `country_residence` | `front_desk.inquiries` | |
| 5 | Student age | `age_or_child_age` | `front_desk.inquiries` | |
| 6 | Preferred curriculum | `program_interest` | `front_desk.inquiries` | Map: Cambridge→LMS, IB→LMS, Homeschool→Other |
| 7 | How can we help? | `message_body` | `front_desk.inquiries` | |
| 8 | (auto) Source | `source` | `front_desk.inquiries` | Set to `'website_form'` |

---

## FORM 2: Registration Form (`/registration`)

**Source type:** `registration` → `front_desk.leads`

| # | Form Field | DB Column | Table | Notes |
|---|-----------|-----------|-------|-------|
| 1 | First name | `name` | `front_desk.leads` | Combine first + last |
| 2 | Last name | `name` | `front_desk.leads` | Combine first + last |
| 3 | Email | `email` | `front_desk.leads` | Required |
| 4 | Phone number | `phone` | `front_desk.leads` | |
| 5 | Your relation to child | `tags` | `front_desk.leads` | e.g. `['relation:Mother']` |
| 6 | Preferred payment currency | `tags` | `front_desk.leads` | e.g. `['currency:USD']` |
| 7 | Family's primary language | `tags` | `front_desk.leads` | e.g. `['language:English']` |
| 8 | Family's primary faith | `tags` | `front_desk.leads` | e.g. `['faith:Christian']` |
| 9 | (auto) Source | `source` | `front_desk.leads` | Set to `'Registration'` |
| 10 | (auto) Source type | `source_type` | `front_desk.leads` | Set to `'registration'` |
| 11 | (auto) Status | `status` | `front_desk.leads` | Set to `'qualified'` |
| 12 | (auto) Existing profile | `existing_profile` | `front_desk.leads` | Set to `false` |

**Post-registration:** After payment, handoff to Office Desk for enrollment processing

**Also insert into:** `front_desk.inquiries` (for SPA Front Desk view)

| # | Form Field | DB Column | Table | Notes |
|---|-----------|-----------|-------|-------|
| 1 | First + Last name | `contact_name` | `front_desk.inquiries` | |
| 2 | Email | `contact_email` | `front_desk.inquiries` | UNIQUE |
| 3 | Phone | `contact_phone` | `front_desk.inquiries` | |
| 4 | Relation to child | `intake_group` | `front_desk.inquiries` | e.g. `'parent'` |
| 5 | (auto) Source | `source` | `front_desk.inquiries` | Set to `'website_form'` |
| 6 | (auto) Program interest | `program_interest` | `front_desk.inquiries` | Set based on curriculum selection |

---

## FORM 3: Careers/Teachers Application (`/careers-forms`)

**Source type:** `teacher_application` → `front_desk.leads`

| # | Form Field | DB Column | Table | Notes |
|---|-----------|-----------|-------|-------|
| 1 | Full name | `name` | `front_desk.leads` | |
| 2 | Email | `email` | `front_desk.leads` | Required |
| 3 | Country | `tags` | `front_desk.leads` | e.g. `['country:South Africa']` |
| 4 | Phone | `phone` | `front_desk.leads` | |
| 5 | Applying for | `tags` | `front_desk.leads` | e.g. `['role:Cambridge Core Subjects']` |
| 6 | LinkedIn or portfolio | `notes` | `front_desk.leads` | Append to notes |
| 7 | Cover note | `notes` | `front_desk.leads` | Main body in notes |
| 8 | (auto) Source | `source` | `front_desk.leads` | Set to `'Teachers & Careers'` |
| 9 | (auto) Source type | `source_type` | `front_desk.leads` | Set to `'teacher_application'` |
| 10 | (auto) Status | `status` | `front_desk.leads` | Set to `'enquiry'` |
| 11 | (auto) Tags | `tags` | `front_desk.leads` | Include `'type:teacher_application'` |

**Auto-email:** Send confirmation with application reference number

**Also insert into:** `front_desk.inquiries`

| # | Form Field | DB Column | Table | Notes |
|---|-----------|-----------|-------|-------|
| 1 | Full name | `contact_name` | `front_desk.inquiries` | |
| 2 | Email | `contact_email` | `front_desk.inquiries` | UNIQUE |
| 3 | Phone | `contact_phone` | `front_desk.inquiries` | |
| 4 | (auto) Source | `source` | `front_desk.inquiries` | Set to `'website_form'` |
| 5 | (auto) Program interest | `program_interest` | `front_desk.inquiries` | Set to `'Other'` |

---

## FORM 4: Schedule 15-min Call (`/reserve-a-call`)

**Source type:** `live_call_booking` → `front_desk.leads`

| # | Form Field | DB Column | Table | Notes |
|---|-----------|-----------|-------|-------|
| 1 | Parent / guardian name | `name` | `front_desk.leads` | |
| 2 | Email | `email` | `front_desk.leads` | Required |
| 3 | Phone | `phone` | `front_desk.leads` | |
| 4 | Country & city | `tags` | `front_desk.leads` | e.g. `['country:Singapore']` |
| 5 | Preferred date | `callback_scheduled_at` | `front_desk.leads` | Store as timestamptz |
| 6 | Preferred time-zone window | `time_zone` | `front_desk.leads` | e.g. `'Morning (local)'` |
| 7 | Call format | `tags` | `front_desk.leads` | e.g. `['format:Encrypted video']` |
| 8 | General interest | `tags` | `front_desk.leads` | e.g. `['curriculum:Cambridge']` |
| 9 | What would you like to ask? | `notes` | `front_desk.leads` | |
| 10 | (auto) Source | `source` | `front_desk.leads` | Set to `'Schedule a Call'` |
| 11 | (auto) Source type | `source_type` | `front_desk.leads` | Set to `'live_call_booking'` |
| 12 | (auto) Status | `status` | `front_desk.leads` | Set to `'qualified'` |
| 13 | (auto) Callback status | `callback_status` | `front_desk.leads` | Set to `'pending'` |

**Also insert into:** `front_desk.inquiries`

| # | Form Field | DB Column | Table | Notes |
|---|-----------|-----------|-------|-------|
| 1 | Parent / guardian name | `contact_name` | `front_desk.inquiries` | |
| 2 | Email | `contact_email` | `front_desk.inquiries` | UNIQUE |
| 3 | Phone | `contact_phone` | `front_desk.inquiries` | |
| 4 | Country & city | `country_residence` | `front_desk.inquiries` | |
| 5 | Preferred date | `call_scheduled_at` | `front_desk.inquiries` | |
| 6 | Time-zone window | `timezone` | `front_desk.inquiries` | |
| 7 | General interest | `program_interest` | `front_desk.inquiries` | Map to enum |
| 8 | What would you like to ask? | `message_body` | `front_desk.inquiries` | |
| 9 | (auto) Source | `source` | `front_desk.inquiries` | Set to `'callback_request'` |

**Auto-email:** Send confirmation with scheduled time + ticket number

---

## FORM 5: Schedule Enrollment Call (`/schedule-enrollment-call`)

**Source type:** `enrollment_call_booking` → `front_desk.leads`

| # | Form Field | DB Column | Table | Notes |
|---|-----------|-----------|-------|-------|
| 1 | Parent / guardian name | `name` | `front_desk.leads` | |
| 2 | Email | `email` | `front_desk.leads` | Required |
| 3 | Phone | `phone` | `front_desk.leads` | |
| 4 | Country & city | `tags` | `front_desk.leads` | e.g. `['country:UAE']` |
| 5 | Preferred date | `callback_scheduled_at` | `front_desk.leads` | Store as timestamptz |
| 6 | Preferred time-zone window | `time_zone` | `front_desk.leads` | e.g. `'Afternoon (local)'` |
| 7 | Meeting format | `tags` | `front_desk.leads` | e.g. `['format:Encrypted video']` |
| 8 | Curriculum interest | `tags` | `front_desk.leads` | e.g. `['curriculum:IB']` |
| 9 | What would you like to cover? | `notes` | `front_desk.leads` | |
| 10 | (auto) Source | `source` | `front_desk.leads` | Set to `'Enrolment Call'` |
| 11 | (auto) Source type | `source_type` | `front_desk.leads` | Set to `'enrollment_call_booking'` |
| 12 | (auto) Status | `status` | `front_desk.leads` | Set to `'qualified'` |
| 13 | (auto) Callback status | `callback_status` | `front_desk.leads` | Set to `'pending'` |

**Also insert into:** `front_desk.inquiries`

| # | Form Field | DB Column | Table | Notes |
|---|-----------|-----------|-------|-------|
| 1 | Parent / guardian name | `contact_name` | `front_desk.inquiries` | |
| 2 | Email | `contact_email` | `front_desk.inquiries` | UNIQUE |
| 3 | Phone | `contact_phone` | `front_desk.inquiries` | |
| 4 | Country & city | `country_residence` | `front_desk.inquiries` | |
| 5 | Preferred date | `call_scheduled_at` | `front_desk.inquiries` | |
| 6 | Time-zone window | `timezone` | `front_desk.inquiries` | |
| 7 | Curriculum interest | `program_interest` | `front_desk.inquiries` | Map to enum |
| 8 | What would you like to cover? | `message_body` | `front_desk.inquiries` | |
| 9 | (auto) Source | `source` | `front_desk.inquiries` | Set to `'callback_request'` |

**Auto-email:** Send confirmation with scheduled time + ticket number

---

## FIELDS NOT YET IN DATABASE (need migration)

| Form | Missing Field | Suggested Column | Table | Type |
|------|--------------|------------------|-------|------|
| Registration | Relation to child | `relation_to_child` | `front_desk.leads` | text |
| Registration | Payment currency | `preferred_currency` | `front_desk.leads` | text |
| Registration | Family language | `preferred_language` | `front_desk.leads` | text |
| Registration | Family faith | `preferred_faith` | `front_desk.leads` | text |
| Careers | Applying for | `applied_role` | `front_desk.leads` | text |
| Careers | LinkedIn/portfolio | `portfolio_url` | `front_desk.leads` | text |
| 15-min Call | Call format | `call_format` | `front_desk.leads` | text |
| Enrollment Call | Meeting format | `call_format` | `front_desk.leads` | text |

**Alternative:** Use `tags` text[] array for all of these (already supported). No migration needed.

---

## EMAIL FLOW

### On form submission:
1. Insert into `front_desk.leads` → get `lead_id`
2. Insert into `front_desk.inquiries` → get `inquiry_id`
3. Insert into `front_desk.email_logs` → log the auto-email sent
4. Send confirmation email to submitter with:
   - Ticket number (`lead_id` or formatted `RH-{short-uuid}`)
   - What happens next
   - Contact info

### Front Desk / Office Desk email:
1. Both desks see the lead in their respective views
2. When staff replies, log to `front_desk.email_logs`
3. `email_logs.lead_id` links back to the lead
4. Both desks can see email history via `email_logs`

### Call logging (general contact number):
1. Call comes in → log to `front_desk.call_logs`
2. `call_logs.lead_id` links to the lead
3. `call_logs.direction` = `'inbound'`
4. `call_logs.outcome` = result of call
5. Front Desk + Office Desk both see call history

---

## TICKET NUMBER FORMAT

```
RH-{first 8 chars of UUID}
Example: RH-a3f8b2c1
```

Generated from `front_desk.leads.id` after insert.

---

## AUTO-EMAIL TEMPLATES

### 1. Contact Form Confirmation
```
Subject: Redhouse — Your enquiry has been received (Ticket: {ticket})

Hi {first_name},

Thank you for contacting Redhouse. Your enquiry has been received and assigned ticket number {ticket}.

Our admissions team will respond within one working day (GMT).

What happens next:
- A counselor will review your enquiry
- You'll receive a personal response within 24 hours
- If needed, we'll schedule a call at a time that suits you

If you have urgent questions, call us at +44 20 4600 000.

Best regards,
Redhouse Admissions
```

### 2. Registration Confirmation
```
Subject: Redhouse — Registration received (Ticket: {ticket})

Hi {first_name},

Your registration has been received and assigned ticket number {ticket}.

Once your payment reflects, your personal Redhouse Family Agent will be in touch to guide you through every step of the enrolment.

What happens next:
- Payment verification (if applicable)
- Family Agent assignment
- Enrolment process begins

Best regards,
Redhouse Admissions
```

### 3. Teacher Application Confirmation
```
Subject: Redhouse — Application received (Ref: {ticket})

Hi {full_name},

Thank you for your interest in joining Redhouse. Your application has been received with reference number {ticket}.

Every application is read personally by the head of faculty. We will be in touch if your profile matches our current or future openings.

Best regards,
Redhouse Faculty
```

### 4. 15-min Call Confirmation
```
Subject: Redhouse — Call scheduled (Ticket: {ticket})

Hi {name},

Your 15-minute introductory call has been requested for {preferred_date} ({timezone_window}).

Ticket number: {ticket}

Our admissions team will confirm the exact slot within one working day. The call will be on encrypted video at the time confirmed.

Best regards,
Redhouse Admissions
```

### 5. Enrollment Call Confirmation
```
Subject: Redhouse — Enrolment meeting scheduled (Ticket: {ticket})

Hi {name},

Your one-hour enrolment meeting has been requested for {preferred_date} ({timezone_window}).

Ticket number: {ticket}

The head of admissions will confirm the exact slot within one working day. The meeting will be on encrypted video.

Best regards,
Redhouse Admissions
```

---

## CALL LOG FLOW (General Contact Number)

When a call is received on the general number (+44 20 4600 000):

1. **Zadarma webhook** fires → creates `front_desk.call_logs` entry
2. `call_logs.direction` = `'inbound'`
3. `call_logs.lead_id` linked to matching lead (by phone number) or NULL if new
4. **If new caller:** Create lead first, then link call
5. **Front Desk sees:** All inbound calls in their feed
6. **Office Desk sees:** Calls related to their enrolled students/leads

### Call log fields:
| Field | Value |
|-------|-------|
| `tenant_id` | From JWT |
| `lead_id` | Matched by phone or NULL |
| `direction` | `'inbound'` |
| `outcome` | `'answered'` / `'missed'` / etc. |
| `duration_seconds` | From Zadarma |
| `notes` | Staff notes after call |

---

## NEXT STEPS

1. **Confirm field mapping** — Check all fields against actual Lovable form code
2. **Add missing columns** (optional) — Or use `tags` array for flexibility
3. **Create Edge Function** — `submit-contact-form` to handle all 5 forms
4. **Wire Lovable forms** — Point form actions to the Edge Function
5. **Set up email sending** — Resend/SendGrid integration
6. **Test end-to-end** — Submit form → lead created → email sent → Front Desk sees it
