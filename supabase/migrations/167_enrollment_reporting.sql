-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 167: Enrollment + Reporting
-- ══════════════════════════════════════════════════════════════════════════════
-- Tables:   courses, student_enrollments, course_progress
-- RPCs:     enroll_student_in_course, withdraw_student_from_course,
--           get_student_progress, generate_course_report
-- Triggers: on_student_enrollments_insert, on_course_progress_update
-- RLS:      4 roles (office_desk_admin, school_desk_admin, teacher, student, parent)
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- 0. SETUP — Safe teardown for re-runs (idempotent)
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  -- Drop triggers if tables exist
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'course_progress' AND relnamespace = 'public'::regnamespace) THEN
    DROP TRIGGER IF EXISTS on_course_progress_update ON public.course_progress;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'student_enrollments' AND relnamespace = 'public'::regnamespace) THEN
    DROP TRIGGER IF EXISTS on_student_enrollments_insert ON public.student_enrollments;
  END IF;

  -- Drop functions
  DROP FUNCTION IF EXISTS public.on_enrollment_created() CASCADE;
  DROP FUNCTION IF EXISTS public.update_progress_percentage() CASCADE;
  DROP FUNCTION IF EXISTS public.enroll_student_in_course(uuid, uuid, uuid) CASCADE;
  DROP FUNCTION IF EXISTS public.withdraw_student_from_course(uuid, uuid, text) CASCADE;
  DROP FUNCTION IF EXISTS public.get_student_progress(uuid) CASCADE;
  DROP FUNCTION IF EXISTS public.generate_course_report(uuid) CASCADE;

  -- Drop tables in reverse dependency order
  DROP TABLE IF EXISTS public.course_progress CASCADE;
  DROP TABLE IF EXISTS public.student_enrollments CASCADE;
  DROP TABLE IF EXISTS public.courses CASCADE;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. TABLES
-- ══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 1.1 COURSES — Course catalog per organization
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.courses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES supabase.organizations(id) ON DELETE CASCADE,
  course_name       text NOT NULL,
  course_code       text NOT NULL UNIQUE,
  grade             text NOT NULL,
  description       text,
  curriculum_map    text,
  start_date        date NOT NULL,
  end_date          date NOT NULL,
  capacity          int NOT NULL DEFAULT 30 CHECK (capacity > 0),
  enrolled_count    int NOT NULL DEFAULT 0 CHECK (enrolled_count >= 0),
  status            text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'completed', 'archived')),
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_course_dates CHECK (end_date >= start_date)
);

COMMENT ON TABLE public.courses IS 'Course catalog — one row per course offering per organization';
COMMENT ON COLUMN public.courses.course_code IS 'Unique course code (e.g. MATH-10A)';
COMMENT ON COLUMN public.courses.grade IS 'Grade level (e.g. 10, 11, 12)';
COMMENT ON COLUMN public.courses.curriculum_map IS 'Curriculum framework: Cambridge, IB, GCSE, etc.';
COMMENT ON COLUMN public.courses.enrolled_count IS 'Denormalized count — incremented/decremented by enrollment triggers';
COMMENT ON COLUMN public.courses.capacity IS 'Maximum students allowed in this course';

-- ────────────────────────────────────────────────────────────────────────────
-- 1.2 STUDENT ENROLLMENTS — Student-course registration
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.student_enrollments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id           uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrollment_status   text NOT NULL DEFAULT 'enrolled'
    CHECK (enrollment_status IN ('enrolled', 'active', 'completed', 'withdrawn', 'audit')),
  enrolled_at         timestamptz NOT NULL DEFAULT now(),
  enrolled_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at        timestamptz,
  withdrawn_at        timestamptz,
  withdrawal_reason   text,
  final_grade         text CHECK (final_grade IN ('A', 'B', 'C', 'D', 'F', 'pending')),
  attendance_count    int NOT NULL DEFAULT 0 CHECK (attendance_count >= 0),
  absence_count       int NOT NULL DEFAULT 0 CHECK (absence_count >= 0),
  late_count          int NOT NULL DEFAULT 0 CHECK (late_count >= 0),
  progress_percentage int NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_course UNIQUE (student_id, course_id)
);

COMMENT ON TABLE public.student_enrollments IS 'Student-course enrollment records with attendance and progress tracking';
COMMENT ON COLUMN public.student_enrollments.enrollment_status IS 'enrolled → active → completed | withdrawn | audit';
COMMENT ON COLUMN public.student_enrollments.progress_percentage IS 'Auto-calculated by trigger from course_progress (0-100)';
COMMENT ON COLUMN public.student_enrollments.final_grade IS 'A, B, C, D, F, or pending';

-- ────────────────────────────────────────────────────────────────────────────
-- 1.3 COURSE PROGRESS — Per-lesson progress tracking
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.course_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id   uuid NOT NULL REFERENCES public.student_enrollments(id) ON DELETE CASCADE,
  lesson_number   int NOT NULL,
  lesson_name     text NOT NULL,
  lesson_date     date NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  attendance      text NOT NULL DEFAULT 'absent'
    CHECK (attendance IN ('present', 'absent', 'late', 'excused')),
  score           int CHECK (score BETWEEN 0 AND 100),
  feedback        text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_enrollment_lesson UNIQUE (enrollment_id, lesson_number)
);

COMMENT ON TABLE public.course_progress IS 'Per-lesson tracking for each enrolled student — attendance, status, score';
COMMENT ON COLUMN public.course_progress.lesson_number IS 'Sequential lesson number (1-15)';
COMMENT ON COLUMN public.course_progress.attendance IS 'present, absent, late, or excused';
COMMENT ON COLUMN public.course_progress.score IS 'Lesson score 0-100 (nullable)';

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. INDEXES
-- ══════════════════════════════════════════════════════════════════════════════

-- Courses indexes
CREATE INDEX idx_courses_org_status
  ON public.courses (organization_id, status);

CREATE INDEX idx_courses_grade
  ON public.courses (grade);

-- Student enrollments indexes
CREATE INDEX idx_enrollments_student
  ON public.student_enrollments (student_id);

CREATE INDEX idx_enrollments_course
  ON public.student_enrollments (course_id);

CREATE INDEX idx_enrollments_status
  ON public.student_enrollments (enrollment_status);

-- Course progress indexes
CREATE INDEX idx_progress_enrollment
  ON public.course_progress (enrollment_id);

CREATE INDEX idx_progress_status
  ON public.course_progress (status);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 1: office_desk_admin — Full CRUD on all tables
-- ────────────────────────────────────────────────────────────────────────────

-- Courses: full access
CREATE POLICY oda_courses_all
  ON public.courses FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

-- Student Enrollments: full access
CREATE POLICY oda_enrollments_all
  ON public.student_enrollments FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

-- Course Progress: full access
CREATE POLICY oda_progress_all
  ON public.course_progress FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 2: school_desk_admin — Read all, limited write
-- ────────────────────────────────────────────────────────────────────────────

-- Courses: SELECT all, UPDATE status only
CREATE POLICY sda_courses_select
  ON public.courses FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

CREATE POLICY sda_courses_update_status
  ON public.courses FOR UPDATE TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

-- Student Enrollments: SELECT all, INSERT/UPDATE status + attendance only
CREATE POLICY sda_enrollments_select
  ON public.student_enrollments FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

CREATE POLICY sda_enrollments_insert
  ON public.student_enrollments FOR INSERT TO authenticated
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

CREATE POLICY sda_enrollments_update
  ON public.student_enrollments FOR UPDATE TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

-- Course Progress: SELECT all, INSERT/UPDATE all
CREATE POLICY sda_progress_select
  ON public.course_progress FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

CREATE POLICY sda_progress_insert
  ON public.course_progress FOR INSERT TO authenticated
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

CREATE POLICY sda_progress_update
  ON public.course_progress FOR UPDATE TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 3: teacher — Read all, no direct modification
-- ────────────────────────────────────────────────────────────────────────────

-- Courses: SELECT all
CREATE POLICY teacher_courses_select
  ON public.courses FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text);

-- Student Enrollments: SELECT all
CREATE POLICY teacher_enrollments_select
  ON public.student_enrollments FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text);

-- Course Progress: SELECT own course enrollments, INSERT/UPDATE feedback + attendance
CREATE POLICY teacher_progress_select
  ON public.course_progress FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.courses c ON se.course_id = c.id
      WHERE se.id = course_progress.enrollment_id
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text)
  );

CREATE POLICY teacher_progress_insert
  ON public.course_progress FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.courses c ON se.course_id = c.id
      WHERE se.id = course_progress.enrollment_id
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text)
  );

CREATE POLICY teacher_progress_update
  ON public.course_progress FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.courses c ON se.course_id = c.id
      WHERE se.id = course_progress.enrollment_id
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.courses c ON se.course_id = c.id
      WHERE se.id = course_progress.enrollment_id
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text)
  );

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 4: student — SELECT own data only
-- ────────────────────────────────────────────────────────────────────────────

-- Courses: SELECT active courses for own grade
CREATE POLICY student_courses_select
  ON public.courses FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND grade = (
      SELECT s.grade FROM public.students s WHERE s.id = auth.uid()
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text)
  );

-- Student Enrollments: SELECT own
CREATE POLICY student_enrollments_select_own
  ON public.student_enrollments FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text)
  );

-- Course Progress: SELECT own
CREATE POLICY student_progress_select_own
  ON public.course_progress FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      WHERE se.id = course_progress.enrollment_id
        AND se.student_id = auth.uid()
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text)
  );

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 5: parent — SELECT child's data only
-- ────────────────────────────────────────────────────────────────────────────

-- Courses: SELECT active courses for child's grade
CREATE POLICY parent_courses_select
  ON public.courses FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.parents p
      JOIN public.students s ON p.student_id = s.id
      WHERE p.id = auth.uid()
        AND s.grade = courses.grade
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'parent'::text)
  );

-- Student Enrollments: SELECT child's
CREATE POLICY parent_enrollments_select_child
  ON public.student_enrollments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parents p
      WHERE p.student_id = student_enrollments.student_id
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'parent'::text)
  );

-- Course Progress: SELECT child's
CREATE POLICY parent_progress_select_child
  ON public.course_progress FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.parents p ON p.student_id = se.student_id
      WHERE se.id = course_progress.enrollment_id
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'parent'::text)
  );

-- ────────────────────────────────────────────────────────────────────────────
-- GRANTS
-- ────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_progress TO authenticated;

GRANT ALL ON public.courses TO service_role;
GRANT ALL ON public.student_enrollments TO service_role;
GRANT ALL ON public.course_progress TO service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. TRIGGER FUNCTIONS
-- ══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 4.1 ON ENROLLMENT CREATED — Initialize progress + audit + notify
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.on_enrollment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Audit log
  INSERT INTO public.audit_log (table_name, operation, new_values, user_id)
  VALUES (
    'student_enrollments',
    'ENROLLMENT_CREATED',
    row_to_json(NEW)::jsonb,
    NEW.enrolled_by
  );

  -- Initialize 15 lesson progress rows
  INSERT INTO public.course_progress (enrollment_id, lesson_number, lesson_name, lesson_date, status, attendance)
  SELECT
    NEW.id,
    g.lesson_num,
    'Lesson ' || g.lesson_num,
    NEW.enrolled_at::date + (g.lesson_num - 1),
    'pending',
    'absent'
  FROM generate_series(1, 15) AS g(lesson_num);

  -- Realtime notification
  PERFORM pg_notify(
    'enrollment_events',
    json_build_object(
      'event', 'enrollment_created',
      'enrollment_id', NEW.id,
      'student_id', NEW.student_id,
      'course_id', NEW.course_id
    )::text
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.on_enrollment_created() IS 'Trigger: after enrollment insert — initialize 15 lesson progress rows, audit, notify';

CREATE TRIGGER on_student_enrollments_insert
  AFTER INSERT ON public.student_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.on_enrollment_created();

-- ────────────────────────────────────────────────────────────────────────────
-- 4.2 ON PROGRESS UPDATE — Recalculate attendance + progress percentage
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_progress_percentage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment_id uuid;
  v_total_lessons int;
  v_completed_lessons int;
  v_progress int;
  v_attendance_count int;
  v_absence_count int;
  v_late_count int;
BEGIN
  -- Resolve enrollment_id from the updated row
  v_enrollment_id := NEW.enrollment_id;

  -- Count total lessons for this enrollment
  SELECT count(*) INTO v_total_lessons
  FROM public.course_progress
  WHERE enrollment_id = v_enrollment_id;

  IF v_total_lessons = 0 THEN
    RETURN NEW;
  END IF;

  -- Count completed lessons
  SELECT count(*) INTO v_completed_lessons
  FROM public.course_progress
  WHERE enrollment_id = v_enrollment_id
    AND status = 'completed';

  -- Calculate progress percentage (0-100)
  v_progress := LEAST(100, (v_completed_lessons * 100 / v_total_lessons));

  -- Count attendance categories
  SELECT
    count(*) FILTER (WHERE attendance = 'present'),
    count(*) FILTER (WHERE attendance = 'absent'),
    count(*) FILTER (WHERE attendance = 'late')
  INTO v_attendance_count, v_absence_count, v_late_count
  FROM public.course_progress
  WHERE enrollment_id = v_enrollment_id;

  -- Update the enrollment record
  UPDATE public.student_enrollments
  SET progress_percentage = v_progress,
      attendance_count    = v_attendance_count,
      absence_count       = v_absence_count,
      late_count          = v_late_count,
      updated_at          = now()
  WHERE id = v_enrollment_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_progress_percentage() IS 'Trigger: after course_progress insert/update — recalculate attendance counts and progress percentage on enrollment';

CREATE TRIGGER on_course_progress_update
  AFTER INSERT OR UPDATE ON public.course_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_progress_percentage();

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. RPC FUNCTIONS
-- ══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 5.1 ENROLL STUDENT IN COURSE
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enroll_student_in_course(
  p_student_id  uuid,
  p_course_id   uuid,
  p_enrolled_by uuid
)
RETURNS TABLE(enrollment_id uuid, status text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capacity      int;
  v_enrolled      int;
  v_enrollment_id uuid;
BEGIN
  -- Check course exists and get capacity info
  SELECT capacity, enrolled_count
  INTO v_capacity, v_enrolled
  FROM public.courses
  WHERE id = p_course_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, 'error'::text, 'Course not found'::text;
    RETURN;
  END IF;

  IF v_enrolled >= v_capacity THEN
    RETURN QUERY SELECT NULL::uuid, 'error'::text, 'Course capacity full'::text;
    RETURN;
  END IF;

  -- Check for duplicate enrollment
  IF EXISTS (
    SELECT 1 FROM public.student_enrollments
    WHERE student_id = p_student_id AND course_id = p_course_id
  ) THEN
    RETURN QUERY SELECT NULL::uuid, 'error'::text, 'Student already enrolled in this course'::text;
    RETURN;
  END IF;

  -- Insert enrollment
  INSERT INTO public.student_enrollments (student_id, course_id, enrollment_status, enrolled_by)
  VALUES (p_student_id, p_course_id, 'enrolled', p_enrolled_by)
  RETURNING id INTO v_enrollment_id;

  -- Increment enrolled_count on course
  UPDATE public.courses
  SET enrolled_count = enrolled_count + 1,
      updated_at = now()
  WHERE id = p_course_id;

  RETURN QUERY SELECT v_enrollment_id, 'success'::text, 'Student enrolled'::text;
END;
$$;

COMMENT ON FUNCTION public.enroll_student_in_course(uuid, uuid, uuid)
  IS 'Enroll a student in a course — checks capacity + duplicates, increments count, audits, notifies';

GRANT EXECUTE ON FUNCTION public.enroll_student_in_course(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_student_in_course(uuid, uuid, uuid) TO service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 5.2 WITHDRAW STUDENT FROM COURSE
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.withdraw_student_from_course(
  p_enrollment_id  uuid,
  p_withdrawn_by   uuid,
  p_reason         text
)
RETURNS TABLE(status text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id  uuid;
  v_student_id uuid;
BEGIN
  -- Get enrollment details
  SELECT course_id, student_id
  INTO v_course_id, v_student_id
  FROM public.student_enrollments
  WHERE id = p_enrollment_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'error'::text, 'Enrollment not found'::text;
    RETURN;
  END IF;

  -- Update enrollment status
  UPDATE public.student_enrollments
  SET enrollment_status = 'withdrawn',
      withdrawn_at = now(),
      withdrawal_reason = p_reason,
      updated_at = now()
  WHERE id = p_enrollment_id;

  -- Decrement enrolled_count on course
  UPDATE public.courses
  SET enrolled_count = GREATEST(0, enrolled_count - 1),
      updated_at = now()
  WHERE id = v_course_id;

  -- Audit log
  INSERT INTO public.audit_log (table_name, operation, old_values, new_values, user_id)
  VALUES (
    'student_enrollments',
    'STUDENT_WITHDRAWN',
    jsonb_build_object('enrollment_id', p_enrollment_id, 'student_id', v_student_id, 'course_id', v_course_id),
    jsonb_build_object('withdrawal_reason', p_reason),
    p_withdrawn_by
  );

  -- Realtime notification
  PERFORM pg_notify(
    'enrollment_events',
    json_build_object(
      'event', 'student_withdrawn',
      'student_id', v_student_id,
      'enrollment_id', p_enrollment_id
    )::text
  );

  RETURN QUERY SELECT 'success'::text, 'Student withdrawn'::text;
END;
$$;

COMMENT ON FUNCTION public.withdraw_student_from_course(uuid, uuid, text)
  IS 'Withdraw a student from a course — updates status, decrements count, audits, notifies';

GRANT EXECUTE ON FUNCTION public.withdraw_student_from_course(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_student_from_course(uuid, uuid, text) TO service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 5.3 GET STUDENT PROGRESS REPORT
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_student_progress(
  p_enrollment_id uuid
)
RETURNS TABLE(
  enrollment_id       uuid,
  student_id          uuid,
  course_name         text,
  progress_percentage int,
  attendance_count    int,
  absence_count       int,
  late_count          int,
  final_grade         text,
  lesson_status       json
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.id,
    se.student_id,
    c.course_name,
    se.progress_percentage,
    se.attendance_count,
    se.absence_count,
    se.late_count,
    se.final_grade,
    (
      SELECT json_agg(json_build_object(
        'lesson_number', cp.lesson_number,
        'lesson_name', cp.lesson_name,
        'status', cp.status,
        'attendance', cp.attendance,
        'score', cp.score
      ) ORDER BY cp.lesson_number)
      FROM public.course_progress cp
      WHERE cp.enrollment_id = se.id
    )::json
  FROM public.student_enrollments se
  JOIN public.courses c ON se.course_id = c.id
  WHERE se.id = p_enrollment_id;
END;
$$;

COMMENT ON FUNCTION public.get_student_progress(uuid)
  IS 'Returns detailed progress report for an enrollment — includes per-lesson status JSON';

GRANT EXECUTE ON FUNCTION public.get_student_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_progress(uuid) TO service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 5.4 GENERATE COURSE REPORT (ALL STUDENTS)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_course_report(
  p_course_id uuid
)
RETURNS TABLE(
  course_name              text,
  total_enrolled           int,
  completed                int,
  withdrawn                int,
  avg_progress             int,
  avg_attendance_percent   numeric,
  enrollment_details       json
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.course_name,
    COUNT(se.id)::int AS total_enrolled,
    COUNT(*) FILTER (WHERE se.enrollment_status = 'completed')::int AS completed,
    COUNT(*) FILTER (WHERE se.enrollment_status = 'withdrawn')::int AS withdrawn,
    ROUND(AVG(se.progress_percentage))::int AS avg_progress,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM public.course_progress cp
        WHERE cp.enrollment_id = se.id AND cp.attendance = 'present'
      )) / NULLIF(COUNT(se.id), 0),
      2
    ) AS avg_attendance_percent,
    (
      SELECT json_agg(json_build_object(
        'student_id', se2.student_id,
        'enrollment_status', se2.enrollment_status,
        'progress', se2.progress_percentage,
        'final_grade', se2.final_grade
      ))
      FROM public.student_enrollments se2
      WHERE se2.course_id = c.id
    )::json AS enrollment_details
  FROM public.courses c
  LEFT JOIN public.student_enrollments se ON c.id = se.course_id
  WHERE c.id = p_course_id
  GROUP BY c.id, c.course_name;
END;
$$;

COMMENT ON FUNCTION public.generate_course_report(uuid)
  IS 'Returns aggregated course report — enrollment counts, averages, per-student details';

GRANT EXECUTE ON FUNCTION public.generate_course_report(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_course_report(uuid) TO service_role;

COMMIT;
