-- Migration 124: Create school_desk.assignments + school_desk.gradebook tables (Row 74)
-- Gradebook system: assignments + student scores with weighted average

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- ASSIGNMENTS — teacher-created assignments for courses
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_desk.assignments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenant_lms(id),
  course_id         uuid NOT NULL REFERENCES school_desk.courses(id),
  title             text NOT NULL,
  description       text,
  max_score         numeric(6,2) NOT NULL DEFAULT 100 CHECK (max_score > 0),
  weight            numeric(4,2) NOT NULL DEFAULT 1.00 CHECK (weight > 0),
  due_date          timestamptz,
  created_by        uuid NOT NULL REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_assignments_tenant_course
  ON school_desk.assignments (tenant_id, course_id);

CREATE INDEX IF NOT EXISTS idx_assignments_course
  ON school_desk.assignments (course_id);

-- ═══════════════════════════════════════════════════════════
-- GRADEBOOK — student scores per assignment
-- Grain: (assignment_id, student_id) = one grade
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_desk.gradebook (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenant_lms(id),
  assignment_id     uuid NOT NULL REFERENCES school_desk.assignments(id),
  student_id        uuid NOT NULL REFERENCES public.profiles(id),
  course_id         uuid NOT NULL REFERENCES school_desk.courses(id),
  score             numeric(6,2),
  feedback          text,
  graded_by         uuid NOT NULL REFERENCES auth.users(id),
  graded_at         timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

-- Uniqueness: one grade per student per assignment
ALTER TABLE school_desk.gradebook
  ADD CONSTRAINT uq_gradebook_assignment_student
  UNIQUE (assignment_id, student_id);

CREATE INDEX IF NOT EXISTS idx_gradebook_tenant_course
  ON school_desk.gradebook (tenant_id, course_id);

CREATE INDEX IF NOT EXISTS idx_gradebook_tenant_student
  ON school_desk.gradebook (tenant_id, student_id);

CREATE INDEX IF NOT EXISTS idx_gradebook_assignment
  ON school_desk.gradebook (assignment_id);

CREATE INDEX IF NOT EXISTS idx_gradebook_course_student
  ON school_desk.gradebook (course_id, student_id);

-- ═══════════════════════════════════════════════════════════
-- RLS: ASSIGNMENTS
-- ═══════════════════════════════════════════════════════════
ALTER TABLE school_desk.assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS asgn_admin_all ON school_desk.assignments;
CREATE POLICY asgn_admin_all
  ON school_desk.assignments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS asgn_teacher_select ON school_desk.assignments;
CREATE POLICY asgn_teacher_select
  ON school_desk.assignments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_desk.courses c
      WHERE c.id = assignments.course_id
        AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS asgn_teacher_insert ON school_desk.assignments;
CREATE POLICY asgn_teacher_insert
  ON school_desk.assignments FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM school_desk.courses c
      WHERE c.id = course_id
        AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS asgn_teacher_update ON school_desk.assignments;
CREATE POLICY asgn_teacher_update
  ON school_desk.assignments FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM school_desk.courses c
      WHERE c.id = assignments.course_id
        AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM school_desk.courses c
      WHERE c.id = course_id
        AND c.teacher_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════
-- RLS: GRADEBOOK
-- ═══════════════════════════════════════════════════════════
ALTER TABLE school_desk.gradebook ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gb_admin_all ON school_desk.gradebook;
CREATE POLICY gb_admin_all
  ON school_desk.gradebook FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS gb_teacher_select ON school_desk.gradebook;
CREATE POLICY gb_teacher_select
  ON school_desk.gradebook FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_desk.courses c
      WHERE c.id = gradebook.course_id
        AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS gb_teacher_insert ON school_desk.gradebook;
CREATE POLICY gb_teacher_insert
  ON school_desk.gradebook FOR INSERT TO authenticated
  WITH CHECK (
    graded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM school_desk.courses c
      WHERE c.id = course_id
        AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS gb_teacher_update ON school_desk.gradebook;
CREATE POLICY gb_teacher_update
  ON school_desk.gradebook FOR UPDATE TO authenticated
  USING (
    graded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM school_desk.courses c
      WHERE c.id = gradebook.course_id
        AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    graded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM school_desk.courses c
      WHERE c.id = course_id
        AND c.teacher_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════
GRANT ALL ON school_desk.assignments TO service_role;
GRANT SELECT ON school_desk.assignments TO authenticated;
GRANT ALL ON school_desk.gradebook TO service_role;
GRANT SELECT ON school_desk.gradebook TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════
COMMENT ON TABLE school_desk.assignments IS
  'Row 74: Teacher-created assignments for courses. Links to gradebook for scoring.';
COMMENT ON TABLE school_desk.gradebook IS
  'Row 74: Student scores per assignment. Grain: (assignment_id, student_id). Weighted average = SUM(score * weight) / SUM(weight).';
COMMENT ON CONSTRAINT uq_gradebook_assignment_student ON school_desk.gradebook IS
  'Prevents duplicate grades for same student/assignment';

COMMIT;
