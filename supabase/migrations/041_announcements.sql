-- 041_announcements.sql (P2-025)
-- Announcements: tenant-scoped broadcast messages with role-based audience,
-- publish/expiry scheduling, and pinned ordering.
-- tenant_id is a plain uuid column with NO foreign key.

begin;

-- 1. Announcement table
create table public.announcement (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null,
  title           text not null,
  body            text not null,
  audience_roles  text[] not null default '{}',
  publish_at      timestamptz not null default now(),
  expires_at      timestamptz,
  pinned          boolean not null default false,
  created_by      uuid not null references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint announcement_expiry_check check (expires_at is null or expires_at > publish_at)
);

-- 2. Indexes
create index idx_announcement_tenant on public.announcement (tenant_id);
create index idx_announcement_feed
    on public.announcement (tenant_id, pinned desc, publish_at desc);

-- 3. Read model function
-- Non-admin: only published, non-expired rows matching caller's role.
-- Admin: all rows within tenant (future-dated and expired included).
create or replace function public.get_announcements()
returns table (
  id uuid, tenant_id uuid, title text, body text,
  audience_roles text[], publish_at timestamptz,
  expires_at timestamptz, pinned boolean, created_by uuid, created_at timestamptz
)
  language sql stable
  as $$
  select a.id, a.tenant_id, a.title, a.body, a.audience_roles,
         a.publish_at, a.expires_at, a.pinned, a.created_by, a.created_at
  from public.announcement a
  where a.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
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
$$;

-- 4. Enable RLS
alter table public.announcement enable row level security;

-- 5. RLS policies

-- Non-admin read: published, non-expired, matching audience
create policy ann_self_read on public.announcement
  for select to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and publish_at <= now()
    and (expires_at is null or expires_at > now())
    and (
      audience_roles = '{}'
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = any(audience_roles)
      )
    )
  );

-- Admin: full read/write within tenant (no time/audience restriction)
create policy ann_admin_all on public.announcement
  for all to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 6. Grants (RLS gates actual access; grants enable the delivery path)
grant select, insert, update, delete on public.announcement to authenticated;
grant execute on function public.get_announcements() to authenticated;

-- 7. updated_at trigger (reuse set_updated_at from 019)
create trigger trg_announcement_updated_at
  before update on public.announcement
  for each row execute function public.set_updated_at();

commit;
