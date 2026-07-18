-- 061_chapter_progress_delete_test.sql
-- D-060-DEL: verifies the BEFORE DELETE LIFO guard (migration 061) blocks
-- deleting an earlier chapter while a later chapter in the SAME course still has
-- a progress row for the student, and permits legitimate reverse-order deletion.
-- R22-compliant: every denial block is paired with a positive-anchor + row-count
-- assertion; the wiring block confirms the trigger exists.
BEGIN;
SELECT plan(9);

CREATE SCHEMA IF NOT EXISTS tests;
GRANT USAGE ON SCHEMA tests TO authenticated;

GRANT SELECT, INSERT, DELETE ON public.chapter_progress TO authenticated;
GRANT SELECT ON public.chapters TO authenticated;
GRANT SELECT ON public.courses TO authenticated;
-- Auth user (profiles auto-created by handle_new_user trigger as role=student, tenant NULL)
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES
  ('dddd0000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'del-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Repair tenant + role via sanctioned bypass (trigger default role=student, tenant NULL)
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at)
VALUES ('dddd0000-0000-0000-0000-0000000000c0', 'DEL Tenant', 'del', true, now())
ON CONFLICT (id) DO NOTHING;
UPDATE public.profiles SET tenant_id = 'dddd0000-0000-0000-0000-0000000000c0'
  WHERE id = 'dddd0000-0000-0000-0000-0000000000a1';
SELECT set_config('app.tenant_assignment_bypass', 'false', true);

INSERT INTO public.courses (id, title, price, status, teacher_id)
VALUES ('dddd0000-0000-0000-0000-0000000000c1', 'DEL Course', 0, 'published', 'dddd0000-0000-0000-0000-0000000000a1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.chapters (id, course_id, title, video_url, order_index)
VALUES
  ('dddd0000-0000-0000-0000-0000000000d0', 'dddd0000-0000-0000-0000-0000000000c1', 'DEL0', 'https://x/0', 0),
  ('dddd0000-0000-0000-0000-0000000000d1', 'dddd0000-0000-0000-0000-0000000000c1', 'DEL1', 'https://x/1', 1),
  ('dddd0000-0000-0000-0000-0000000000d2', 'dddd0000-0000-0000-0000-0000000000c1', 'DEL2', 'https://x/2', 2)
ON CONFLICT (id) DO NOTHING;

-- Student fixture: complete all three chapters (order 0,1,2).
SELECT set_config('request.jwt.claims', '{"sub":"dddd0000-0000-0000-0000-0000000000a1","tenant_id":"dddd0000-0000-0000-0000-0000000000c0"}', true);
SELECT set_config('request.jwt.claim.sub', 'dddd0000-0000-0000-0000-0000000000a1', true);
SET ROLE authenticated;
INSERT INTO public.chapter_progress (student_id, chapter_id)
VALUES
  ('dddd0000-0000-0000-0000-0000000000a1', 'dddd0000-0000-0000-0000-0000000000d0'),
  ('dddd0000-0000-0000-0000-0000000000a1', 'dddd0000-0000-0000-0000-0000000000d1'),
  ('dddd0000-0000-0000-0000-0000000000a1', 'dddd0000-0000-0000-0000-0000000000d2');
SELECT is(
  (SELECT count(*)::int FROM public.chapter_progress WHERE student_id = 'dddd0000-0000-0000-0000-0000000000a1'),
  3,
  'setup: student completed chapters 0,1,2 (row count = 3)');

-- c. POSITIVE ANCHOR: delete the LAST chapter (order 2) succeeds, count drops to 2.
DELETE FROM public.chapter_progress WHERE student_id = 'dddd0000-0000-0000-0000-0000000000a1' AND chapter_id = 'dddd0000-0000-0000-0000-0000000000d2';
SELECT is(
  (SELECT count(*)::int FROM public.chapter_progress WHERE student_id = 'dddd0000-0000-0000-0000-0000000000a1'),
  2,
  'c: delete last chapter (order 2) succeeds, row count = 2');

-- b. DENIAL: now student has 0 and 1 complete; re-insert 2, then attempt DELETE of 0 (order 0)
--     while later chapters 1 and 2 still exist -> guard must reject.
INSERT INTO public.chapter_progress (student_id, chapter_id)
VALUES ('dddd0000-0000-0000-0000-0000000000a1', 'dddd0000-0000-0000-0000-0000000000d2');
SELECT throws_ok(
   $$DELETE FROM public.chapter_progress WHERE student_id = 'dddd0000-0000-0000-0000-0000000000a1' AND chapter_id = 'dddd0000-0000-0000-0000-0000000000d0'$$,
  'P0001', 'Later chapter progress must be deleted first');
SELECT is(
  (SELECT count(*)::int FROM public.chapter_progress WHERE student_id = 'dddd0000-0000-0000-0000-0000000000a1'),
  3,
  'b: delete of earlier chapter denied, row count stays 3');

-- d. LIFO DRAIN: delete 2, then 1, then 0 in reverse order; all succeed, final count 0.
DELETE FROM public.chapter_progress WHERE student_id = 'dddd0000-0000-0000-0000-0000000000a1' AND chapter_id = 'dddd0000-0000-0000-0000-0000000000d2';
SELECT is(
  (SELECT count(*)::int FROM public.chapter_progress WHERE student_id = 'dddd0000-0000-0000-0000-0000000000a1'),
  2,
  'd: after deleting order 2, row count = 2');
DELETE FROM public.chapter_progress WHERE student_id = 'dddd0000-0000-0000-0000-0000000000a1' AND chapter_id = 'dddd0000-0000-0000-0000-0000000000d1';
SELECT is(
  (SELECT count(*)::int FROM public.chapter_progress WHERE student_id = 'dddd0000-0000-0000-0000-0000000000a1'),
  1,
  'd: after deleting order 1, row count = 1');
DELETE FROM public.chapter_progress WHERE student_id = 'dddd0000-0000-0000-0000-0000000000a1' AND chapter_id = 'dddd0000-0000-0000-0000-0000000000d0';
SELECT is(
  (SELECT count(*)::int FROM public.chapter_progress WHERE student_id = 'dddd0000-0000-0000-0000-0000000000a1'),
  0,
  'd: after deleting order 0, row count = 0 (guard never over-blocks reverse deletion)');

-- e. WIRING: new BEFORE DELETE trigger present.
SELECT ok( EXISTS (
  SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
  WHERE c.relname = 'chapter_progress' AND t.tgname = 'trg_chapter_progress_delete_guard' AND (t.tgtype::int & 2) = 2 -- BEFORE
   AND (t.tgtype::int & 8) = 8 -- DELETE
   AND NOT t.tgisinternal),
  'e: trg_chapter_progress_delete_guard exists (BEFORE + DELETE)');

-- e2. WIRING: guard function contains the LIFO rejection text.
SELECT ok( position('Later chapter progress must be deleted first' in
  (SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'check_chapter_progress_delete_allowed')) > 0,
  'e2: delete guard function present with LIFO rejection');

SELECT * FROM finish();
ROLLBACK;
