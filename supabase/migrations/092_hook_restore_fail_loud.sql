-- 092: restore hook fail-loud — RAISE on missing profile, remove WHEN OTHERS swallow
-- Regressed by 085/087 which removed the NOT FOUND guard and added catch-all.
-- This migration restores the fail-loud behavior from 056 while keeping
-- the 085/087 app_metadata emission exactly as-is.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
  _tenant_id uuid;
  _role text;
BEGIN
  _user_id := (event->'claims'->>'sub')::uuid;

  SELECT p.tenant_id, p.role
    INTO _tenant_id, _role
    FROM public.profiles p
   WHERE p.id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'custom_access_token_hook: no profile row for user %', _user_id;
  END IF;

  -- app_metadata: canonical path used by jwt_tenant_id() (086)
  -- and policies 048/053/067/083/084
  event := jsonb_set(
    event,
    '{claims,app_metadata}',
    COALESCE(event->'claims'->'app_metadata', '{}'::jsonb)
      || jsonb_build_object(
           'tenant_id', _tenant_id,
           'role', _role
         )
  );

  RETURN event;
END;
$function$;
