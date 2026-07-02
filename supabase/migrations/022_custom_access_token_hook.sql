-- Migration 022: custom_access_token_hook (SECURITY DEFINER)
-- Handoff ref: .swarm/deferred.md line 68-70
-- Injects tenant_id + role into JWT app_metadata on every token refresh.
-- Grants EXECUTE to supabase_auth_admin (Supabase Auth calls this hook).
-- config.toml [auth.hook.custom_access_token] already staged (Step 3).

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
  -- Extract user ID from the event payload
  _user_id := (event->'claims'->>'sub')::uuid;

  -- Look up tenant_id and role from profiles
  SELECT p.tenant_id, p.role
    INTO _tenant_id, _role
    FROM public.profiles p
   WHERE p.id = _user_id;

  -- Inject into app_metadata (merged into existing claims)
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
  -- Fail-loud: return original event so auth does not break
  RETURN event;
END;
$$;

-- Grant EXECUTE so Supabase Auth (supabase_auth_admin) can call the hook
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;

COMMIT;
