-- Fix chapter sequence guard (D-CHAPSEQ).
-- Supersedes the guard created in migration 018_lms_chapter_sequence_validation.sql.
-- Item 3 probe finding: 018's guard was vacuous -- it passed if at least one
-- prior chapter was complete, instead of requiring ALL prior chapters complete.
-- Also renames the trigger from check_chapter_sequence to trg_chapter_progress_sequence
-- to match the trg_ convention. No schema/column changes; behavior fix only.

CREATE OR REPLACE FUNCTION public.check_chapter_sequence_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_chapter_order INTEGER;
  v_course_id UUID;
BEGIN
  -- Locate the target chapter; fail-loud if it does not exist.
  SELECT public.chapters.order_index, public.chapters.course_id
    INTO v_chapter_order, v_course_id
    FROM public.chapters
   WHERE public.chapters.id = NEW.chapter_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'chapter_sequence: chapter % not found', NEW.chapter_id;
  END IF;

  -- Enforce ALL predecessor chapters in the same course are completed.
  -- Fails if ANY chapter with order_index < v_chapter_order has no
  -- chapter_progress row for this student.
  IF EXISTS (
    SELECT 1
      FROM public.chapters ch
     WHERE ch.course_id = v_course_id
       AND ch.order_index < v_chapter_order
       AND NOT EXISTS (
         SELECT 1 FROM public.chapter_progress cp
          WHERE cp.student_id = NEW.student_id
            AND cp.chapter_id = ch.id
       )
  ) THEN
    RAISE EXCEPTION 'Previous chapters must be completed before marking this chapter complete';
  END IF;

  RETURN NEW;
END;
$function$;

-- Drop the old (mis-named, vacuous) trigger.
DROP TRIGGER IF EXISTS check_chapter_sequence ON public.chapter_progress;

-- Create the corrected trigger under the trg_ convention.
CREATE TRIGGER trg_chapter_progress_sequence
  BEFORE INSERT ON public.chapter_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.check_chapter_sequence_completion();
