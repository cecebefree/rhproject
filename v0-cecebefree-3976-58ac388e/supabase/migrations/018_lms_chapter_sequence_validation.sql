-- LMS Core: Add sequential chapter completion validation
-- This ensures students can only mark a chapter complete if all previous chapters are complete

-- Function to check if previous chapters are completed
CREATE OR REPLACE FUNCTION public.check_chapter_sequence_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_chapter_order INTEGER;
  v_course_id UUID;
  v_prev_order INTEGER;
BEGIN
  -- Get the chapter's order and course
  SELECT order_index, course_id INTO v_chapter_order, v_course_id
  FROM public.chapters
  WHERE id = NEW.chapter_id;

  -- If it's chapter 0 (first chapter), allow
  IF v_chapter_order = 0 THEN
    RETURN NEW;
  END IF;

  -- Check if all previous chapters are completed
  IF NOT EXISTS (
    SELECT 1
    FROM public.chapter_progress cp
    JOIN public.chapters ch ON cp.chapter_id = ch.id
    WHERE cp.student_id = NEW.student_id
      AND ch.course_id = v_course_id
      AND ch.order_index < v_chapter_order
  ) THEN
    RAISE EXCEPTION 'Previous chapters must be completed before marking this chapter complete';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS check_chapter_sequence ON public.chapter_progress;

-- Add trigger to enforce sequential completion
CREATE TRIGGER check_chapter_sequence
  BEFORE INSERT ON public.chapter_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.check_chapter_sequence_completion();