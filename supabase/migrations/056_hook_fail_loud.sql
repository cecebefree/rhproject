-- 056: fix custom_access_token_hook silent exception handler
-- Ref: docs/governance/defect-hook-silent-exception.md
-- Ruling: no profile row = RAISE (fail loud). Profile with NULL tenant_id
-- (pre-assignment signup, D15) mints with null tenant + RAISE WARNING;
-- contained by deny-by-default RLS. WHEN OTHERS swallow removed entirely:
-- unexpected errors now propagate and block token issuance.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  _user_id uuid;
  _tenant_id uuid;
  _role text;
begin
  _user_id := (event->'claims'->>'sub')::uuid;

  select p.tenant_id, p.role
    into _tenant_id, _role
    from public.profiles p
   where p.id = _user_id;

  if not found then
    raise exception 'custom_access_token_hook: no profile row for user %', _user_id;
  end if;

  if _tenant_id is null then
    raise warning 'custom_access_token_hook: profile % has null tenant_id (pending assignment)', _user_id;
  end if;

  event := jsonb_set(
    event,
    '{claims,app_metadata}',
    coalesce(event->'claims'->'app_metadata', '{}'::jsonb)
      || jsonb_build_object('tenant_id', _tenant_id, 'role', _role)
  );

  return event;
end;
$$;
