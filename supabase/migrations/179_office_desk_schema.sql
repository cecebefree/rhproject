-- Migration 179: Office Desk Tier 1 — Schema
-- Adds missing columns to existing tables, creates new ones
-- Uses IF NOT EXISTS for idempotent re-runs

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. REGISTRATIONS — Add spec columns to existing table
-- ══════════════════════════════════════════════════════════════════════════════

-- Parent info
ALTER TABLE office_desk.registrations ADD COLUMN IF NOT EXISTS parent_email VARCHAR(255);
ALTER TABLE office_desk.registrations ADD COLUMN IF NOT EXISTS parent_first_name VARCHAR(100);
ALTER TABLE office_desk.registrations ADD COLUMN IF NOT EXISTS parent_last_name VARCHAR(100);
ALTER TABLE office_desk.registrations ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(50);

-- Student info (spec columns alongside existing student_name/student_email/student_phone)
ALTER TABLE office_desk.registrations ADD COLUMN IF NOT EXISTS student_first_name VARCHAR(100);
ALTER TABLE office_desk.registrations ADD COLUMN IF NOT EXISTS student_last_name VARCHAR(100);
ALTER TABLE office_desk.registrations ADD COLUMN IF NOT EXISTS student_dob DATE;

-- Enrollment targeting
ALTER TABLE office_desk.registrations ADD COLUMN IF NOT EXISTS school_year_id UUID;
ALTER TABLE office_desk.registrations ADD COLUMN IF NOT EXISTS course_id UUID;
ALTER TABLE office_desk.registrations ADD COLUMN IF NOT EXISTS teacher_preference VARCHAR(255);
ALTER TABLE office_desk.registrations ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'website';

-- Status fields (spec uses reg_status, existing table has 'status')
ALTER TABLE office_desk.registrations ADD COLUMN IF NOT EXISTS reg_status VARCHAR(30) DEFAULT 'pending';
ALTER TABLE office_desk.registrations ADD COLUMN IF NOT EXISTS financial_status VARCHAR(30);

-- Internal notes (hidden from parent/student via RLS)
ALTER TABLE office_desk.registrations ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE office_desk.registrations ADD COLUMN IF NOT EXISTS internal_notes_lower TEXT;

-- Backfill reg_status from existing status column where reg_status is NULL
UPDATE office_desk.registrations
SET reg_status = status
WHERE reg_status IS NULL AND status IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reg_tenant_lms ON office_desk.registrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reg_course_id ON office_desk.registrations(course_id);
CREATE INDEX IF NOT EXISTS idx_reg_school_year ON office_desk.registrations(school_year_id);
CREATE INDEX IF NOT EXISTS idx_reg_reg_status ON office_desk.registrations(reg_status);
CREATE INDEX IF NOT EXISTS idx_reg_payment_status ON office_desk.registrations(payment_status);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. INVOICES — Add missing spec columns
-- ══════════════════════════════════════════════════════════════════════════════

-- Spec uses 'total_amount'; existing table has 'amount' — add alias
ALTER TABLE office_desk.invoices ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2);

-- Backfill total_amount from amount where null
UPDATE office_desk.invoices
SET total_amount = amount
WHERE total_amount IS NULL;

-- paid_at already exists, ensure it's there
-- (already present in existing schema)

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inv_tenant ON office_desk.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_registration ON office_desk.invoices(registration_id);
CREATE INDEX IF NOT EXISTS idx_inv_status ON office_desk.invoices(status);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. PAYMENTS — Add missing spec columns
-- ══════════════════════════════════════════════════════════════════════════════

-- Spec uses 'method'; existing has 'payment_method' — add alias
ALTER TABLE office_desk.payments ADD COLUMN IF NOT EXISTS method VARCHAR(30);
ALTER TABLE office_desk.payments ADD COLUMN IF NOT EXISTS notes TEXT;

-- Backfill method from payment_method
UPDATE office_desk.payments
SET method = payment_method
WHERE method IS NULL AND payment_method IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pay_tenant ON office_desk.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pay_invoice ON office_desk.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pay_status ON office_desk.payments(status);
CREATE INDEX IF NOT EXISTS idx_pay_created ON office_desk.payments(created_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. STUDENT_CLASS — Add missing spec columns to existing table
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.student_class ADD COLUMN IF NOT EXISTS course_id UUID;
ALTER TABLE public.student_class ADD COLUMN IF NOT EXISTS registration_id UUID;
ALTER TABLE public.student_class ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active';

-- Backfill status from is_active
UPDATE public.student_class
SET status = CASE WHEN is_active THEN 'active' ELSE 'withdrawn' END
WHERE status IS NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. ACTIVITY_LOG — New table
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_desk.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES office_desk.registrations(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  actor_profile_id UUID REFERENCES public.profiles(id),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_actlog_registration ON office_desk.activity_log(registration_id);
CREATE INDEX IF NOT EXISTS idx_actlog_action ON office_desk.activity_log(action);
CREATE INDEX IF NOT EXISTS idx_actlog_created ON office_desk.activity_log(created_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. EMAIL_LOGS — New table
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_desk.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID,
  tenant_id UUID,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT,
  status VARCHAR(30) DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_elog_tenant ON office_desk.email_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_elog_status ON office_desk.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_elog_created ON office_desk.email_logs(created_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. SCHOOL_YEARS — Reference table for academic years + intake groups
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.school_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant_lms(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  intake_group TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (tenant_id, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_school_years_tenant ON public.school_years(tenant_id);
CREATE INDEX IF NOT EXISTS idx_school_years_active ON public.school_years(is_active);

ALTER TABLE office_desk.registrations
  ADD CONSTRAINT fk_reg_school_year
  FOREIGN KEY (school_year_id) REFERENCES public.school_years(id)
  ON DELETE SET NULL;

ALTER TABLE public.school_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_years_tenant_read" ON public.school_years
  FOR SELECT USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE POLICY "school_years_admin_all" ON public.school_years
  FOR ALL USING (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'office_admin'
  );

COMMIT;
