-- Migration: Add last_accessed_at to enrollments + enrollment_progress view
-- Supports T044 (congratulations message) and T045 (last accessed tracking)

-- Add last_accessed_at column to track when student last viewed a course
ALTER TABLE school_desk.enrollments
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ;

COMMENT ON COLUMN school_desk.enrollments.last_accessed_at
  IS 'Timestamp when student last accessed this course (for progress display)';

-- Create a view that combines enrollment + completion data for student dashboards
-- NOTE: chapter_progress has no 'completed' column — a row's existence = completed
CREATE OR REPLACE VIEW school_desk.enrollment_progress AS
SELECT
  e.id AS enrollment_id,
  e.student_id,
  e.course_id,
  e.tenant_id,
  e.purchased_at,
  e.last_accessed_at,
  sc.title AS course_title,
  sc.description AS course_description,
  COALESCE(
    (SELECT COUNT(*)
     FROM public.chapter_progress cp
     JOIN public.chapters ch ON ch.id = cp.chapter_id
     WHERE ch.course_id = e.course_id
       AND cp.student_id = e.student_id),
    0
  ) AS completed_chapters,
  COALESCE(
    (SELECT COUNT(*)
     FROM public.chapters ch
     WHERE ch.course_id = e.course_id),
    0
  ) AS total_chapters,
  CASE
    WHEN COALESCE(
      (SELECT COUNT(*) FROM public.chapters ch WHERE ch.course_id = e.course_id),
      0
    ) = 0 THEN 0
    ELSE ROUND(
      COALESCE(
        (SELECT COUNT(*)
         FROM public.chapter_progress cp
         JOIN public.chapters ch ON ch.id = cp.chapter_id
         WHERE ch.course_id = e.course_id
           AND cp.student_id = e.student_id),
        0
      ) * 100.0 /
      GREATEST(
        (SELECT COUNT(*) FROM public.chapters ch WHERE ch.course_id = e.course_id),
        1
      )
    )
  END AS completion_pct
FROM school_desk.enrollments e
JOIN school_desk.courses sc ON sc.id = e.course_id;

-- RPC to update last_accessed_at (called when student opens a course)
CREATE OR REPLACE FUNCTION public.touch_enrollment_access(
  p_student_id UUID,
  p_course_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE school_desk.enrollments
  SET last_accessed_at = NOW()
  WHERE student_id = p_student_id
    AND course_id = p_course_id;
END;
$$;

-- RLS: students can see their own enrollment progress
ALTER VIEW school_desk.enrollment_progress SET (security_invoker = true);
