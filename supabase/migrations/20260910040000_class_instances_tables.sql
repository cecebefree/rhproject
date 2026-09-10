-- Migration: 20260910040000_class_instances_tables.sql
-- Enrollment Pipeline: class instances and assignment tables

BEGIN;

-- ============================================================
-- class_instances — term-based class schedule slots
-- ============================================================
CREATE TABLE IF NOT EXISTS office_desk.class_instances (
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

ALTER TABLE office_desk.class_instances OWNER TO postgres;

COMMENT ON TABLE office_desk.class_instances IS 'Term-based class instances — a program running at a specific time with a specific teacher';

-- ============================================================
-- class_assignments — auto/manual student-to-class assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS office_desk.class_assignments (
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

ALTER TABLE office_desk.class_assignments OWNER TO postgres;

COMMENT ON TABLE office_desk.class_assignments IS 'Student-to-class assignments with auto-scoring and approval workflow';

COMMIT;
