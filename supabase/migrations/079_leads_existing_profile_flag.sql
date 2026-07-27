-- 079_leads_existing_profile_flag.sql
-- ITEM-23-DEP-C: internal-only marker on public.leads indicating the
-- submitted email already belongs to a live auth account.
-- Ruling 2026-07-27: flag means ANY auth account (approved or not).
-- The flag is never exposed to the submitter; leads remains RLS
-- default-deny with no policies (078). Sole write path: submit-lead EF
-- via service_role.


begin;


-- 1. Column: internal flag, defaults false, backfill-safe.
alter table public.leads
  add column existing_profile boolean not null default false;


comment on column public.leads.existing_profile is
  'True if the lead email matched an existing auth.users account at submission time (any account, not only approved profiles). Internal-only; set exclusively by the submit-lead Edge Function.';


-- 2. Definer helper: lets the EF check auth.users without granting the
--    service path any broader read surface. Fail-closed: null/absent
--    email yields false via exists().
create or replace function public.email_is_registered(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where lower(u.email) = lower(p_email)
      and u.deleted_at is null
  );
$$;


comment on function public.email_is_registered(text) is
  'ITEM-23-DEP-C: returns true if the given email belongs to a live (non-deleted) auth account. Execute restricted to service_role; consumed only by the submit-lead Edge Function.';


-- 3. Grant surface: service_role only. Explicit revoke first so the
--    default PUBLIC execute grant on functions cannot survive.
revoke execute on function public.email_is_registered(text) from public;
revoke execute on function public.email_is_registered(text) from anon;
revoke execute on function public.email_is_registered(text) from authenticated;
grant execute on function public.email_is_registered(text) to service_role;


commit;
