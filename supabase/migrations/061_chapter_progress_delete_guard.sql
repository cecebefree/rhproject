-- D-060-DEL: LIFO delete guard on public.chapter_progress.
-- Paired with migration 060 (BEFORE INSERT sequence guard). 060 blocks an
-- INSERT whose predecessor is incomplete; this guard blocks a DELETE that would
-- leave a later chapter complete while its predecessor is removed. Together they
-- keep the chapter_progress set for a (student, course) a non-decreasing
-- order_index prefix under normal student use.
-- Accepted risk (architect-sealed): service-role / direct UPDATE re-point of
-- chapter_id or student_id is outside the RLS threat model; no action here.

CREATE OR REPLACE FUNCTION public.check_chapter_progress_delete_allowed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_chapter_order INTEGER;
  v_course_id UUID;
BEGIN
  SELECT public.chapters.order_index, public.chapters.course_id
    INTO v_chapter_order, v_course_id
    FROM public.chapters
   WHERE public.chapters.id = OLD.chapter_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'chapter_delete_guard: chapter % not found', OLD.chapter_id;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.chapter_progress cp
      JOIN public.chapters ch ON ch.id = cp.chapter_id
     WHERE cp.student_id = OLD.student_id
       AND ch.course_id = v_course_id
       AND ch.order_index > v_chapter_order
  ) THEN
    RAISE EXCEPTION 'Later chapter progress must be deleted first';
  END IF;

  RETURN OLD;
END;
$function$;

CREATE TRIGGER trg_chapter_progress_delete_guard
  BEFORE DELETE ON public.chapter_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.check_chapter_progress_delete_allowed();
