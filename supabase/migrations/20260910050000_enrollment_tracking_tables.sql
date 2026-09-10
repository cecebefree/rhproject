-- Migration: 20260910050000_enrollment_tracking_tables.sql
-- Enrollment Pipeline: student class enrollments and enrollment history

BEGIN;

-- ============================================================
-- student_class_enrollments — final student-to-class records
-- ============================================================
CREATE TABLE IF NOT EXISTS office_desk.student_class_enrollments (
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

ALTER TABLE office_desk.student_class_enrollments OWNER TO postgres;

COMMENT ON TABLE office_desk.student_class_enrollments IS 'Final enrollment records linking students to class instances';

-- ============================================================
-- enrollment_history — historical enrollment records per year
-- ============================================================
CREATE TABLE IF NOT EXISTS office_desk.enrollment_history (
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

ALTER TABLE office_desk.enrollment_history OWNER TO postgres;

COMMENT ON TABLE office_desk.enrollment_history IS 'Historical enrollment records for yearly rollover and alumni retention';

COMMIT;
