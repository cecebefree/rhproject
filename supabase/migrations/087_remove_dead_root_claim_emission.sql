-- 087_remove_dead_root_claim_emission.sql
-- RETIRE dead code: remove the root-level tenant_id claim emission
-- from custom_access_token_hook.
--
-- GoTrue merges only app_metadata/user_metadata from hook output into
-- the JWT; root-level claims are stripped. Confirmed 2026-08 via
-- fresh-JWT decode (see docs/evidence/086-hosted-seal.md). Do not
-- re-add root emission.
--
-- PREDECESSOR: 085_hook_emit_tenant_id_both_levels.sql

BEGIN;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
EXCEPTION WHEN OTHERS THEN
  RETURN event;
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;

COMMIT;
