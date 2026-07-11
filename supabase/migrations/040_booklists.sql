-- 040_booklists.sql (P2-022)
-- Book catalog, booklist + booklist_item entitlement tables,
-- materialization + bookshelf functions, and family-child linking.
-- tenant_id is always a plain uuid column with NO foreign key.

begin;

-- 1. Family-child linking table (enables family-role RLS on child-scoped tables)
create table public.family_child (
  guardian_id uuid not null references public.profiles(id) on delete cascade,
  child_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (guardian_id, child_id)
);

-- 2. Book catalog table (tenant-scoped)
create table public.book (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null,
  title             text not null,
  cover_image_url   text,
  curriculum_type   text not null check (curriculum_type in ('cambridge','ib','home_school','library')),
  isbn_13           text,
  ebook_available   boolean not null default false,
  ebook_storage_path text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Loose isbn_13 format check
create or replace function public.check_isbn_format()
returns trigger
  language plpgsql
  as $$
begin
  if new.isbn_13 is not null then
    if not (new.isbn_13 ~ '^\d{13}$' or new.isbn_13 ~ '^\d{9}[\dX]$') then
      raise exception 'isbn_13 format invalid';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_book_isbn_check
  before insert or update on public.book
  for each row execute function public.check_isbn_format();

create unique index idx_book_tenant_isbn on public.book (tenant_id, isbn_13) where isbn_13 is not null;

-- 3. Booklist table (one row per child per school year)
create table public.booklist (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  child_id    uuid not null references public.profiles(id),
  school_year text not null,
  created_at  timestamptz not null default now(),
  unique (tenant_id, child_id, school_year)
);

-- 4. Booklist item table (the entitlement rows)
create table public.booklist_item (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  booklist_id uuid not null references public.booklist(id) on delete cascade,
  book_id     uuid references public.book(id),
  title       text not null,
  isbn        text,
  source_type text not null check (source_type in ('package','class','course','club')),
  source_id   uuid,
  permanent   boolean not null default false,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 5. Unique constraint for idempotent re-materialization
alter table public.booklist_item
  add constraint booklist_item_unique_source
  unique (booklist_id, source_type, source_id);

-- 6. Indexes
create index idx_book_tenant on public.book (tenant_id);
create index idx_book_tenant_isbn_scan on public.book (tenant_id, isbn_13);
create index idx_booklist_tenant_child_year on public.booklist (tenant_id, child_id, school_year);
create index idx_booklist_item_booklist_id on public.booklist_item (booklist_id);
create index idx_booklist_item_tenant_id on public.booklist_item (tenant_id);

-- 7. Materialization function
-- Placement-time pattern: called by admin/backend at registration or roll-over.
-- Idempotent: upserts booklist, skips existing booklist_item rows by unique source.
create or replace function public.materialize_booklist(
  p_child_id    uuid,
  p_school_year text,
  p_tenant_id   uuid
) returns setof public.booklist_item
  language plpgsql
  as $$
declare
  v_booklist_id uuid;
begin
  insert into public.booklist (tenant_id, child_id, school_year)
  values (p_tenant_id, p_child_id, p_school_year)
  on conflict (tenant_id, child_id, school_year) do nothing
  returning id into v_booklist_id;

  if v_booklist_id is null then
    select id into v_booklist_id
    from public.booklist
    where tenant_id = p_tenant_id
      and child_id = p_child_id
      and school_year = p_school_year;
  end if;

  insert into public.booklist_item (tenant_id, booklist_id, title, source_type, source_id)
  select p_tenant_id, v_booklist_id, c.title,
         case c.type when 'core' then 'course' when 'enrichment' then 'course' else c.type end,
         c.id
  from public.enrollments e
  join public.courses c on c.id = e.course_id
  where e.student_id = p_child_id
    and c.type in ('core', 'club', 'enrichment')
  on conflict on constraint booklist_item_unique_source do nothing;

  insert into public.booklist_item (tenant_id, booklist_id, title, source_type, source_id)
  select p_tenant_id, v_booklist_id, c.title,
         case c.type when 'core' then 'course' when 'enrichment' then 'course' else c.type end,
         c.id
  from public.student_class sc
  join public.courses c on c.id = sc.class_id
  where sc.student_id = p_child_id
    and c.type in ('club', 'enrichment')
    and not exists (
      select 1 from public.enrollments e
      where e.student_id = sc.student_id and e.course_id = sc.class_id
    )
  on conflict on constraint booklist_item_unique_source do nothing;

  return query
  select bi.*
  from public.booklist_item bi
  where bi.booklist_id = v_booklist_id;
end;
$$;

-- 8. Bookshelf read model (per-child function)
-- Returns non-revoked items from the child's most recent school year
-- UNION all non-revoked permanent items across all years.
-- Joins book catalog for canonical metadata; falls back to denormalized title.
create or replace function public.get_bookshelf(p_child_id uuid)
returns table (
  id uuid, tenant_id uuid, child_id uuid, school_year text,
  title text, cover_image_url text, curriculum_type text,
  isbn_13 text, ebook_available boolean,
  source_type text, source_id uuid, permanent boolean, item_created_at timestamptz
)
  language sql stable
  as $$
  select bi.id, bi.tenant_id, bl.child_id, bl.school_year,
         coalesce(b.title, bi.title) as title,
         b.cover_image_url, b.curriculum_type, b.isbn_13, b.ebook_available,
         bi.source_type, bi.source_id, bi.permanent, bi.created_at as item_created_at
  from public.booklist bl
  join public.booklist_item bi on bi.booklist_id = bl.id
  left join public.book b on b.id = bi.book_id
  where bl.child_id = p_child_id
    and bi.revoked_at is null
    and (
      bl.school_year = (
        select bl2.school_year
        from public.booklist bl2
        where bl2.child_id = p_child_id
        order by bl2.school_year desc
        limit 1
      )
      or bi.permanent = true
    );
$$;

-- 9. Enable row level security
alter table public.booklist enable row level security;
alter table public.booklist_item enable row level security;
alter table public.book enable row level security;
alter table public.family_child enable row level security;

-- 10. RLS policies — booklist

-- Student reads own booklist
create policy bl_self_read on public.booklist
  for select to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and child_id = auth.uid()
  );

-- Family reads children's booklists
create policy bl_family_read on public.booklist
  for select to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.family_child fc
      where fc.guardian_id = auth.uid()
        and fc.child_id = booklist.child_id
    )
  );

-- Teacher reads booklists for children in their courses
create policy bl_teacher_read on public.booklist
  for select to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.student_class sc
      join public.courses c on c.id = sc.class_id
      where sc.student_id = booklist.child_id
        and c.teacher_id = auth.uid()
    )
  );

-- Admin full access within tenant
create policy bl_admin_all on public.booklist
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

-- 11. RLS policies — booklist_item

-- Student reads own items
create policy bi_self_read on public.booklist_item
  for select to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.booklist bl
      where bl.id = booklist_item.booklist_id
        and bl.child_id = auth.uid()
    )
  );

-- Family reads children's items
create policy bi_family_read on public.booklist_item
  for select to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.booklist bl
      join public.family_child fc on fc.child_id = bl.child_id
      where bl.id = booklist_item.booklist_id
        and fc.guardian_id = auth.uid()
    )
  );

-- Teacher reads items for children in their courses
create policy bi_teacher_read on public.booklist_item
  for select to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.booklist bl
      join public.student_class sc on sc.student_id = bl.child_id
      join public.courses c on c.id = sc.class_id
      where bl.id = booklist_item.booklist_id
        and c.teacher_id = auth.uid()
    )
  );

-- Admin full access within tenant
create policy bi_admin_all on public.booklist_item
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

-- 12. RLS policies — book

-- Tenant-wide read for all authenticated users
create policy book_read on public.book
  for select to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Admin full access (write) within tenant
create policy book_admin_all on public.book
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

-- 13. RLS policies — family_child

-- Guardian reads own links only
create policy fc_self_read on public.family_child
  for select to authenticated
  using (
    guardian_id = auth.uid()
  );

-- Admin full access (tenant-scoped via profiles)
create policy fc_admin_all on public.family_child
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- 14. Grants (RLS policies gate actual access; grants enable the delivery path)
grant select on public.enrollments to authenticated;
grant select on public.courses to authenticated;
grant select on public.student_class to authenticated;
grant select, insert, update, delete on public.booklist to authenticated;
grant select, insert, update, delete on public.booklist_item to authenticated;
grant select, insert, update, delete on public.book to authenticated;
grant select on public.family_child to authenticated;
grant execute on function public.materialize_booklist(uuid, text, uuid) to authenticated;
grant execute on function public.get_bookshelf(uuid) to authenticated;

-- 15. updated_at triggers (reuse set_updated_at from 019)
create trigger trg_booklist_item_updated_at
    before update on public.booklist_item
    for each row execute function public.set_updated_at();

create trigger trg_book_updated_at
    before update on public.book
    for each row execute function public.set_updated_at();

commit;
