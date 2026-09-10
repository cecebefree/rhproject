-- Migration: 20260910060000_modify_existing_tables.sql
-- Enrollment Pipeline: add columns to existing tables

BEGIN;

-- ============================================================
-- office_desk.family_accounts — add enrollment-related columns
-- ============================================================
ALTER TABLE office_desk.family_accounts
  ADD COLUMN IF NOT EXISTS primary_adult_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS address JSONB,
  ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('debit_order', 'card', 'eft', 'cash')),
  ADD COLUMN IF NOT EXISTS debit_order_minimum NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES office_desk.enrollment_pipelines(id);

COMMENT ON COLUMN office_desk.family_accounts.primary_adult_id IS 'Primary adult contact for this family';
COMMENT ON COLUMN office_desk.family_accounts.contact_email IS 'Primary contact email for the family';
COMMENT ON COLUMN office_desk.family_accounts.contact_phone IS 'Primary contact phone for the family';
COMMENT ON COLUMN office_desk.family_accounts.address IS 'Physical address as JSON: {street, city, province, postal_code}';
COMMENT ON COLUMN office_desk.family_accounts.payment_method IS 'Payment method: debit_order, card, eft, or cash';
COMMENT ON COLUMN office_desk.family_accounts.debit_order_minimum IS 'Minimum debit order amount (R5 verification)';
COMMENT ON COLUMN office_desk.family_accounts.pipeline_id IS 'Enrollment pipeline that created this family account';

-- ============================================================
-- public.profiles — add enrollment-related columns
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS family_account_id UUID REFERENCES office_desk.family_accounts(id),
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS student_number TEXT,
  ADD COLUMN IF NOT EXISTS enrollment_pipeline_id UUID REFERENCES office_desk.enrollment_pipelines(id),
  ADD COLUMN IF NOT EXISTS access_granted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS zone TEXT,
  ADD COLUMN IF NOT EXISTS class_section TEXT,
  ADD COLUMN IF NOT EXISTS enrollment_year TEXT,
  ADD COLUMN IF NOT EXISTS next_grade TEXT,
  ADD COLUMN IF NOT EXISTS enrollment_type TEXT DEFAULT 'new' CHECK (enrollment_type IN ('new', 'returning'));

COMMENT ON COLUMN public.profiles.family_account_id IS 'Links student/adult profile to family account';
COMMENT ON COLUMN public.profiles.date_of_birth IS 'Student date of birth';
COMMENT ON COLUMN public.profiles.student_number IS 'Unique student number for LMS identification';
COMMENT ON COLUMN public.profiles.enrollment_pipeline_id IS 'Pipeline that created this profile';
COMMENT ON COLUMN public.profiles.access_granted_at IS 'When access was approved and granted';
COMMENT ON COLUMN public.profiles.onboarding_completed_at IS 'When onboarding was fully completed';
COMMENT ON COLUMN public.profiles.zone IS 'Geographic or organizational zone';
COMMENT ON COLUMN public.profiles.class_section IS 'Class section assignment (A, B, C, etc.)';
COMMENT ON COLUMN public.profiles.enrollment_year IS 'Current enrollment year (e.g. 2026)';
COMMENT ON COLUMN public.profiles.next_grade IS 'Grade for next enrollment year (auto-promoted)';
COMMENT ON COLUMN public.profiles.enrollment_type IS 'Whether this is a new or returning student';

-- ============================================================
-- office_desk.registrations — add pipeline link
-- ============================================================
ALTER TABLE office_desk.registrations
  ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES office_desk.enrollment_pipelines(id);

COMMENT ON COLUMN office_desk.registrations.pipeline_id IS 'Enrollment pipeline linked to this registration';

COMMIT;
