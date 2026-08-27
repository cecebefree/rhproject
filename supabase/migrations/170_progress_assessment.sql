-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 170: Progress Tracking & Assessment
-- ══════════════════════════════════════════════════════════════════════════════
-- Tables:   chapter_progress, assessments, assessment_submissions,
--           assessment_rubric_grades
-- RPCs:     update_chapter_progress, submit_assessment, grade_assessment,
--           get_student_progress_report, get_assessment_grades_report
-- Triggers: on_assessment_graded
-- RLS:      5 roles (office_desk_admin, school_desk_admin, teacher, student, parent)
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- 0. SETUP — Safe teardown for re-runs (idempotent)
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'assessment_submissions' AND relnamespace = 'public'::regnamespace) THEN
    DROP TRIGGER IF EXISTS on_assessment_graded ON public.assessment_submissions;
  END IF;

  DROP FUNCTION IF EXISTS public.update_course_average_on_grade() CASCADE;
  DROP FUNCTION IF EXISTS public.update_chapter_progress(uuid, uuid, int, text, int) CASCADE;
  DROP FUNCTION IF EXISTS public.submit_assessment(uuid, uuid, jsonb, jsonb) CASCADE;
  DROP FUNCTION IF EXISTS public.grade_assessment(uuid, int, uuid, text) CASCADE;
  DROP FUNCTION IF EXISTS public.get_student_progress_report(uuid) CASCADE;
  DROP FUNCTION IF EXISTS public.get_assessment_grades_report(uuid, uuid) CASCADE;

  DROP TABLE IF EXISTS public.assessment_rubric_grades CASCADE;
  DROP TABLE IF EXISTS public.assessment_submissions CASCADE;
  DROP TABLE IF EXISTS public.assessments CASCADE;
  DROP TABLE IF EXISTS public.chapter_progress CASCADE;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. TABLES
-- ══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 1.1 CHAPTER PROGRESS — Per-chapter completion tracking per enrollment
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.chapter_progress (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           uuid NOT NULL REFERENCES supabase.organizations(id) ON DELETE CASCADE,
  enrollment_id             uuid NOT NULL REFERENCES public.student_enrollments(id) ON DELETE CASCADE,
  course_id                 uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  chapter_id                uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  student_id                uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  completion_percentage     int NOT NULL DEFAULT 0
    CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  status                    text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'review_pending')),
  started_at                timestamptz,
  completed_at              timestamptz,
  time_spent_minutes        int NOT NULL DEFAULT 0 CHECK (time_spent_minutes >= 0),
  resource_completion_count int NOT NULL DEFAULT 0,
  total_resources           int NOT NULL DEFAULT 0,
  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_enrollment_chapter UNIQUE (enrollment_id, chapter_id)
);

COMMENT ON TABLE public.chapter_progress IS 'Per-chapter completion tracking for each enrolled student';
COMMENT ON COLUMN public.chapter_progress.completion_percentage IS '0-100, auto-set to 100 when status becomes completed';
COMMENT ON COLUMN public.chapter_progress.status IS 'not_started -> in_progress -> completed | review_pending';

-- ────────────────────────────────────────────────────────────────────────────
-- 1.2 ASSESSMENTS — Assessment definitions per course
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.assessments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES supabase.organizations(id) ON DELETE CASCADE,
  course_id         uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  chapter_id        uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  title             text NOT NULL,
  description       text,
  assessment_type   text NOT NULL DEFAULT 'assignment'
    CHECK (assessment_type IN ('assignment', 'quiz', 'exam', 'project', 'participation')),
  max_mark          int NOT NULL DEFAULT 100 CHECK (max_mark > 0),
  weight_percentage  numeric(5,2) DEFAULT 0 CHECK (weight_percentage >= 0 AND weight_percentage <= 100),
  due_date          timestamptz,
  is_published      boolean NOT NULL DEFAULT false,
  created_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.assessments IS 'Assessment definitions per course — assignments, quizzes, exams, projects';
COMMENT ON COLUMN public.assessments.assessment_type IS 'assignment | quiz | exam | project | participation';
COMMENT ON COLUMN public.assessments.weight_percentage IS 'Weight toward final grade (0-100)';

-- ────────────────────────────────────────────────────────────────────────────
-- 1.3 ASSESSMENT SUBMISSIONS — Student submissions per assessment
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.assessment_submissions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES supabase.organizations(id) ON DELETE CASCADE,
  assessment_id         uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  enrollment_id         uuid NOT NULL REFERENCES public.student_enrollments(id) ON DELETE CASCADE,
  student_id            uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  submission_status     text NOT NULL DEFAULT 'not_submitted'
    CHECK (submission_status IN ('not_submitted', 'submitted', 'graded', 'returned_for_revision')),
  submitted_at          timestamptz,
  submission_content    jsonb,
  submission_files      jsonb,
  graded_at             timestamptz,
  graded_by_user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  mark_earned           int CHECK (mark_earned >= 0),
  mark_total            int NOT NULL DEFAULT 100 CHECK (mark_total > 0),
  mark_percentage       int GENERATED ALWAYS AS (
    CASE WHEN mark_earned IS NOT NULL
      THEN ROUND(mark_earned::numeric / mark_total * 100)
      ELSE NULL
    END
  ) STORED,
  feedback              text,
  feedback_updated_at   timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_assessment_enrollment UNIQUE (assessment_id, enrollment_id)
);

COMMENT ON TABLE public.assessment_submissions IS 'Student submissions for assessments — one per student per assessment';
COMMENT ON COLUMN public.assessment_submissions.submission_status IS 'not_submitted -> submitted -> graded | returned_for_revision';
COMMENT ON COLUMN public.assessment_submissions.mark_percentage IS 'Auto-calculated: ROUND(mark_earned / mark_total * 100), stored';

-- ────────────────────────────────────────────────────────────────────────────
-- 1.4 ASSESSMENT RUBRIC GRADES — Detailed rubric scoring per submission
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.assessment_rubric_grades (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES supabase.organizations(id) ON DELETE CASCADE,
  submission_id         uuid NOT NULL REFERENCES public.assessment_submissions(id) ON DELETE CASCADE,
  rubric_criterion_id   uuid,
  criterion_name        text NOT NULL,
  mark_earned           int NOT NULL DEFAULT 0,
  mark_total            int NOT NULL DEFAULT 10,
  grade_level           text NOT NULL DEFAULT 'emerging'
    CHECK (grade_level IN ('emerging', 'developing', 'proficient', 'advanced')),
  grader_notes          text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.assessment_rubric_grades IS 'Detailed rubric scoring per submission — criterion-level grades';
COMMENT ON COLUMN public.assessment_rubric_grades.grade_level IS 'emerging | developing | proficient | advanced';

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. INDEXES
-- ══════════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_chapter_progress_org ON public.chapter_progress (organization_id);
CREATE INDEX idx_chapter_progress_enrollment ON public.chapter_progress (enrollment_id);
CREATE INDEX idx_chapter_progress_course ON public.chapter_progress (course_id);
CREATE INDEX idx_chapter_progress_status ON public.chapter_progress (status);

CREATE INDEX idx_assessments_org ON public.assessments (organization_id);
CREATE INDEX idx_assessments_course ON public.assessments (course_id);
CREATE INDEX idx_assessments_chapter ON public.assessments (chapter_id);
CREATE INDEX idx_assessments_type ON public.assessments (assessment_type);

CREATE INDEX idx_submission_org ON public.assessment_submissions (organization_id);
CREATE INDEX idx_submission_assessment ON public.assessment_submissions (assessment_id);
CREATE INDEX idx_submission_enrollment ON public.assessment_submissions (enrollment_id);
CREATE INDEX idx_submission_student ON public.assessment_submissions (student_id);
CREATE INDEX idx_submission_status ON public.assessment_submissions (submission_status);
CREATE INDEX idx_submission_graded ON public.assessment_submissions (graded_at);

CREATE INDEX idx_rubric_grades_submission ON public.assessment_rubric_grades (submission_id);
CREATE INDEX idx_rubric_grades_org ON public.assessment_rubric_grades (organization_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.chapter_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_submissions ENABLE ROW LEVEL SECURITY;

-- Rubric grades: RLS disabled (grading only, written by SECURITY DEFINER)

-- ROLE 1: office_desk_admin — Full CRUD
CREATE POLICY oda_chapter_progress_all ON public.chapter_progress FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

CREATE POLICY oda_assessments_all ON public.assessments FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

CREATE POLICY oda_submissions_all ON public.assessment_submissions FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

-- ROLE 2: school_desk_admin — Read all, limited write
CREATE POLICY sda_chapter_progress_select ON public.chapter_progress FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

CREATE POLICY sda_chapter_progress_update ON public.chapter_progress FOR UPDATE TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

CREATE POLICY sda_assessments_select ON public.assessments FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

CREATE POLICY sda_submissions_select ON public.assessment_submissions FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

CREATE POLICY sda_submissions_update ON public.assessment_submissions FOR UPDATE TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

-- ROLE 3: teacher — Own courses' progress + submissions
CREATE POLICY teacher_chapter_progress_select ON public.chapter_progress FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.student_enrollments se
    WHERE se.id = chapter_progress.enrollment_id AND se.course_id IN (
      SELECT c2.id FROM public.courses c2 WHERE c2.created_by = auth.uid()
    )
  ) AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text));

CREATE POLICY teacher_chapter_progress_insert ON public.chapter_progress FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.student_enrollments se
    WHERE se.id = chapter_progress.enrollment_id AND se.course_id IN (
      SELECT c2.id FROM public.courses c2 WHERE c2.created_by = auth.uid()
    )
  ) AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text));

CREATE POLICY teacher_chapter_progress_update ON public.chapter_progress FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.student_enrollments se
    WHERE se.id = chapter_progress.enrollment_id AND se.course_id IN (
      SELECT c2.id FROM public.courses c2 WHERE c2.created_by = auth.uid()
    )
  ) AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.student_enrollments se
    WHERE se.id = chapter_progress.enrollment_id AND se.course_id IN (
      SELECT c2.id FROM public.courses c2 WHERE c2.created_by = auth.uid()
    )
  ) AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text));

CREATE POLICY teacher_assessments_all ON public.assessments FOR ALL TO authenticated
  USING (created_by = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text))
  WITH CHECK (created_by = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text));

CREATE POLICY teacher_submissions_select ON public.assessment_submissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_submissions.assessment_id AND a.created_by = auth.uid()
  ) AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text));

CREATE POLICY teacher_submissions_update ON public.assessment_submissions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_submissions.assessment_id AND a.created_by = auth.uid()
  ) AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_submissions.assessment_id AND a.created_by = auth.uid()
  ) AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text));

-- ROLE 4: student — Own progress + submissions only
CREATE POLICY student_chapter_progress_select ON public.chapter_progress FOR SELECT TO authenticated
  USING (student_id = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text));

CREATE POLICY student_submissions_select ON public.assessment_submissions FOR SELECT TO authenticated
  USING (student_id = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text));

CREATE POLICY student_submissions_insert ON public.assessment_submissions FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text));

CREATE POLICY student_submissions_update ON public.assessment_submissions FOR UPDATE TO authenticated
  USING (student_id = auth.uid()
    AND submission_status IN ('not_submitted', 'submitted', 'returned_for_revision')
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text))
  WITH CHECK (student_id = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text));

-- ROLE 5: parent — Child's progress + submissions only
CREATE POLICY parent_chapter_progress_select ON public.chapter_progress FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.parents p WHERE p.student_id = chapter_progress.student_id
  ) AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'parent'::text));

CREATE POLICY parent_submissions_select ON public.assessment_submissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.parents p WHERE p.student_id = assessment_submissions.student_id
  ) AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'parent'::text));

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapter_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_submissions TO authenticated;
GRANT SELECT, INSERT ON public.assessment_rubric_grades TO authenticated;

GRANT ALL ON public.chapter_progress TO service_role;
GRANT ALL ON public.assessments TO service_role;
GRANT ALL ON public.assessment_submissions TO service_role;
GRANT ALL ON public.assessment_rubric_grades TO service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. TRIGGER FUNCTIONS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_course_average_on_grade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg numeric;
BEGIN
  IF NEW.mark_earned IS NOT NULL AND NEW.graded_at IS NOT NULL THEN
    SELECT AVG(mark_percentage) INTO v_avg
    FROM public.assessment_submissions
    WHERE enrollment_id = NEW.enrollment_id
      AND submission_status = 'graded';

    UPDATE public.student_enrollments
    SET progress_percentage = COALESCE(ROUND(v_avg)::int, progress_percentage),
        updated_at = now()
    WHERE id = NEW.enrollment_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_course_average_on_grade() IS 'Trigger: after grading — recalculate enrollment average mark';

CREATE TRIGGER on_assessment_graded
  AFTER UPDATE OF mark_earned ON public.assessment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_course_average_on_grade();

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. RPC FUNCTIONS
-- ══════════════════════════════════════════════════════════════════════════════

-- 5.1 UPDATE CHAPTER PROGRESS
CREATE OR REPLACE FUNCTION public.update_chapter_progress(
  p_enrollment_id           uuid,
  p_chapter_id              uuid,
  p_completion_percentage   int DEFAULT NULL,
  p_status                  text DEFAULT NULL,
  p_time_spent_minutes      int DEFAULT 0
)
RETURNS TABLE(progress_id uuid, status text, message text, new_completion_percentage int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id      uuid;
  v_course_id   uuid;
  v_student_id  uuid;
  v_existing    record;
  v_new_pct     int;
  v_new_status  text;
BEGIN
  IF p_completion_percentage IS NOT NULL AND (p_completion_percentage < 0 OR p_completion_percentage > 100) THEN
    RAISE EXCEPTION 'completion_percentage must be between 0 and 100';
  END IF;

  IF p_status IS NOT NULL AND p_status NOT IN ('not_started', 'in_progress', 'completed', 'review_pending') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  SELECT se.organization_id, se.course_id, se.student_id
  INTO v_org_id, v_course_id, v_student_id
  FROM public.student_enrollments se
  WHERE se.id = p_enrollment_id;

  IF NOT FOUND THEN
    progress_id := NULL;
    status := 'error';
    message := 'Enrollment not found';
    new_completion_percentage := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT cp.id, cp.completion_percentage, cp.status INTO v_existing
  FROM public.chapter_progress cp
  WHERE cp.enrollment_id = p_enrollment_id AND cp.chapter_id = p_chapter_id;

  v_new_pct := COALESCE(p_completion_percentage, COALESCE(v_existing.completion_percentage, 0));
  v_new_status := COALESCE(p_status, COALESCE(v_existing.status, 'not_started'));

  IF v_new_pct = 100 THEN
    v_new_status := 'completed';
  END IF;

  IF FOUND THEN
    UPDATE public.chapter_progress
    SET completion_percentage = v_new_pct,
        status = v_new_status,
        time_spent_minutes = time_spent_minutes + p_time_spent_minutes,
        completed_at = CASE WHEN v_new_status = 'completed' AND completed_at IS NULL THEN now() ELSE completed_at END,
        updated_at = now()
    WHERE id = v_existing.id;

    progress_id := v_existing.id;
  ELSE
    INSERT INTO public.chapter_progress (
      organization_id, enrollment_id, course_id, chapter_id, student_id,
      completion_percentage, status, started_at, time_spent_minutes
    ) VALUES (
      v_org_id, p_enrollment_id, v_course_id, p_chapter_id, v_student_id,
      v_new_pct, v_new_status,
      CASE WHEN v_new_status IN ('in_progress', 'completed') THEN now() ELSE NULL END,
      p_time_spent_minutes
    )
    RETURNING id INTO progress_id;
  END IF;

  PERFORM pg_notify('progress', json_build_object(
    'event', 'progress_updated',
    'enrollment_id', p_enrollment_id,
    'chapter_id', p_chapter_id,
    'completion', v_new_pct
  )::text);

  status := 'success';
  message := 'Chapter progress updated';
  new_completion_percentage := v_new_pct;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.update_chapter_progress(uuid, uuid, int, text, int)
  IS 'Create or update chapter progress — idempotent upsert, auto-complete at 100%';

GRANT EXECUTE ON FUNCTION public.update_chapter_progress(uuid, uuid, int, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_chapter_progress(uuid, uuid, int, text, int) TO service_role;

-- 5.2 SUBMIT ASSESSMENT
CREATE OR REPLACE FUNCTION public.submit_assessment(
  p_assessment_id       uuid,
  p_enrollment_id       uuid,
  p_submission_content  jsonb,
  p_submission_files    jsonb DEFAULT NULL
)
RETURNS TABLE(submission_id uuid, status text, message text, submitted_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id      uuid;
  v_student_id  uuid;
  v_existing_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.assessments WHERE id = p_assessment_id) THEN
    submission_id := NULL;
    status := 'error';
    message := 'Assessment not found';
    submitted_at := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT se.organization_id, se.student_id INTO v_org_id, v_student_id
  FROM public.student_enrollments se
  WHERE se.id = p_enrollment_id;

  IF NOT FOUND THEN
    submission_id := NULL;
    status := 'error';
    message := 'Enrollment not found';
    submitted_at := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT id INTO v_existing_id
  FROM public.assessment_submissions
  WHERE assessment_id = p_assessment_id AND enrollment_id = p_enrollment_id;

  IF FOUND THEN
    UPDATE public.assessment_submissions
    SET submission_content = p_submission_content,
        submission_files = COALESCE(p_submission_files, submission_files),
        submission_status = 'submitted',
        submitted_at = now(),
        updated_at = now()
    WHERE id = v_existing_id;

    submission_id := v_existing_id;
  ELSE
    INSERT INTO public.assessment_submissions (
      organization_id, assessment_id, enrollment_id, student_id,
      submission_content, submission_files, submission_status, submitted_at
    ) VALUES (
      v_org_id, p_assessment_id, p_enrollment_id, v_student_id,
      p_submission_content, p_submission_files, 'submitted', now()
    )
    RETURNING id INTO submission_id;
  END IF;

  PERFORM pg_notify('assessments', json_build_object(
    'event', 'assessment_submitted',
    'assessment_id', p_assessment_id,
    'enrollment_id', p_enrollment_id
  )::text);

  status := 'success';
  message := 'Assessment submitted';
  submitted_at := now();
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.submit_assessment(uuid, uuid, jsonb, jsonb)
  IS 'Submit or resubmit an assessment — idempotent upsert on (assessment, enrollment)';

GRANT EXECUTE ON FUNCTION public.submit_assessment(uuid, uuid, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_assessment(uuid, uuid, jsonb, jsonb) TO service_role;

-- 5.3 GRADE ASSESSMENT
CREATE OR REPLACE FUNCTION public.grade_assessment(
  p_submission_id   uuid,
  p_mark_earned     int,
  p_grader_id       uuid,
  p_feedback        text DEFAULT NULL
)
RETURNS TABLE(submission_id uuid, status text, message text, mark_percentage int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mark_total    int;
  v_enrollment_id uuid;
  v_pct           int;
BEGIN
  IF p_mark_earned < 0 THEN
    RAISE EXCEPTION 'mark_earned cannot be negative';
  END IF;

  SELECT mark_total, enrollment_id INTO v_mark_total, v_enrollment_id
  FROM public.assessment_submissions
  WHERE id = p_submission_id;

  IF NOT FOUND THEN
    submission_id := NULL;
    status := 'error';
    message := 'Submission not found';
    mark_percentage := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  v_pct := ROUND(p_mark_earned::numeric / v_mark_total * 100);

  UPDATE public.assessment_submissions
  SET mark_earned = p_mark_earned,
      feedback = COALESCE(p_feedback, feedback),
      graded_by_user_id = p_grader_id,
      graded_at = now(),
      submission_status = 'graded',
      feedback_updated_at = CASE WHEN p_feedback IS NOT NULL THEN now() ELSE feedback_updated_at END,
      updated_at = now()
  WHERE id = p_submission_id;

  PERFORM pg_notify('assessments', json_build_object(
    'event', 'assessment_graded',
    'submission_id', p_submission_id,
    'mark', p_mark_earned,
    'percentage', v_pct
  )::text);

  submission_id := p_submission_id;
  status := 'success';
  message := 'Assessment graded';
  mark_percentage := v_pct;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.grade_assessment(uuid, int, uuid, text)
  IS 'Grade a submission — sets mark, feedback, grader, triggers average recalc';

GRANT EXECUTE ON FUNCTION public.grade_assessment(uuid, int, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grade_assessment(uuid, int, uuid, text) TO service_role;

-- 5.4 GET STUDENT PROGRESS REPORT
CREATE OR REPLACE FUNCTION public.get_student_progress_report(
  p_enrollment_id uuid
)
RETURNS TABLE(
  chapter_id              uuid,
  chapter_title           text,
  completion_percentage   int,
  status                  text,
  time_spent_minutes      int,
  started_at              timestamptz,
  completed_at            timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.chapter_id,
    ch.title,
    cp.completion_percentage,
    cp.status,
    cp.time_spent_minutes,
    cp.started_at,
    cp.completed_at
  FROM public.chapter_progress cp
  JOIN public.chapters ch ON cp.chapter_id = ch.id
  WHERE cp.enrollment_id = p_enrollment_id
  ORDER BY ch.order_index ASC;
END;
$$;

COMMENT ON FUNCTION public.get_student_progress_report(uuid)
  IS 'Returns per-chapter progress for an enrollment, ordered by chapter sequence';

GRANT EXECUTE ON FUNCTION public.get_student_progress_report(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_progress_report(uuid) TO service_role;

-- 5.5 GET ASSESSMENT GRADES REPORT
CREATE OR REPLACE FUNCTION public.get_assessment_grades_report(
  p_enrollment_id uuid,
  p_course_id      uuid DEFAULT NULL
)
RETURNS TABLE(
  assessment_id       uuid,
  assessment_title    text,
  submission_status   text,
  mark_earned         int,
  mark_total          int,
  mark_percentage     int,
  submitted_at        timestamptz,
  graded_at           timestamptz,
  feedback            text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    asub.assessment_id,
    a.title,
    asub.submission_status,
    asub.mark_earned,
    asub.mark_total,
    asub.mark_percentage,
    asub.submitted_at,
    asub.graded_at,
    asub.feedback
  FROM public.assessment_submissions asub
  JOIN public.assessments a ON asub.assessment_id = a.id
  WHERE asub.enrollment_id = p_enrollment_id
    AND (p_course_id IS NULL OR a.course_id = p_course_id)
  ORDER BY asub.submitted_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_assessment_grades_report(uuid, uuid)
  IS 'Returns assessment grades for an enrollment, optionally filtered by course';

GRANT EXECUTE ON FUNCTION public.get_assessment_grades_report(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_assessment_grades_report(uuid, uuid) TO service_role;

COMMIT;
