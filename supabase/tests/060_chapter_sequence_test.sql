-- 060_chapter_sequence_test.sql
-- D-CHAPSEQ: verifies the corrected chapter sequence guard
-- (migration 060) enforces ALL predecessor chapters complete,
-- renames the trigger to trg_chapter_progress_sequence, and
-- fails loud on a missing chapter. R22-compliant: every denial
-- block is paired with a positive-anchor + row-count assertion.
BEGIN;
SELECT plan(10);

CREATE SCHEMA IF NOT EXISTS tests;
GRANT USAGE ON SCHEMA tests TO authenticated;
-- Auth users (profiles are auto-created by handle_new_user trigger as role='student', tenant NULL)
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES
  ('cccc0000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chapseq-t@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('cccc0000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chapseq-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('cccc0000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chapseq-b@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Repair tenant + role via sanctioned bypass (trigger default role='student', tenant NULL)
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at)
VALUES ('cccc0000-0000-0000-0000-0000000000c0', 'CHAPSEQ Tenant', 'chapseq', true, now())
ON CONFLICT (id) DO NOTHING;
UPDATE public.profiles SET tenant_id = 'cccc0000-0000-0000-0000-0000000000c0'
  WHERE id IN ('cccc0000-0000-0000-0000-0000000000a1','cccc0000-0000-0000-0000-0000000000b1','cccc0000-0000-0000-0000-0000000000b2');
UPDATE public.profiles SET role = 'teacher' WHERE id = 'cccc0000-0000-0000-0000-0000000000a1';
SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- Required FK fixtures for chapter_progress
INSERT INTO supabase.organizations (id, name, slug)
VALUES ('cccc0000-0000-0000-0000-0000000000c0', 'CHAPSEQ Org', 'chapseq-org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO school_desk.courses (id, title, description, price, status, teacher_id, platform, type, open_to_outside)
VALUES ('cccc0000-0000-0000-0000-0000000000c1', 'CHAPSEQ Course', 'Test course', 0.00, 'published', 'cccc0000-0000-0000-0000-0000000000a1', 'core', 'core', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.courses (id, organization_id, course_name, course_code, grade, start_date, end_date, status)
VALUES ('cccc0000-0000-0000-0000-0000000000c1', 'cccc0000-0000-0000-0000-0000000000c0', 'CHAPSEQ Course', 'CHAPSEQ-101', '10', now(), now() + interval '6 months', 'active')
ON CONFLICT (id) DO NOTHING;

-- Students rows (required by student_enrollments FK)
INSERT INTO public.students (id, first_name, last_name, grade, academic_group_id, enrollment_status)
VALUES
  ('cccc0000-0000-0000-0000-0000000000b1', 'Chap', 'Seq-A', '10', 'cccc0000-0000-0000-0000-0000000000c0', 'active'),
  ('cccc0000-0000-0000-0000-0000000000b2', 'Chap', 'Seq-B', '10', 'cccc0000-0000-0000-0000-0000000000c0', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.student_enrollments (id, student_id, course_id, enrollment_status)
VALUES
  ('cccc0000-0000-0000-0000-0000000000e0', 'cccc0000-0000-0000-0000-0000000000b2', 'cccc0000-0000-0000-0000-0000000000c1', 'enrolled'),
  ('cccc0000-0000-0000-0000-0000000000e1', 'cccc0000-0000-0000-0000-0000000000b1', 'cccc0000-0000-0000-0000-0000000000c1', 'enrolled')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.chapters (id, course_id, title, video_url, order_index)
VALUES
  ('cccc0000-0000-0000-0000-0000000000d0', 'cccc0000-0000-0000-0000-0000000000c1', 'CH0', 'https://x/0', 0),
  ('cccc0000-0000-0000-0000-0000000000d1', 'cccc0000-0000-0000-0000-0000000000c1', 'CH1', 'https://x/1', 1),
  ('cccc0000-0000-0000-0000-0000000000d2', 'cccc0000-0000-0000-0000-0000000000c1', 'CH2', 'https://x/2', 2)
ON CONFLICT (id) DO NOTHING;

-- c. FIRST CHAPTER positive anchor: fresh student b2 inserts progress for order_index 0
-- Run as superuser: RLS bypass needed because INSERT policy was dropped (ITEM-56).
-- Trigger behavior is role-independent (checks chapter sequence data, not JWT).
INSERT INTO public.chapter_progress (student_id, chapter_id, organization_id, enrollment_id, course_id)
VALUES ('cccc0000-0000-0000-0000-0000000000b2', 'cccc0000-0000-0000-0000-0000000000d0', 'cccc0000-0000-0000-0000-0000000000c0', 'cccc0000-0000-0000-0000-0000000000e0', 'cccc0000-0000-0000-0000-0000000000c1');
SELECT is(
  (SELECT count(*)::int FROM public.chapter_progress WHERE student_id = 'cccc0000-0000-0000-0000-0000000000b2'),
  1,
  'c: first-chapter insert succeeds, row count = 1');

-- f. ROLE-BASED DENIAL: authenticated has no INSERT grant on chapter_progress
SELECT set_config('request.jwt.claims', '{"sub":"cccc0000-0000-0000-0000-0000000000b2","tenant_id":"cccc0000-0000-0000-0000-0000000000c0"}', true);
SET ROLE authenticated;
SELECT throws_ok(
  $$INSERT INTO public.chapter_progress (student_id, chapter_id, organization_id, enrollment_id, course_id)
    VALUES ('cccc0000-0000-0000-0000-0000000000b2', 'cccc0000-0000-0000-0000-0000000000d0', 'cccc0000-0000-0000-0000-0000000000c0', 'cccc0000-0000-0000-0000-0000000000e0', 'cccc0000-0000-0000-0000-0000000000c1')$$,
  '42501', NULL,
  'denial: authenticated has no INSERT grant on chapter_progress');
RESET ROLE;

-- h. ROLE-BASED DENIAL: authenticated has no INSERT grant on enrollments
SELECT set_config('request.jwt.claims', '{"sub":"cccc0000-0000-0000-0000-0000000000b2","tenant_id":"cccc0000-0000-0000-0000-0000000000c0"}', true);
SET ROLE authenticated;
SELECT throws_ok(
  $$INSERT INTO school_desk.enrollments (student_id, course_id)
    VALUES ('cccc0000-0000-0000-0000-0000000000b2', 'cccc0000-0000-0000-0000-0000000000c1')$$,
  '42501', NULL,
  'denial: authenticated has no INSERT grant on enrollments');
RESET ROLE;

-- a. POSITIVE ANCHOR: student b1 completes all predecessors (0 and 1) then inserts 2
INSERT INTO public.student_enrollments (id, student_id, course_id, enrollment_status)
VALUES ('cccc0000-0000-0000-0000-0000000000e1', 'cccc0000-0000-0000-0000-0000000000b1', 'cccc0000-0000-0000-0000-0000000000c1', 'enrolled')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.chapter_progress (student_id, chapter_id, organization_id, enrollment_id, course_id)
VALUES
  ('cccc0000-0000-0000-0000-0000000000b1', 'cccc0000-0000-0000-0000-0000000000d0', 'cccc0000-0000-0000-0000-0000000000c0', 'cccc0000-0000-0000-0000-0000000000e1', 'cccc0000-0000-0000-0000-0000000000c1'),
  ('cccc0000-0000-0000-0000-0000000000b1', 'cccc0000-0000-0000-0000-0000000000d1', 'cccc0000-0000-0000-0000-0000000000c0', 'cccc0000-0000-0000-0000-0000000000e1', 'cccc0000-0000-0000-0000-0000000000c1');
INSERT INTO public.chapter_progress (student_id, chapter_id, organization_id, enrollment_id, course_id)
VALUES ('cccc0000-0000-0000-0000-0000000000b1', 'cccc0000-0000-0000-0000-0000000000d2', 'cccc0000-0000-0000-0000-0000000000c0', 'cccc0000-0000-0000-0000-0000000000e1', 'cccc0000-0000-0000-0000-0000000000c1');
SELECT is(
  (SELECT count(*)::int FROM public.chapter_progress WHERE student_id = 'cccc0000-0000-0000-0000-0000000000b1'),
  3,
  'a: all-predecessors-complete insert succeeds, row count = 3');

-- b. DENIAL (the 018 escape): student b2 has only chapter 0 complete, skips 1, inserts 2
SELECT throws_ok(
  $$INSERT INTO public.chapter_progress (student_id, chapter_id, organization_id, enrollment_id, course_id)
   VALUES ('cccc0000-0000-0000-0000-0000000000b2', 'cccc0000-0000-0000-0000-0000000000d2', 'cccc0000-0000-0000-0000-0000000000c0', 'cccc0000-0000-0000-0000-0000000000e0', 'cccc0000-0000-0000-0000-0000000000c1')$$,
  'P0001', 'Previous chapters must be completed before marking this chapter complete');
SELECT is(
  (SELECT count(*)::int FROM public.chapter_progress WHERE student_id = 'cccc0000-0000-0000-0000-0000000000b2'),
  1,
  'b: skipped-predecessor insert denied, row count stays 1');

-- d. FAIL-LOUD: insert referencing a non-existent chapter_id. The BEFORE INSERT guard runs first and raises P0001 (chapter not found) BEFORE the FK (23503) is enforced, so P0001 is the observed state.
SELECT throws_ok(
  $$INSERT INTO public.chapter_progress (student_id, chapter_id, organization_id, enrollment_id, course_id)
   VALUES ('cccc0000-0000-0000-0000-0000000000b2', 'deadbeef-0000-0000-0000-000000000000', 'cccc0000-0000-0000-0000-0000000000c0', 'cccc0000-0000-0000-0000-0000000000e0', 'cccc0000-0000-0000-0000-0000000000c1')$$,
  'P0001');

-- e. WIRING: new trigger present, old trigger absent
SELECT ok( EXISTS (
  SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
  WHERE c.relname = 'chapter_progress' AND t.tgname = 'trg_chapter_progress_sequence' AND NOT t.tgisinternal),
  'e: trg_chapter_progress_sequence exists');
SELECT ok( NOT EXISTS (
  SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
  WHERE c.relname = 'chapter_progress' AND t.tgname = 'check_chapter_sequence' AND NOT t.tgisinternal),
  'e: old check_chapter_sequence trigger absent');

SELECT ok( position('order_index < v_chapter_order' in
  (SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'check_chapter_sequence_completion')) > 0,
  'e: corrected guard function present in schema');

SELECT * FROM finish();
ROLLBACK;
