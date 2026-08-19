# Front Desk — Full Architecture Specification

Status: SPEC — architecture vision, implementation pending  
Recorded: 2026-08-18  
Supersedes: portions of `front-desk-registration.md` where conflicts arise  
Related migrations: 078, 095, 096, 106, 107, 108, 109, 115, 127, 129, 143  

---

## 0. Current State (Existing Migrations)

The following tables and policies already exist. The target architecture in
Sections 1–10 extends or replaces these.

| Migration | Object | Status |
|-----------|--------|--------|
| 078 | `public.leads` (id, tenant_id, name, email, phone, notes, status) | EXISTS — basic intake |
| 095/096 | `front_desk.leads` SELECT policies | EXISTS |
| 106 | RLS for `front_desk.leads` (admin all, front_desk CRUD, office read/handoff) | EXISTS |
| 107 | Callback fields on `front_desk.leads` (callback_scheduled_at, status, notes) | EXISTS |
| 108 | `front_desk` role added to `profiles_role_check` | EXISTS |
| 109 | Soft delete / archive for leads | EXISTS |
| 115 | Fix leads status check constraint | EXISTS |
| 127 | Company column added to leads | EXISTS |
| 129 | `front_desk.call_logs` + `front_desk.email_logs` (Zadarma-ready) | EXISTS |
| 143 | `public.website_leads` (landing page capture via Turnstile) | EXISTS |

**Key divergence from target:** The existing schema uses `front_desk.leads` as the
core intake table with `call_logs`/`email_logs` as separate relation tables. The
target architecture (Section 1) uses a single `front_desk_inquiries` table with
embedded activity tracking via JSONB, plus dedicated `activity_log` and
`communication_log` tables. The migration strategy (old → new) is deferred to
implementation planning.

---

## 1. Inquiry Data Model (SPA Base Schema)

### 1.1 Core Table: `front_desk_inquiries`

```sql
CREATE TABLE front_desk_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  source VARCHAR(30), -- 'website_form', 'callback_request', 'chat', 'voip_incoming'

  -- Contact Info (Public → SPA)
  contact_email VARCHAR UNIQUE NOT NULL,
  contact_phone VARCHAR,
  contact_name VARCHAR NOT NULL,
  country_residence VARCHAR,
  timezone VARCHAR,
  language VARCHAR DEFAULT 'en',

  -- Inquiry Content
  age_or_child_age INT,
  program_interest VARCHAR, -- 'LMS', 'Virtual Boarding', 'Corporate Training'
  intake_group VARCHAR,
  message_body TEXT,

  -- Consent Tracking (3-Desk Model)
  email_consent_given BOOLEAN DEFAULT false,
  sms_consent_given BOOLEAN DEFAULT false,
  email_consent_timestamp TIMESTAMPTZ,
  sms_consent_timestamp TIMESTAMPTZ,

  -- AI Processing (Front Desk → AI Agent)
  ai_category VARCHAR, -- 'hot_lead', 'warm', 'nurture', 'blocked'
  ai_reasoning TEXT,
  ai_suggested_action VARCHAR, -- 'immediate_call', 'schedule_callback', 'nurture_email', 'hold'

  -- Assignment (Front Desk Staff)
  assigned_counselor_id UUID,
  assigned_at TIMESTAMPTZ,

  -- Call Tracking (VoIP + Activity History)
  voip_call_logged BOOLEAN DEFAULT false,
  voip_number_called VARCHAR,
  call_scheduled_at TIMESTAMPTZ,
  call_started_at TIMESTAMPTZ,
  call_ended_at TIMESTAMPTZ,
  call_duration_seconds INT,
  call_outcome VARCHAR, -- 'decision_yes', 'decision_no', 'pending_decision', 'rescheduled', 'no_show'

  -- Activity History (Unified Contact Timeline)
  activity_log JSONB DEFAULT '[]'::jsonb,
  -- [{timestamp, desk: 'front', action: 'call_completed', by: user_id, notes: '...'}]

  -- Enrollment Decision (Front Desk → Office Desk)
  enrollment_status VARCHAR, -- 'pending', 'offered', 'declined', 'awaiting_docs'
  moved_to_office_desk_at TIMESTAMPTZ,
  office_desk_owner_id UUID,

  -- Audit
  updated_by UUID,

  FOREIGN KEY (assigned_counselor_id) REFERENCES staff_profiles (id),
  FOREIGN KEY (office_desk_owner_id) REFERENCES staff_profiles (id)
);
```

### 1.2 Activity Log Table

```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL,
  desk VARCHAR(20), -- 'front', 'office', 'school'
  action VARCHAR(50), -- 'call_logged', 'email_sent', 'sms_sent', 'document_uploaded', 'status_updated'
  timestamp TIMESTAMPTZ DEFAULT now(),
  performed_by UUID,
  data JSONB,
  -- {duration: 1200, outcome: 'yes', notes: '...', channel: 'voip_incoming'}

  FOREIGN KEY (inquiry_id) REFERENCES front_desk_inquiries (id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES staff_profiles (id)
);
```

### 1.3 Communication Log Table

```sql
CREATE TABLE communication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL,
  desk VARCHAR(20), -- which desk triggered this
  channel VARCHAR(20), -- 'email', 'sms'
  recipient VARCHAR NOT NULL,
  subject VARCHAR,
  body TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivery_status VARCHAR, -- 'sent', 'bounced', 'opened', 'clicked'

  FOREIGN KEY (inquiry_id) REFERENCES front_desk_inquiries (id) ON DELETE CASCADE
);
```

### 1.4 RLS Policies

```sql
ALTER TABLE front_desk_inquiries ENABLE ROW LEVEL SECURITY;

-- Public can submit inquiries (anonymous insert)
CREATE POLICY "Public submit inquiries" ON front_desk_inquiries
FOR INSERT TO anon
WITH CHECK (true);

-- Staff read: own assignments + admin + office/school desks
CREATE POLICY "Staff read own assignments" ON front_desk_inquiries
FOR SELECT TO authenticated
USING (
  assigned_counselor_id = auth.uid() OR
  auth.jwt() ->> 'role' = 'admin' OR
  auth.jwt() ->> 'desk' = 'office' OR
  auth.jwt() ->> 'desk' = 'school'
);

-- Staff update: assigned counselor or admin only
CREATE POLICY "Staff update assigned inquiries" ON front_desk_inquiries
FOR UPDATE TO authenticated
USING (
  assigned_counselor_id = auth.uid() OR
  auth.jwt() ->> 'role' = 'admin'
);
```

---

## 2. Public Entry Points (Website → SPA Base)

| Channel | URL | Triggered Action | SPA Base Flow |
|---------|-----|------------------|---------------|
| **Inquiry Form** | `/inquiry` | Contact form submit | INSERT into front_desk_inquiries + trigger AI agent |
| **Callback Request** | `/schedule-callback` | "Schedule a call" CTA | INSERT into front_desk_inquiries + SET call_scheduled_at |
| **Chat Widget** | Floating on website | Visitor initiates chat | INSERT inquiry + source='chat' + escalate to staff |
| **VoIP Incoming** | Zadarma webhook | Caller dials number | INSERT inquiry + source='voip_incoming' + route to counselor |

**Public can ONLY submit.** Once enrolled + registered → can reach Office Desk &
School Desk directly via internal comms.

**Existing entry points:**
- `apps/landing/functions/api/leads.ts` — Turnstile-verified lead capture → `public.website_leads`
- `public.website_leads` (migration 143) — separate table for landing page leads

**Target:** Consolidate entry into `front_desk_inquiries`. The `website_leads` table
becomes a staging area or is retired.

---

## 3. Zadarma VoIP Integration

### 3.1 Setup

- Virtual phone number with 3 extensions: front, office, school
- Cloud PBX: IVR routing by extension
- API: Webhook callbacks → SPA base inquiry capture

### 3.2 VoIP Webhook Contract

```json
// POST /api/voip/incoming
// Zadarma sends this on incoming call
{
  "call_id": "zadarma_call_123",
  "from": "+44123456789",
  "to": "front-desk-extension-1",
  "timestamp": "2026-08-18T14:30:00Z",
  "call_direction": "inbound"
}
```

### 3.3 Backend Processing

```
1. Validate webhook signature (Zadarma API secret)
2. INSERT into front_desk_inquiries (source='voip_incoming', contact_phone=from, ...)
3. INSERT into activity_log (desk='front', action='call_logged', data={call_id, from, timestamp})
4. IF existing inquiry matched by phone → append to activity_log
5. IF new inquiry → trigger AI categorization + counselor assignment
6. Broadcast: "Incoming call from +44... (no existing inquiry)" or "(existing: Maria Santos)"
```

### 3.4 Existing Zadarma Readiness

Migration 129 already creates `front_desk.call_logs` with:
- `call_id` column (text) for Zadarma webhook matching
- `direction` column (inbound/outbound)
- `outcome` column (initiated, answered, missed, declined, voicemail, failed)

**Target vs current:** The target uses `activity_log` for call tracking instead of
a separate `call_logs` table. Migration strategy deferred.

---

## 4. Terminal-First CLI Commands (Staff Workflow)

All staff operations via CLI. No UI mockups. Activity streaming for real-time updates.

### 4.1 Inquiry Queue

```bash
$ rdh inquiry list --desk front --status pending --sort-by ai_score

# Output:
#   1. Maria (London) [hot] - LMS interest - assigned to you - 2m ago
#   2. James (NYC) [warm] - Virtual Boarding - unassigned - 15m ago
```

### 4.2 Take Inquiry

```bash
$ rdh inquiry take 550e8400-e29b-41d4-a716-446655440000

# Output:
#   [LOADED] Inquiry #001 (hot lead)
#   Contact: Maria Santos | maria@email.com | +44987654321
#   Country: UK | Timezone: GMT | Language: en
#   Program: LMS | Child Age: 12
#   AI Notes: "High fit, parent pre-approved, immediate call recommended"
#   Activity: Last contact 2m ago via website form
```

### 4.3 Schedule Callback

```bash
$ rdh inquiry schedule 550e8400-e29b-41d4-a716-446655440000 --time "tomorrow 2pm GMT"

# Output: "Callback scheduled. SMS sent: 'Hi Maria! Confirming call tomorrow 2pm GMT. Reply Y to confirm'"
```

### 4.4 Log Call Outcome

```bash
$ rdh inquiry update 550e8400-e29b-41d4-a716-446655440000 \
  --call-outcome decision_yes \
  --notes "Parent approved pricing, ready for enrollment" \
  --duration 1200

# Output: "Inquiry moved to Office Desk. Activity logged. Enrollment status: offered."
```

### 4.5 Send Email/SMS

```bash
$ rdh inquiry message 550e8400-e29b-41d4-a716-446655440000 \
  --channel email \
  --template nurture_01 \
  --desk front

# Output: "Email sent to maria@email.com. Activity logged."
```

### 4.6 View Activity Timeline

```bash
$ rdh inquiry timeline 550e8400-e29b-41d4-a716-446655440000

# Output:
#   2026-08-18 14:30 [FRONT] VoIP incoming call from +44987654321 (3m call)
#   2026-08-18 14:35 [FRONT] Call outcome logged: decision_yes
#   2026-08-18 14:36 [FRONT] Email sent: Enrollment details
#   [When enrolled]
#   2026-08-19 10:00 [OFFICE] Payment received via Stripe
#   2026-08-19 11:00 [OFFICE] Enrollment confirmation sent
#   2026-08-20 09:00 [SCHOOL] Student account created
```

### 4.7 Escalate to Manager

```bash
$ rdh inquiry escalate 550e8400-e29b-41d4-a716-446655440000 \
  --reason "Parent hostile to pricing" \
  --priority high

# Output: "Escalated to manager. Flagged for senior review."
```

### 4.8 SLA Dashboard

```bash
$ rdh dashboard --desk front --period today

# Output:
#   Inquiries received: 23
#   Avg response time: 4m 30s (Target: <5m) ✓
#   Calls scheduled: 12/23 (52%)
#   Calls completed: 8/12 (67% show rate)
#   Enrollment offers: 2/8 (25% conversion)
```

### 4.9 Bulk Campaign

```bash
$ rdh campaign send --template nurture_week2 --segment "warm_leads" --send-at "tomorrow 9am"

# Output: "Campaign queued. Will send 5 SMS + 8 emails tomorrow 9am GMT."
```

---

## 5. AI Agent Logic (Inquiry Categorization & Routing)

### 5.1 Trigger

New row inserted into `front_desk_inquiries`.

### 5.2 Model

Nemotron 3 Nano 30B (free via OpenRouter) or equivalent.

### 5.3 Execution

Edge Function (Supabase) or background job.

### 5.4 Processing Step 1: Categorize Lead

**Prompt Template:**

```
You are Redhouse intake AI. Classify this inquiry:

Name: {contact_name}
Age/Child Age: {age_or_child_age}
Country: {country_residence}
Program Interest: {program_interest}
Message: {message_body}
Email/SMS Consent: {consent_status}

Score these axes (0-10):
1. **Fit Score**: How well does profile match programs?
2. **Urgency**: How soon should we contact?
3. **Readiness**: How committed are they?
4. **Decision Confidence**: How likely is this enrollment?

Output JSON:
{
  "category": "hot_lead|warm_lead|nurture|blocked",
  "fit_score": 8,
  "urgency_score": 9,
  "readiness_score": 7,
  "reasoning": "UK-based parent, child age 12, LMS interest, already expressed commitment",
  "suggested_action": "immediate_call|schedule_callback|nurture_email|hold",
  "counselor_type": "lms_specialist|general"
}
```

### 5.5 Processing Step 2: Assign Counselor

- Filter available counselors (not at max capacity)
- Match timezone (inquiry timezone ↔ counselor timezone)
- Match language if needed
- Assign counselor with lowest queue

### 5.6 Processing Step 3: Trigger Next Action

| AI Category | Action | Behavior |
|-------------|--------|----------|
| `hot_lead` | `immediate_call` | SMS to contact + alert counselor (desktop notification) |
| `warm_lead` | `schedule_callback` | Email calendar link + await confirmation |
| `nurture` | `nurture_email` | Drip: Day 1 = "Why Redhouse", Day 7 = "Student stories", Day 14 = "Enrollment spots limited" |
| `blocked` | `hold` | Log, no action until manual review |

### 5.7 SPA Base Update

```sql
UPDATE front_desk_inquiries SET
  ai_category = 'hot_lead',
  ai_reasoning = '[from AI]',
  ai_suggested_action = 'immediate_call',
  assigned_counselor_id = [uuid],
  assigned_at = now(),
  updated_at = now()
WHERE id = [inquiry_id];

INSERT INTO activity_log (inquiry_id, desk, action, timestamp, data) VALUES
  ([inquiry_id], 'front', 'ai_categorized', now(),
   '{"category": "hot_lead", "reasoning": "...", "assigned_to": "[counselor_name]"}'::jsonb);
```

---

## 6. Multi-Desk Automation (Email/SMS Across 3 Desks)

| Desk | Trigger | Channels | Purpose |
|------|---------|----------|---------|
| **Front Desk** | Inquiry received, callback scheduled, call completed | Email, SMS | Initial nurture, appointment confirmation, call outcomes |
| **Office Desk** | Enrollment offered, payment received, docs collected | Email, SMS | Enrollment confirmation, payment reminders, admin docs |
| **School Desk** | Student registered, first class approaching, attendance issues | Email, SMS, Internal comms | Student onboarding, class reminders, parent notifications |

**Each desk only triggers relevant comms.** Front Desk nurture emails only; Office
Desk payment emails only.

**Consent tracking per channel:** Email consent ≠ SMS consent. Tracked separately
in SPA base (`email_consent_given`, `sms_consent_given` with separate timestamps).

---

## 7. Lovable Admin Panel (Single-Mode Design Specs)

### 7.1 Screen 1: Inquiry Queue (Main)

- Left panel: Table (contact name, age, program, AI score, status, time since capture)
- Sorting: AI score (hot → cold), then time
- Filtering: Stage, AI category, assigned counselor, timezone, language
- Right panel: Inquiry detail (full context + activity timeline)
- Actions: "Take", "Schedule Callback", "Send Email", "Escalate", "Move to Office"

### 7.2 Screen 2: Real-Time Dashboard

- Cards: Inquiries received (today), avg response time, callbacks scheduled, show rate %, conversion %
- Charts: Volume trend (7-day), AI score distribution (pie), counselor queue (bar)
- Alerts: "3 inquiries waiting >5m", "Callback overdue"

### 7.3 Screen 3: Activity Timeline

- Unified log showing all actions across the inquiry (call, email, SMS, status change)
- Timestamp + action type + performed by + notes
- When inquiry moves to Office Desk → timeline continues (transparent handoff)

### 7.4 Screen 4: Staff Directory

- Table: Counselor, status (online/break/offline), queue count, avg handle time
- Click to assign inquiry

### 7.5 Design Tokens

```
Primary:    #0066CC (Redhouse blue — replace with brand later)
Secondary:  #FF6B35 (Alert orange)
Success:    #22C55E (Green)
Warning:    #F59E0B (Yellow)
Neutral:    #6B7280 (Gray)

AI Score Badge:
  hot:     #EF4444 (Red)
  warm:    #F97316 (Orange)
  nurture: #3B82F6 (Blue)
  blocked: #9CA3AF (Gray)

Typography:
  Heading: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
  Body:    Same stack, 14px line-height 1.5

Spacing: 8px grid (8, 16, 24, 32, 48px)
```

### 7.6 Component Specs

- Buttons: 8px padding, rounded-md, no shadows
- Tables: Row height 44px, zebra striping on hover
- Modals: 480px width, 200px header, centered
- Forms: Inline labels, single-column on mobile

---

## 8. VoIP Phone Tracking (Unified Contact Record)

### 8.1 One Contact = All Touchpoints

```javascript
Contact {
  id: UUID,
  email: "maria@email.com",
  phone: "+44987654321",

  // All interactions in activity_log (SPA base)
  activity_timeline: [
    { timestamp, channel: 'website_form', action: 'inquiry_submitted' },
    { timestamp, channel: 'voip_incoming', action: 'call_logged', duration: 1200 },
    { timestamp, channel: 'email', action: 'sent_nurture_email' },
    { timestamp, channel: 'sms', action: 'sent_callback_confirmation' },
    // When enrolled:
    { timestamp, channel: 'internal_comms', action: 'student_account_created' }
  ],

  // Current desk assignment
  current_desk: 'front' → 'office' → 'school'
}
```

No matter where contact comes from (website, VoIP, chat), one record accumulates
all history.

One number with 3 extensions + unified timeline = transparency across desks.

---

## 9. Call Recording Policy

| Desk | Recording | Rationale |
|------|-----------|-----------|
| **Front Desk** | No recording | Public-facing, compliance simpler |
| **Office Desk** | Optional | Contract/payment context exists |
| **School Desk** | No recording | FERPA/child privacy |

Transcript handling: If enabled later, transcript → SPA base `activity_log`.

---

## 10. Go-Live Checklist

| Item | Owner | Status |
|------|-------|--------|
| SPA base schema deployed + RLS policies active | Dev | ⏳ |
| Zadarma account + webhook integration tested | Ops | ⏳ |
| AI agent prompts locked + Nemotron integration verified | AI | ⏳ |
| Terminal CLI commands built + tested | Dev | ⏳ |
| Email/SMS templates locked (nurture sequences) | Ops | ⏳ |
| Lovable admin panel built (single-mode) | Design/Dev | ⏳ |
| Staff training: terminal CLI + SLA dashboard | Ops | ⏳ |
| E2E test: website form → inquiry captured → assigned → called | QA | ⏳ |
| E2E test: VoIP incoming → inquiry logged → activity timeline → handoff to Office | QA | ⏳ |
| Compliance audit: GDPR, COPPA, consent tracking | Legal | ⏳ |

---

## 11. Migration Notes (Deferred)

The target architecture uses `front_desk_inquiries` + `activity_log` +
`communication_log` which differs from the existing schema:

| Existing | Target | Gap |
|----------|--------|-----|
| `front_desk.leads` | `front_desk_inquiries` | Expanded columns (AI, consent, call tracking, activity JSONB) |
| `front_desk.call_logs` | `activity_log` | Call data moves to generic activity log |
| `front_desk.email_logs` | `communication_log` | Email/sms unified under one table |
| `public.website_leads` | Entry via `front_desk_inquiries` | Separate table → consolidated |
| `public.leads` | Retired or consolidated | Original basic leads table |

Migration strategy (old → new) is an implementation decision, not an architecture
decision. The spec defines the target state. How we get there is planned separately.

---

## 12. Summary

| Component | Coverage |
|-----------|----------|
| SPA Base Schema | ✓ Complete (inquiries, activity_log, communication_log) |
| Public Entry Points | ✓ 4 channels defined (form, callback, chat, VoIP) |
| Zadarma VoIP | ✓ Webhook contract + unified contact model |
| Terminal CLI | ✓ 9 staff workflow commands |
| AI Agent Logic | ✓ Categorization prompt + assignment + action triggers |
| Multi-Desk Automation | ✓ Email/SMS specs for Front, Office, School |
| Admin Panel | ✓ 4 screens + design tokens + component specs |
| Unified Contact Model | ✓ One record, all touchpoints, transparent handoff |
| Call Recording Policy | ✓ Per-desk rules defined |
| Go-Live Checklist | ✓ 10 items with owners |

**This spec is the architecture blueprint.** It is ready to:
1. Serve as input to implementation planning (migration strategy, Edge Function catalogue)
2. Guide dev team for SPA base + CLI build
3. Guide design for Lovable admin panel
4. Extend to Office Desk and School Desk (same architecture, built sequentially)
