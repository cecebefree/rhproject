-- 031: grant SELECT on courses to authenticated
-- Needed so sc_teacher_read policy subquery (from 030) can read courses
grant select on public.courses to authenticated;
