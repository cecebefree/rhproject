-- ITEM-62, DEFECT-003 lineage. SESSION-2026-07-25.md:35.
-- Evidence: 062:82 (GRANT UPDATE (handle) ON public.profiles TO
-- authenticated), 066:11 (GRANT INSERT ON public.handle_changes TO
-- service_role).
-- The grants at 066:8 (SELECT, UPDATE, INSERT ON public.profiles TO
-- service_role) are required by the set_handle Edge Function and are
-- intentionally NOT touched.

REVOKE UPDATE (handle) ON public.profiles FROM authenticated;

REVOKE INSERT ON public.handle_changes FROM service_role;