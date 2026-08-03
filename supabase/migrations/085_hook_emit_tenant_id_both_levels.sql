-- 085_hook_emit_tenant_id_both_levels.sql
-- FIX: custom_access_token_hook (022) injects tenant_id only into
-- app_metadata. 58 RLS policies read root-level auth.jwt() ->> 'tenant_id'
-- which returns NULL → all SELECT blocked for authenticated users.
--
-- FIX STRATEGY: emit tenant_id at BOTH root level and app_metadata.
-- This fixes all 58 broken RLS policies without rewriting them.
-- The app_metadata path (048/053/067/083/084) continues to work.
--
-- PREDECESSOR: 084_fix_get_today_devotional_jwt_path.sql

BEGIN;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

  -- Root level: fixes 58 RLS policies that read auth.jwt() ->> 'tenant_id'
  event := jsonb_set(event, '{claims,tenant_id}', to_jsonb(_tenant_id));

  -- app_metadata: preserves canonical path used by 048/053/067/083/084
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
EXCEPTION WHEN OTHERS THEN
  RETURN event;
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;

COMMIT;
