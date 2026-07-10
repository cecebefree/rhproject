-- 034_courses_platform.sql — add platform key to courses
begin;
create type platform_key as enum ('core', 'enrichment', 'club', 'music', 'art');
alter table public.courses
  add column platform platform_key not null default 'core';
comment on column public.courses.platform is
  'Which platform: core | enrichment | club | music | art';
commit;
