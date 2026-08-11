-- Migration 104: Fix remaining function bodies + schema grants (Row 55 continuation)
-- has_item_access(): public.enrollments → school_desk.enrollments
-- materialize_booklist(): public.enrollments → school_desk.enrollments, public.courses → school_desk.courses
-- Schema grants: service_role USAGE on all 3 desk schemas

BEGIN;

-- 1. has_item_access() — fix enrollments reference
CREATE OR REPLACE FUNCTION public.has_item_access(p_course_id uuid)
RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from school_desk.enrollments e
    join public.profiles p on p.id = e.student_id
    where e.student_id = auth.uid()
      and e.course_id  = p_course_id
      and now() between coalesce(p.access_starts_at, now())
                    and coalesce(p.access_ends_at,   now())
  );
$function$;

-- 2. materialize_booklist() — fix enrollments + courses references
CREATE OR REPLACE FUNCTION public.materialize_booklist(p_child_id uuid, p_school_year text, p_tenant_id uuid)
RETURNS SETOF booklist_item
  LANGUAGE plpgsql
AS $function$
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
  from school_desk.enrollments e
  join school_desk.courses c on c.id = e.course_id
  where e.student_id = p_child_id
    and c.type in ('core', 'club', 'enrichment')
  on conflict on constraint booklist_item_unique_source do nothing;

  insert into public.booklist_item (tenant_id, booklist_id, title, source_type, source_id)
  select p_tenant_id, v_booklist_id, c.title,
         case c.type when 'core' then 'course' when 'enrichment' then 'course' else c.type end,
         c.id
  from public.student_class sc
  join school_desk.courses c on c.id = sc.class_id
  where sc.student_id = p_child_id
    and c.type in ('club', 'enrichment')
    and not exists (
      select 1 from school_desk.enrollments e
      where e.student_id = sc.student_id and e.course_id = sc.class_id
    )
  on conflict on constraint booklist_item_unique_source do nothing;

  return query
  select bi.*
  from public.booklist_item bi
  where bi.booklist_id = v_booklist_id;
end;
$function$;

-- 3. Schema grants — service_role USAGE on all 3 desk schemas
GRANT USAGE ON SCHEMA front_desk TO service_role;
GRANT USAGE ON SCHEMA school_desk TO service_role;
GRANT USAGE ON SCHEMA office_desk TO service_role;

COMMIT;
