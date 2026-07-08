-- 029_realtime_subscriptions.sql (P2-016)
-- Adds tables to the supabase_realtime publication AND sets
-- REPLICA IDENTITY FULL so UPDATE/DELETE events carry the full
-- old row, allowing Supabase realtime to evaluate RLS filters
-- correctly on every event type.
-- RLS confirmed ON for both tables before enabling broadcast.

alter table public.student_class replica identity full;
alter table public.chapter_progress replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'student_class'
  ) then
    alter publication supabase_realtime add table public.student_class;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chapter_progress'
  ) then
    alter publication supabase_realtime add table public.chapter_progress;
  end if;
end $$;
