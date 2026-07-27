-- ITEM-59: chapters-read via SECURITY DEFINER RPC (design intent
--          per 074 header, row 52).
-- NOTE: This deliberately NARROWS dropped 015 policy 1
--       ("anyone views published"): reads now require published
--       AND (enrollment via has_item_access OR core +
--       has_core_access). Ruling 2026-07-27.
-- outside_student: ALLOW-LIST, enrichment only. Core never.
--       Clubs / music & art closed pending explicit ruling.

CREATE OR REPLACE FUNCTION public.chapters_read(p_course_id uuid)
RETURNS SETOF public.chapters
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT ch.*
  FROM public.chapters ch
  JOIN public.courses co ON co.id = ch.course_id
  WHERE ch.course_id = p_course_id
    -- Outside-student ALLOW-LIST: enrichment only (RULING 2026-07-27).
    -- Core: never. Clubs / music & art: closed until explicitly ruled open.
    AND (
      NOT EXISTS (SELECT 1 FROM public.profiles p
                  WHERE p.id = auth.uid() AND p.role = 'outside_student')
      OR co.type = 'enrichment'
    )
    AND (
      -- Student path: published + access
      ( co.status = 'published'
        AND ( public.has_item_access(p_course_id)
              OR (co.type = 'core' AND public.has_core_access()) ) )
      -- Outside-student path: published enrichment only (allow-list)
      OR ( co.status = 'published'
           AND co.type = 'enrichment'
           AND EXISTS (SELECT 1 FROM public.profiles p
                       WHERE p.id = auth.uid() AND p.role = 'outside_student') )
      -- Teacher path (dropped policy 2 semantics, drafts included)
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.id = co.teacher_id
          AND p.role IN ('teacher','admin') )
      -- Admin path (dropped policy 3 semantics)
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin' )
    )
  ORDER BY ch.order_index;
$$;


REVOKE ALL ON FUNCTION public.chapters_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chapters_read(uuid) TO authenticated;
