-- 038_realtime_trim.sql (P2-029-trim)
-- Realtime publication pass: remove chapter_progress, add schedule_slot.
-- 029 is committed history — not edited. This migration adjusts membership only.
-- No RLS policy changes. No new grants (033 + 036 + 037 already cover all tables).

begin;

-- 1. Remove chapter_progress from publication
--    Reason: no live UX subscribes to chapter completion events;
--    student progress is polled on demand. Removes WAL overhead.
alter publication supabase_realtime drop table public.chapter_progress;

-- 2. Add schedule_slot to publication
--    Reason: admin edits timetable → enrolled students/teachers
--    see changes without page refresh (primary live-schedule UX).
alter table public.schedule_slot replica identity full;
alter publication supabase_realtime add table public.schedule_slot;

commit;
