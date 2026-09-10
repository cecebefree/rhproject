-- Migration: 20260910020000_enrollment_pipeline_tables.sql
-- Enrollment Pipeline: core tables for tracking enrollment state machine

BEGIN;

-- ============================================================
-- 1. enrollment_pipelines — state machine for each enrollment
-- ============================================================
CREATE TABLE IF NOT EXISTS office_desk.enrollment_pipelines (
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
  contract_id UUID,
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

ALTER TABLE office_desk.enrollment_pipelines OWNER TO postgres;

COMMENT ON TABLE office_desk.enrollment_pipelines IS 'Tracks the enrollment state machine for family and teacher onboarding';

-- ============================================================
-- 2. enrollment_forms — form submissions before processing
-- ============================================================
CREATE TABLE IF NOT EXISTS office_desk.enrollment_forms (
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

ALTER TABLE office_desk.enrollment_forms OWNER TO postgres;

COMMENT ON TABLE office_desk.enrollment_forms IS 'Stores submitted enrollment form data before processing into profiles';

COMMIT;
