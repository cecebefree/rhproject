-- 038_realtime_test.sql (P2-029-trim)
-- Verifies supabase_realtime publication membership after 038 trim.
-- Checks: schedule_slot present, notifications present, student_class present,
--          chapter_progress absent, terms absent.
begin;
select plan(5);

-- 1. schedule_slot is in the publication
select ok(
  exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'schedule_slot'
  ),
  'schedule_slot is in supabase_realtime publication'
);

-- 2. notifications is in the publication
select ok(
  exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ),
  'notifications is in supabase_realtime publication'
);

-- 3. student_class is in the publication
select ok(
  exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'student_class'
  ),
  'student_class is in supabase_realtime publication'
);

-- 4. chapter_progress is NOT in the publication (removed by 038)
select ok(
  not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chapter_progress'
  ),
  'chapter_progress is NOT in supabase_realtime publication (removed)'
);

-- 5. terms is NOT in the publication (never added — no live UX)
select ok(
  not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'terms'
  ),
  'terms is NOT in supabase_realtime publication (not needed)'
);

select * from finish();
rollback;
