-- 032_access_window.sql
-- Paid-access gating. Gates off enrollments (016). student_class (027) is timetable, untouched.

alter table public.profiles
  add column if not exists has_core         boolean     not null default false,
  add column if not exists access_starts_at timestamptz,
  add column if not exists access_ends_at   timestamptz;

create or replace function public.has_core_access()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.has_core = true
      and now() between coalesce(p.access_starts_at, now())
                    and coalesce(p.access_ends_at,   now())
  );
$$;

create or replace function public.has_item_access(p_course_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1
    from public.enrollments e
    join public.profiles p on p.id = e.student_id
    where e.student_id = auth.uid()
      and e.course_id  = p_course_id
      and now() between coalesce(p.access_starts_at, now())
                    and coalesce(p.access_ends_at,   now())
  );
$$;

grant execute on function public.has_core_access()     to authenticated;
grant execute on function public.has_item_access(uuid) to authenticated;
