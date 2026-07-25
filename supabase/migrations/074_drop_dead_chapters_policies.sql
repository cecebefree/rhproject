-- ITEM-60: drop dead chapters policies from 015.
-- Precedent: 072 (dead INSERT/DELETE on chapter_progress + enrollments).
-- These policies target {public} role but the underlying table grants
-- only include SELECT for service_role — the policies can never succeed.
-- Authenticated reads will come via SECURITY DEFINER RPC (ITEM-59).

DROP POLICY "Anyone can view chapters of published courses" ON public.chapters;
DROP POLICY "Teachers can manage chapters of their courses" ON public.chapters;
DROP POLICY "Admins can view all chapters" ON public.chapters;
