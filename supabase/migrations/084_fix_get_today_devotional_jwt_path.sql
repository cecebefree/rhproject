-- 084_fix_get_today_devotional_jwt_path.sql
-- FIX: get_today_devotional (082) reads tenant_id from root-level
-- auth.jwt() ->> 'tenant_id' which returns NULL.
-- The custom_access_token_hook (022) injects tenant_id into app_metadata.
-- Correct path: auth.jwt() -> 'app_metadata' ->> 'tenant_id'
--
-- PREDECESSOR: 083_get_teacher_name.sql

BEGIN;

DROP FUNCTION IF EXISTS public.get_today_devotional();

CREATE OR REPLACE FUNCTION public.get_today_devotional()
RETURNS TABLE (
  id uuid,
  type text,
  day int,
  url_or_text text,
  is_iframe boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT di.id, di.type, di.day, di.url_or_text, di.is_iframe, di.created_at
  FROM public.devotional_item di
  WHERE di.tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND di.is_active = true
    AND di.deleted_at IS NULL
    AND di.day = extract(doy from current_date)::int
  ORDER BY di.type;
$$;

GRANT EXECUTE ON FUNCTION public.get_today_devotional() TO authenticated;

COMMENT ON FUNCTION public.get_today_devotional() IS
  'SECURITY DEFINER: returns active devotional items for caller tenant, day = day-of-year. Used by Home screen. JWT path: app_metadata -> tenant_id (084 fix).';

COMMIT;
