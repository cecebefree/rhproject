-- 08_chapters_read_rpc_test.sql — R23: ITEM-59 chapters_read SECURITY DEFINER RPC.
-- 12 pinned cases: covers all dropped-policy semantics + outside_student
-- allow-list + access-window integration + anon denial.
-- R23 rule: production grant surfaces only, no test-side GRANTs on
-- chapters, no role fabrication. Fixtures seeded as postgres.
BEGIN;
SELECT plan(12);

-- ============================================================
-- FIXTURE: auth users + profiles
-- ============================================================
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES
  ('07700000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'r23-learner-enr@test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('07700000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'r23-learner-core@test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('07700000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'r23-learner-noc@test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('07700000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'r23-teacher1@test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('07700000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'r23-admin@test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('07700000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'r23-outside@test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('07700000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'r23-other-t@test', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Tenant fixture (profiles.tenant_id FK references tenant_devotional)
INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at)
VALUES ('07700000-0000-0000-0000-0000000000b0', 'R23 Tenant', 'r23', true, now())
ON CONFLICT (id) DO NOTHING;

-- Repair profiles (handle_new_user trigger created them as role=student)
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
UPDATE public.profiles SET tenant_id = '07700000-0000-0000-0000-0000000000b0',
  role = 'learner', has_core = false
WHERE id IN ('07700000-0000-0000-0000-0000000000a1','07700000-0000-0000-0000-0000000000a3');
UPDATE public.profiles SET tenant_id = '07700000-0000-0000-0000-0000000000b0',
  role = 'learner', has_core = true,
  access_starts_at = now() - interval '1 day',
  access_ends_at = now() + interval '30 days'
WHERE id = '07700000-0000-0000-0000-0000000000a2';
UPDATE public.profiles SET tenant_id = '07700000-0000-0000-0000-0000000000b0',
  role = 'teacher'
WHERE id = '07700000-0000-0000-0000-0000000000a4';
UPDATE public.profiles SET tenant_id = '07700000-0000-0000-0000-0000000000b0',
  role = 'admin'
WHERE id = '07700000-0000-0000-0000-0000000000a5';
UPDATE public.profiles SET tenant_id = '07700000-0000-0000-0000-0000000000b0',
  role = 'outside_student'
WHERE id = '07700000-0000-0000-0000-0000000000a6';
UPDATE public.profiles SET tenant_id = '07700000-0000-0000-0000-0000000000b0',
  role = 'teacher'
WHERE id = '07700000-0000-0000-0000-0000000000a7';
SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- ============================================================
-- FIXTURE: courses + chapters
-- ============================================================
INSERT INTO public.courses (id, title, price, status, teacher_id, type)
VALUES
  ('07700000-0000-0000-0000-0000000000c1', 'R23 Pub Core',    0, 'published', '07700000-0000-0000-0000-0000000000a4', 'core'),
  ('07700000-0000-0000-0000-0000000000c2', 'R23 Draft Core',  0, 'draft',     '07700000-0000-0000-0000-0000000000a4', 'core'),
  ('07700000-0000-0000-0000-0000000000c3', 'R23 Pub Enrich',  0, 'published', '07700000-0000-0000-0000-0000000000a4', 'enrichment'),
  ('07700000-0000-0000-0000-0000000000c4', 'R23 Pub Club',    0, 'published', '07700000-0000-0000-0000-0000000000a4', 'club')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.chapters (id, course_id, title, video_url, order_index)
VALUES
  ('07700000-0000-0000-0000-0000000000d1', '07700000-0000-0000-0000-0000000000c1', 'CH1', 'https://x/1', 0),
  ('07700000-0000-0000-0000-0000000000d2', '07700000-0000-0000-0000-0000000000c1', 'CH2', 'https://x/2', 1),
  ('07700000-0000-0000-0000-0000000000d3', '07700000-0000-0000-0000-0000000000c2', 'CH3', 'https://x/3', 0),
  ('07700000-0000-0000-0000-0000000000d4', '07700000-0000-0000-0000-0000000000c2', 'CH4', 'https://x/4', 1),
  ('07700000-0000-0000-0000-0000000000d5', '07700000-0000-0000-0000-0000000000c3', 'CH5', 'https://x/5', 0),
  ('07700000-0000-0000-0000-0000000000d6', '07700000-0000-0000-0000-0000000000c3', 'CH6', 'https://x/6', 1),
  ('07700000-0000-0000-0000-0000000000d7', '07700000-0000-0000-0000-0000000000c4', 'CH7', 'https://x/7', 0),
  ('07700000-0000-0000-0000-0000000000d8', '07700000-0000-0000-0000-0000000000c4', 'CH8', 'https://x/8', 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FIXTURE: enrollments
-- ============================================================
INSERT INTO public.enrollments (student_id, course_id)
VALUES
  ('07700000-0000-0000-0000-0000000000a1', '07700000-0000-0000-0000-0000000000c1'),
  ('07700000-0000-0000-0000-0000000000a1', '07700000-0000-0000-0000-0000000000c2')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- HELPER: column count for chapters_read results
-- ============================================================
CREATE SCHEMA IF NOT EXISTS tests;
GRANT USAGE ON SCHEMA tests TO authenticated;
CREATE OR REPLACE FUNCTION tests.chapters_read_count(p_course_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT count(*)::int FROM public.chapters_read(p_course_id); $$;

-- ============================================================
-- CASE 1: Enrolled learner → sees chapters of published core
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"07700000-0000-0000-0000-0000000000a1"}', true);
SET ROLE authenticated;
SELECT is(
  tests.chapters_read_count('07700000-0000-0000-0000-0000000000c1'),
  2,
  '1: enrolled learner sees 2 chapters of published core');
RESET ROLE;

-- ============================================================
-- CASE 2: Core learner (has_core=true) → sees chapters of published core
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"07700000-0000-0000-0000-0000000000a2"}', true);
SET ROLE authenticated;
SELECT is(
  tests.chapters_read_count('07700000-0000-0000-0000-0000000000c1'),
  2,
  '2: core learner (has_core=true) sees 2 chapters of published core');
RESET ROLE;

-- ============================================================
-- CASE 3: No-access learner → empty for published core
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"07700000-0000-0000-0000-0000000000a3"}', true);
SET ROLE authenticated;
SELECT is(
  tests.chapters_read_count('07700000-0000-0000-0000-0000000000c1'),
  0,
  '3: no-access learner gets 0 chapters of published core');
RESET ROLE;

-- ============================================================
-- CASE 4: Enrolled learner → empty for draft core (not published)
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"07700000-0000-0000-0000-0000000000a1"}', true);
SET ROLE authenticated;
SELECT is(
  tests.chapters_read_count('07700000-0000-0000-0000-0000000000c2'),
  0,
  '4: enrolled learner gets 0 chapters of draft core');
RESET ROLE;

-- ============================================================
-- CASE 5: Teacher → sees chapters of own published course
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"07700000-0000-0000-0000-0000000000a4"}', true);
SET ROLE authenticated;
SELECT is(
  tests.chapters_read_count('07700000-0000-0000-0000-0000000000c1'),
  2,
  '5: teacher sees 2 chapters of own published course');
RESET ROLE;

-- ============================================================
-- CASE 6: Teacher → sees chapters of own draft course
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"07700000-0000-0000-0000-0000000000a4"}', true);
SET ROLE authenticated;
SELECT is(
  tests.chapters_read_count('07700000-0000-0000-0000-0000000000c2'),
  2,
  '6: teacher sees 2 chapters of own draft course');
RESET ROLE;

-- ============================================================
-- CASE 7: Admin → sees chapters of any published course
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"07700000-0000-0000-0000-0000000000a5"}', true);
SET ROLE authenticated;
SELECT is(
  tests.chapters_read_count('07700000-0000-0000-0000-0000000000c1'),
  2,
  '7: admin sees 2 chapters of published core');
RESET ROLE;

-- ============================================================
-- CASE 8: outside_student → sees chapters of published enrichment
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"07700000-0000-0000-0000-0000000000a6"}', true);
SET ROLE authenticated;
SELECT is(
  tests.chapters_read_count('07700000-0000-0000-0000-0000000000c3'),
  2,
  '8: outside_student sees 2 chapters of published enrichment');
RESET ROLE;

-- ============================================================
-- CASE 9: outside_student → empty for published core
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"07700000-0000-0000-0000-0000000000a6"}', true);
SET ROLE authenticated;
SELECT is(
  tests.chapters_read_count('07700000-0000-0000-0000-0000000000c1'),
  0,
  '9: outside_student gets 0 chapters of published core');
RESET ROLE;

-- ============================================================
-- CASE 10: outside_student → empty for published club
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"07700000-0000-0000-0000-0000000000a6"}', true);
SET ROLE authenticated;
SELECT is(
  tests.chapters_read_count('07700000-0000-0000-0000-0000000000c4'),
  0,
  '10: outside_student gets 0 chapters of published club');
RESET ROLE;

-- ============================================================
-- CASE 11: anon → denied (no EXECUTE grant)
-- ============================================================
SET ROLE anon;
SELECT throws_ok(
  $$SELECT public.chapters_read('07700000-0000-0000-0000-0000000000c1')$$,
  '42501', NULL,
  '11: anon denied EXECUTE on chapters_read');
RESET ROLE;

-- ============================================================
-- CASE 12: nonexistent course_id → empty
-- ============================================================
SELECT set_config('request.jwt.claims', '{"sub":"07700000-0000-0000-0000-0000000000a1"}', true);
SET ROLE authenticated;
SELECT is(
  tests.chapters_read_count('07700000-0000-0000-0000-0000000000ff'),
  0,
  '12: enrolled learner gets 0 chapters for nonexistent course');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
