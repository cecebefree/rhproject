-- 094_fix_get_announcements_jwt_tenant_path.sql
-- DR-2d: Function-side tenant claim fix.
-- get_announcements() used auth.jwt() ->> 'tenant_id' (top-level claim),
-- but the custom_access_token_hook writes tenant_id into app_metadata.
-- This caused the function to read an empty string, returning 0 rows
-- for all authenticated users. Replaced with jwt_tenant_id() helper
-- which correctly resolves auth.jwt() -> 'app_metadata' ->> 'tenant_id'.
--
-- PREDECESSOR: 041_announcements_test.sql (depends on this function)

BEGIN;

CREATE OR REPLACE FUNCTION public.get_announcements()
 RETURNS TABLE(id uuid, tenant_id uuid, title text, body text, audience_roles text[], publish_at timestamp with time zone, expires_at timestamp with time zone, pinned boolean, created_by uuid, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select a.id, a.tenant_id, a.title, a.body, a.audience_roles,
         a.publish_at, a.expires_at, a.pinned, a.created_by, a.created_at
  from public.announcement a
  where a.tenant_id = jwt_tenant_id()
    and (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      or (
        a.publish_at <= now()
        and (a.expires_at is null or a.expires_at > now())
        and (
          a.audience_roles = '{}'
          or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = any(a.audience_roles))
        )
      )
    )
  order by a.pinned desc, a.publish_at desc;
$function$;

COMMIT;
