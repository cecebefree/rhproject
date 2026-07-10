-- 037_schedule.sql (P2-012)
-- Terms + schedule_slot tables.
-- schedule_slot = TIME only (when class meets); content lives in future curriculum model.
-- tenant_id is always a plain uuid column with NO foreign key -- no public.tenants table.
-- Exclusion: btree_gist + intarray + anchored tsrange prevents overlaps
-- across both time AND day-of-week dimensions.

begin;

-- 1. Extensions
create extension if not exists btree_gist;
create extension if not exists intarray;

-- 2. Immutable helper for exclusion constraint (anchored tsrange)
-- NOTE: initial attempt used timerange(time,time,text) -- failed with
-- "function timerange(time, time, text) does not exist". Root cause was
-- search_path resolution: unqualified call inside a SQL-language function
-- could not find the auto-generated constructor. Fallback: tsrange with
-- date+time arithmetic. Works identically; no custom range type needed.

-- Anchor at 2000-01-01 so the range is deterministic per slot row.
create or replace function public.make_timerange(
  p_start time, p_end time
) returns tsrange
  language sql immutable
  as $$
  select tsrange(
    '2000-01-01'::date + p_start,
    '2000-01-01'::date + p_end,
    '[)'
  );
$$;

-- 3. Terms table
create table public.terms (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,  -- PLAIN COLUMN, NO FK
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_date > start_date)
);

alter table public.terms enable row level security;

create policy terms_member_read on public.terms
  for select to authenticated
  using (
    is_active
    and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

create policy terms_admin_read on public.terms
  for select to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy terms_admin_write on public.terms
  for all to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- 4. Schedule slot table
create table public.schedule_slot (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null,  -- PLAIN COLUMN, NO FK
  course_id      uuid not null references public.courses(id) on delete cascade,
  term_id        uuid not null references public.terms(id) on delete cascade,
  label          text,  -- slot-level label (e.g. 'Section A'); nullable, never mirrors course name
  start_time     time not null,
  end_time       time not null,
  days_of_week   integer[] not null,  -- ISO: 1=Mon..7=Sun
  recurrence     text not null default 'weekly' check (recurrence in ('weekly','biweekly','once')),
  start_date     date,  -- optional override within term for ad-hoc slots
  end_date       date,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (end_time > start_time),
  check (
    start_date is null and end_date is null
    or (start_date is not null and end_date is not null and end_date >= start_date)
  ),
  check (
    days_of_week <@ ARRAY[1,2,3,4,5,6,7]
    and cardinality(days_of_week) > 0
  ),
  exclude using gist (
    tenant_id with =,
    course_id with =,
    days_of_week with &&,
    public.make_timerange(start_time, end_time) with &&
  ) where (is_active)
);

-- 5. Indexes
create index idx_schedule_slot_course_id on public.schedule_slot (course_id);
create index idx_schedule_slot_term_id on public.schedule_slot (term_id);
create index idx_schedule_slot_tenant_id on public.schedule_slot (tenant_id);

-- 6. Enable row level security
alter table public.schedule_slot enable row level security;

-- 7. RLS policies

-- Student read: via active enrolment in student_class + has_item_access window check
create policy ss_student_read on public.schedule_slot
  for select to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and public.has_item_access(schedule_slot.course_id)
    and exists (
      select 1 from public.student_class sc
      where sc.student_id = auth.uid()
        and sc.class_id = schedule_slot.course_id
        and sc.is_active
    )
  );

-- Teacher read: via course ownership
create policy ss_teacher_read on public.schedule_slot
  for select to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.courses c
      where c.id = schedule_slot.course_id
        and c.teacher_id = auth.uid()
    )
  );

-- Admin read: all slots for this tenant
create policy ss_admin_read on public.schedule_slot
  for select to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- D22: Schedule writes are Office Desk (admin) in Redhouse because
-- schedule is contract/payment-coupled; teacher-managed scheduling
-- is a future config-gated tenant capability, not a role widening.
-- Do not implement the toggle.
create policy ss_admin_write on public.schedule_slot
  for all to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- 8. updated_at triggers (reuse set_updated_at from 019)
create trigger trg_terms_updated_at
    before update on public.terms
    for each row execute function public.set_updated_at();

create trigger trg_schedule_slot_updated_at
    before update on public.schedule_slot
    for each row execute function public.set_updated_at();

-- 9. Grants (RLS policies gate actual access; grants enable the delivery path)
grant select, insert, update, delete on public.schedule_slot to authenticated;
grant select, insert, update, delete on public.terms to authenticated;

commit;
