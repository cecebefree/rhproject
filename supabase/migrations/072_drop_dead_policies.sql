-- ITEM-56: drop dead INSERT/DELETE policies on chapter_progress and enrollments.
-- These policies target {public} role but the underlying table grants
-- only include SELECT for authenticated — the policies can never succeed.

DROP POLICY "Students can mark chapters complete" ON public.chapter_progress;
DROP POLICY "Students can delete their own progress" ON public.chapter_progress;
DROP POLICY "Students can create enrollments" ON public.enrollments;
DROP POLICY "Students can delete their enrollments" ON public.enrollments;
