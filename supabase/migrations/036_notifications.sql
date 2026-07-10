-- 036_notifications.sql (P2-017)
-- In-app notifications replace email for School Desk communication.
-- RLS is the security boundary; grants only enable the delivery path.
-- tenant_id is a plain uuid column with NO foreign key — there is no
-- public.tenants table. Scoping is column-value only, same pattern
-- as student_class and platform_access.

begin;

-- 1. Create table
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  tenant_id  uuid not null,  -- PLAIN COLUMN, NO FK
  type       text not null check (type in ('announcement','enrolment','schedule','system')),
  title      text not null,
  body       text not null,
  read_at    timestamptz,  -- null = unread; set when user reads it
  created_at timestamptz not null default now()
);

-- 2. Index for notification feed query
create index idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

-- 3. Enable row level security
alter table public.notifications enable row level security;

-- 4. RLS policies
create policy notif_self_read on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy notif_self_mark_read on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 5. Realtime wiring (same pattern as 029 and 033)
alter table public.notifications replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

commit;
