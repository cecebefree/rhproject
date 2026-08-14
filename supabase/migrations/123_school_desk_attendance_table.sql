-- Migration 123: Create school_desk.attendance table (Row 73)
-- Attendance tracking for class sessions — one row per student per course per date

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- ATTENDANCE — student attendance per class session
-- Grain: (course_id, student_id, class_date) = one record
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_desk.attendance (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenant_lms(id),
  course_id         uuid NOT NULL REFERENCES school_desk.courses(id),
  student_id        uuid NOT NULL REFERENCES public.profiles(id),
  class_date        date NOT NULL,
  status            text NOT NULL DEFAULT 'absent'
    CHECK (status IN ('present', 'absent', 'excused')),
  marked_by         uuid NOT NULL REFERENCES auth.users(id),
  marked_at         timestamptz NOT NULL DEFAULT now(),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

-- ═══════════════════════════════════════════════════════════
-- CONSTRAINTS
-- ═══════════════════════════════════════════════════════════
ALTER TABLE school_desk.attendance
  ADD CONSTRAINT uq_attendance_course_student_date
  UNIQUE (course_id, student_id, class_date);

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_course_date
  ON school_desk.attendance (tenant_id, course_id, class_date);

CREATE INDEX IF NOT EXISTS idx_attendance_tenant_student
  ON school_desk.attendance (tenant_id, student_id);

CREATE INDEX IF NOT EXISTS idx_attendance_marked_at
  ON school_desk.attendance (marked_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_course_date
  ON school_desk.attendance (course_id, class_date);

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════
ALTER TABLE school_desk.attendance ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS att_admin_all ON school_desk.attendance;
CREATE POLICY att_admin_all
  ON school_desk.attendance FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Teachers SELECT: read attendance for courses they teach
DROP POLICY IF EXISTS att_teacher_select ON school_desk.attendance;
CREATE POLICY att_teacher_select
  ON school_desk.attendance FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_desk.courses c
      WHERE c.id = attendance.course_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Teachers INSERT: mark attendance for students in their courses
DROP POLICY IF EXISTS att_teacher_insert ON school_desk.attendance;
CREATE POLICY att_teacher_insert
  ON school_desk.attendance FOR INSERT TO authenticated
  WITH CHECK (
    marked_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM school_desk.courses c
      WHERE c.id = course_id
        AND c.teacher_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = student_id
    )
  );

-- Teachers UPDATE: update own marks (same day only)
DROP POLICY IF EXISTS att_teacher_update ON school_desk.attendance;
CREATE POLICY att_teacher_update
  ON school_desk.attendance FOR UPDATE TO authenticated
  USING (
    marked_by = auth.uid()
    AND class_date = CURRENT_DATE
    AND EXISTS (
      SELECT 1 FROM school_desk.courses c
      WHERE c.id = attendance.course_id
        AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    marked_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM school_desk.courses c
      WHERE c.id = course_id
        AND c.teacher_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════
GRANT ALL ON school_desk.attendance TO service_role;
GRANT SELECT ON school_desk.attendance TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════
COMMENT ON TABLE school_desk.attendance IS
  'Row 73: Student attendance per class session. Grain: (course_id, student_id, class_date).';
COMMENT ON COLUMN school_desk.attendance.status IS
  'present | absent | excused — one of three states per student per session';
COMMENT ON CONSTRAINT uq_attendance_course_student_date ON school_desk.attendance IS
  'Prevents duplicate attendance records for same student/course/date';

COMMIT;
