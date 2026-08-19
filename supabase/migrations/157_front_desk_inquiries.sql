-- Migration 157: Front Desk inquiries core table + staff_profiles
-- Creates the SPA base schema for the Front Desk system

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- TABLE: staff_profiles (counselor directory)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'counselor'
    CHECK (role IN ('counselor', 'manager', 'admin')),
  desk TEXT NOT NULL DEFAULT 'front'
    CHECK (desk IN ('front', 'office', 'school')),
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'en',
  max_capacity INT DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff profiles: admin all" ON public.staff_profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Staff profiles: read own" ON public.staff_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

GRANT SELECT, INSERT, UPDATE ON public.staff_profiles TO authenticated;
GRANT SELECT ON public.staff_profiles TO anon;

CREATE TRIGGER trg_staff_profiles_updated_at
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.staff_profiles IS 'Staff counselor directory for Front Desk assignment routing';

-- ═══════════════════════════════════════════════════════════
-- TABLE: front_desk.inquiries (SPA base schema)
-- ═══════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS front_desk;

CREATE TABLE IF NOT EXISTS front_desk.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  source VARCHAR(30)
    CHECK (source IN ('website_form', 'callback_request', 'chat', 'voip_incoming', 'manual')),

  -- Contact Info (Public → SPA)
  contact_email VARCHAR UNIQUE NOT NULL,
  contact_phone VARCHAR,
  contact_name VARCHAR NOT NULL,
  country_residence VARCHAR,
  timezone VARCHAR,
  language VARCHAR DEFAULT 'en',

  -- Inquiry Content
  age_or_child_age INT,
  program_interest VARCHAR
    CHECK (program_interest IN ('LMS', 'Virtual Boarding', 'Corporate Training', 'Other')),
  intake_group VARCHAR,
  message_body TEXT,

  -- Consent Tracking (3-Desk Model)
  email_consent_given BOOLEAN DEFAULT false,
  sms_consent_given BOOLEAN DEFAULT false,
  email_consent_timestamp TIMESTAMPTZ,
  sms_consent_timestamp TIMESTAMPTZ,

  -- AI Processing (Front Desk → AI Agent)
  ai_category VARCHAR
    CHECK (ai_category IN ('hot_lead', 'warm', 'nurture', 'blocked')),
  ai_reasoning TEXT,
  ai_suggested_action VARCHAR
    CHECK (ai_suggested_action IN ('immediate_call', 'schedule_callback', 'nurture_email', 'hold')),

  -- Assignment (Front Desk Staff)
  assigned_counselor_id UUID REFERENCES public.staff_profiles(id),
  assigned_at TIMESTAMPTZ,

  -- Call Tracking (VoIP + Activity History)
  voip_call_logged BOOLEAN DEFAULT false,
  voip_number_called VARCHAR,
  call_scheduled_at TIMESTAMPTZ,
  call_started_at TIMESTAMPTZ,
  call_ended_at TIMESTAMPTZ,
  call_duration_seconds INT,
  call_outcome VARCHAR
    CHECK (call_outcome IN ('decision_yes', 'decision_no', 'pending_decision', 'rescheduled', 'no_show')),

  -- Activity History (Unified Contact Timeline)
  activity_log JSONB DEFAULT '[]'::jsonb,

  -- Enrollment Decision (Front Desk → Office Desk)
  enrollment_status VARCHAR DEFAULT 'pending'
    CHECK (enrollment_status IN ('pending', 'offered', 'declined', 'awaiting_docs', 'escalated', 'archived')),
  moved_to_office_desk_at TIMESTAMPTZ,
  office_desk_owner_id UUID REFERENCES public.staff_profiles(id),

  -- Audit
  updated_by UUID
);

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_fd_inquiries_assigned
  ON front_desk.inquiries (assigned_counselor_id);

CREATE INDEX IF NOT EXISTS idx_fd_inquiries_status
  ON front_desk.inquiries (enrollment_status);

CREATE INDEX IF NOT EXISTS idx_fd_inquiries_ai_category
  ON front_desk.inquiries (ai_category);

CREATE INDEX IF NOT EXISTS idx_fd_inquiries_source
  ON front_desk.inquiries (source);

CREATE INDEX IF NOT EXISTS idx_fd_inquiries_created
  ON front_desk.inquiries (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fd_inquiries_email
  ON front_desk.inquiries (contact_email);

CREATE INDEX IF NOT EXISTS idx_fd_inquiries_phone
  ON front_desk.inquiries (contact_phone);

-- ═══════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════

COMMENT ON TABLE front_desk.inquiries IS 'SPA base schema — core inquiry intake for Front Desk system';
COMMENT ON COLUMN front_desk.inquiries.source IS 'Channel where inquiry originated: website_form, callback_request, chat, voip_incoming, manual';
COMMENT ON COLUMN front_desk.inquiries.ai_category IS 'AI classification: hot_lead, warm, nurture, blocked';
COMMENT ON COLUMN front_desk.inquiries.ai_reasoning IS 'AI explanation for categorization decision';
COMMENT ON COLUMN front_desk.inquiries.ai_suggested_action IS 'AI recommended next action';
COMMENT ON COLUMN front_desk.inquiries.activity_log IS 'Embedded activity history as JSONB array';
COMMENT ON COLUMN front_desk.inquiries.enrollment_status IS 'Pipeline status: pending, offered, declined, awaiting_docs, escalated, archived';
COMMENT ON COLUMN front_desk.inquiries.call_outcome IS 'Result of last call: decision_yes, decision_no, pending_decision, rescheduled, no_show';

COMMIT;
