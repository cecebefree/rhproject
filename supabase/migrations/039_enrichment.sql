-- 039_enrichment.sql (P2-018)
-- Enrichment + clubs: type discriminator on courses, enrichment_meta table.
-- tenant_id is always a plain uuid column with NO foreign key.
-- teacher + admin write; student no write path.

begin;

-- 1. Add type discriminator to courses
alter table public.courses
  add column type text not null default 'core'
  check (type in ('core', 'club', 'enrichment'));

-- 2. Add open_to_outside flag (allows outside_student role on club/enrichment)
alter table public.courses
  add column open_to_outside boolean not null default false;

alter table public.courses
  add constraint courses_open_to_outside_check
  check (open_to_outside = false OR type IN ('club', 'enrichment'));

-- 3. Enrichment metadata table (per-student, per-course via student_class grain)
create table public.enrichment_meta (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null,  -- PLAIN COLUMN, NO FK
  student_class_id uuid not null references public.student_class(id) on delete cascade,
  pace             text not null default 'self-paced' check (pace in ('self-paced', 'structured')),
  completed        int not null default 0 check (completed >= 0),
  total            int not null default 0 check (total >= 0),
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (completed <= total OR total = 0),
  unique (student_class_id)
);

alter table public.enrichment_meta enable row level security;

-- 4. RLS policies (all include tenant_id predicate)

-- Student reads own enrichment meta
create policy em_self_read on public.enrichment_meta
  for select to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.student_class sc
      where sc.id = enrichment_meta.student_class_id
        and sc.student_id = auth.uid()
    )
  );

-- Teacher reads enrichment meta for own courses
create policy em_teacher_read on public.enrichment_meta
  for select to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.student_class sc
      join public.courses c on c.id = sc.class_id
      where sc.id = enrichment_meta.student_class_id
        and c.teacher_id = auth.uid()
    )
  );

-- Teacher writes enrichment meta for own courses (INSERT + UPDATE)
create policy em_teacher_write on public.enrichment_meta
  for insert to authenticated
  with check (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.student_class sc
      join public.courses c on c.id = sc.class_id
      where sc.id = enrichment_meta.student_class_id
        and c.teacher_id = auth.uid()
    )
  );

create policy em_teacher_write_update on public.enrichment_meta
  for update to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.student_class sc
      join public.courses c on c.id = sc.class_id
      where sc.id = enrichment_meta.student_class_id
        and c.teacher_id = auth.uid()
    )
  )
  with check (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.student_class sc
      join public.courses c on c.id = sc.class_id
      where sc.id = enrichment_meta.student_class_id
        and c.teacher_id = auth.uid()
    )
  );

-- Admin all (full bypass)
create policy em_admin_all on public.enrichment_meta
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

-- 4b. Restrictive policy: outside_student blocked from core courses
-- and from non-core courses not marked open_to_outside
create policy courses_no_core_outside on public.courses
  as restrictive
  for select to authenticated
  using (
    not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'outside_student')
    or (type != 'core' and open_to_outside = true)
  );

-- 5. Grants
grant select, insert, update, delete on public.enrichment_meta to authenticated;

-- 6. updated_at trigger (reuse set_updated_at from 019)
create trigger trg_enrichment_meta_updated_at
    before update on public.enrichment_meta
    for each row execute function public.set_updated_at();

commit;
