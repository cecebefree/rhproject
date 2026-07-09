-- 031_realtime_select_grants.sql
-- P2-016: Grant SELECT to authenticated on realtime-published tables.
-- Realtime enforces RLS on the stream, but the authenticated role still
-- needs a table-level SELECT grant for WebSocket subscriptions to deliver
-- rows. Publication membership (migration 029) is not sufficient alone.
-- Published tables (per 029): public.student_class, public.chapter_progress.

grant select on public.student_class    to authenticated;
grant select on public.chapter_progress to authenticated;

-- RLS remains the security boundary; these grants only enable the
-- realtime delivery path. Row visibility is still gated by existing
-- policies (sc_student_read, sc_teacher_read, chapter_progress policies).
