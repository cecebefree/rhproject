-- 035_platform_access.sql — per-platform open-doors table + RLS
begin;
create table public.platform_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id uuid not null,
  platform platform_key not null,
  access_starts_at timestamptz,
  access_ends_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, platform)
);
alter table public.platform_access enable row level security;
create policy pa_self_read on public.platform_access
  for select
  using (
    user_id = (auth.jwt() ->> 'sub')::uuid
    and tenant_id = (
      select p.tenant_id from public.profiles p
      where p.id = (auth.jwt() ->> 'sub')::uuid
    )
  );
grant select on public.platform_access to authenticated;
create or replace function public.has_platform_access(p_platform platform_key)
returns boolean language sql security definer set search_path = public
as $FUNC$
  select exists (
    select 1 from public.platform_access pa
    where pa.user_id = (auth.jwt() ->> 'sub')::uuid
      and pa.platform = p_platform
      and (pa.access_starts_at is null or pa.access_starts_at <= now())
      and (pa.access_ends_at is null or pa.access_ends_at >= now())
  );
$FUNC$;
commit;
