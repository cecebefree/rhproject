-- 082_get_today_devotional.sql
-- SECURITY DEFINER RPC: returns today's devotional item(s) for the caller's tenant.
-- Pattern follows get_announcements() from 041.
-- devotional_item RLS is admin-only (024); student/teacher reads need this RPC.
-- day column = day-of-year (1-366); resolved via extract(doy from current_date).

BEGIN;

CREATE OR REPLACE FUNCTION public.get_today_devotional()
RETURNS TABLE (
  id uuid,
  type text,
  day integer,
  url_or_text text,
  is_iframe boolean,
  created_at timestamptz
)
  LANGUAGE sql STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT di.id, di.type, di.day, di.url_or_text, di.is_iframe, di.created_at
  FROM public.devotional_item di
  WHERE di.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND di.is_active = true
    AND di.deleted_at IS NULL
    AND di.day = extract(doy from current_date)::int
  ORDER BY di.type;
$$;

GRANT EXECUTE ON FUNCTION public.get_today_devotional() TO authenticated;

COMMENT ON FUNCTION public.get_today_devotional() IS
  'SECURITY DEFINER: returns active devotional items for caller tenant, day = day-of-year. Used by Home screen.';

COMMIT;
