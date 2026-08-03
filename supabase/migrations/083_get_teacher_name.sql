-- 083_get_teacher_name.sql
-- SECURITY DEFINER RPC: returns teacher name + role for display in class screens.
-- Needed because profiles RLS only allows self-read; students cannot join
-- profiles to get teacher names. Minimal disclosure: name + role only.
-- Tenant-scoped: only returns teachers within the caller's tenant.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_teacher_name(p_teacher_id uuid)
RETURNS TABLE (
  name text,
  role text
)
  LANGUAGE sql STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT p.name, p.role
  FROM public.profiles p
  WHERE p.id = p_teacher_id
    AND p.tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND p.role IN ('teacher', 'admin');
$$;

REVOKE ALL ON FUNCTION public.get_teacher_name(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_name(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_teacher_name(uuid) IS
  'SECURITY DEFINER: returns teacher name + role for display. Tenant-scoped. Used by class screens.';

COMMIT;
