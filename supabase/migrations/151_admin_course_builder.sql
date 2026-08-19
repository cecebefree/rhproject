-- Migration 151: Admin course builder (Rows 99-101)
-- Adds capacity, tenant_id to courses + course_schedule table for class dates/times

BEGIN;

-- 1. Add capacity column to courses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'school_desk'
      AND table_name = 'courses'
      AND column_name = 'capacity'
  ) THEN
    ALTER TABLE school_desk.courses
      ADD COLUMN capacity int CHECK (capacity IS NULL OR capacity > 0);
  END IF;
END $$;

-- 2. Add tenant_id column (PLAIN COLUMN, NO FK — same pattern as other tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'school_desk'
      AND table_name = 'courses'
      AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE school_desk.courses
      ADD COLUMN tenant_id uuid;
  END IF;
END $$;

-- 3. Backfill tenant_id from teacher's profile
UPDATE school_desk.courses c
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE c.teacher_id = p.id AND c.tenant_id IS NULL;

-- 4. Create course_schedule table for class dates/times
CREATE TABLE IF NOT EXISTS school_desk.course_schedule (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  course_id   uuid NOT NULL REFERENCES school_desk.courses(id) ON DELETE CASCADE,
  class_date  date NOT NULL,
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  location    text,
  recurring   text DEFAULT 'none' CHECK (recurring IN ('none', 'weekly', 'monthly')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 5. Indexes for course_schedule
CREATE INDEX IF NOT EXISTS idx_course_schedule_course
  ON school_desk.course_schedule (course_id);

CREATE INDEX IF NOT EXISTS idx_course_schedule_date
  ON school_desk.course_schedule (class_date);

-- 6. RLS for course_schedule
ALTER TABLE school_desk.course_schedule ENABLE ROW LEVEL SECURITY;

-- Teachers can manage schedules for their courses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'cs_teacher_manage'
  ) THEN
    CREATE POLICY cs_teacher_manage ON school_desk.course_schedule
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM school_desk.courses c
          JOIN public.profiles p ON p.id = c.teacher_id
          WHERE c.id = course_schedule.course_id
            AND p.id = auth.uid()
            AND p.role IN ('teacher', 'admin')
        )
      );
  END IF;
END $$;

-- Admins can view all schedules in their tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'cs_admin_select'
  ) THEN
    CREATE POLICY cs_admin_select ON school_desk.course_schedule
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- 7. Grants
GRANT ALL ON school_desk.course_schedule TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON school_desk.course_schedule TO authenticated;

-- 8. updated_at trigger for course_schedule
CREATE OR REPLACE FUNCTION school_desk.set_course_schedule_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_course_schedule_updated_at ON school_desk.course_schedule;
CREATE TRIGGER trg_course_schedule_updated_at
  BEFORE UPDATE ON school_desk.course_schedule
  FOR EACH ROW
  EXECUTE FUNCTION school_desk.set_course_schedule_updated_at();

-- 9. Comments
COMMENT ON TABLE school_desk.course_schedule IS 'Row 99-101: Class schedule for courses — dates, times, locations';
COMMENT ON COLUMN school_desk.courses.capacity IS 'Row 99-101: Maximum students allowed (null = unlimited)';
COMMENT ON COLUMN school_desk.courses.tenant_id IS 'Row 99-101: Tenant scoping for multi-school support';

COMMIT;
