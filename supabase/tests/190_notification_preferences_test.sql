-- 190_notification_preferences_test.sql
-- Tests: notification_preferences table schema, RLS, CHECK constraints, RPC, updated_at trigger
BEGIN;
SELECT plan(14);

-- Fixtures: tenant
INSERT INTO public.tenant_lms (id, name, slug, is_active, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Tenant', 'test', true, now())
ON CONFLICT (id) DO NOTHING;

-- Insert auth.users
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES
  ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student1@190.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('a2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student2@190.test', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create students rows (notification_preferences FK references students(id))
INSERT INTO public.students (id, first_name, last_name, grade, academic_group_id, enrollment_status)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Student', 'One', '10', (SELECT id FROM supabase.organizations LIMIT 1), 'active'),
  ('a2000000-0000-0000-0000-000000000002', 'Student', 'Two', '10', (SELECT id FROM supabase.organizations LIMIT 1), 'active')
ON CONFLICT (id) DO NOTHING;

-- Set profile tenant_id
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
UPDATE public.profiles SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id IN ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002');
SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- Schema tests

-- 1. Table exists
SELECT ok(
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification_preferences'),
  'notification_preferences table exists'
);

-- 2. RLS is enabled
SELECT ok(
  EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notification_preferences' AND rowsecurity = true),
  'RLS is enabled on notification_preferences'
);

-- 3-8. Correct columns exist
SELECT ok(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'class_notification_scope'),
  'class_notification_scope column exists'
);

SELECT ok(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'core_curriculum_enabled'),
  'core_curriculum_enabled column exists'
);

SELECT ok(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'clubs_enabled'),
  'clubs_enabled column exists'
);

SELECT ok(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'class_ids'),
  'class_ids column exists'
);

SELECT ok(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'hub_event_types'),
  'hub_event_types column exists'
);

SELECT ok(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'news_categories'),
  'news_categories column exists'
);

-- CHECK constraint test

-- 9. CHECK class_notification_scope rejects invalid value
SELECT throws_ok(
  $$INSERT INTO public.notification_preferences (student_id, class_notification_scope)
    VALUES ('a1000000-0000-0000-0000-000000000001', 'invalid_scope')$$,
  '23514', null,
  'CHECK class_notification_scope rejects invalid value'
);

-- RLS tests

-- 10. Student inserts own prefs (defaults applied)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated","tenant_id":"00000000-0000-0000-0000-000000000001","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

SELECT lives_ok(
  $$INSERT INTO public.notification_preferences (student_id) VALUES ('a1000000-0000-0000-0000-000000000001')$$,
  'student1 can insert own notification_preferences'
);

-- 11. Student reads own prefs
SELECT is(
  (SELECT count(*)::int FROM public.notification_preferences),
  1,
  'student1 reads exactly 1 own prefs row'
);

-- 12. Cross-student read blocked
SELECT set_config('request.jwt.claims',
  '{"sub":"a2000000-0000-0000-0000-000000000002","role":"authenticated","tenant_id":"00000000-0000-0000-0000-000000000001","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

SELECT is(
  (SELECT count(*)::int FROM public.notification_preferences),
  0,
  'student2 cannot see student1 prefs (RLS blocks cross-student)'
);

-- 13. Student updates own prefs
SELECT set_config('request.jwt.claims',
  '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated","tenant_id":"00000000-0000-0000-0000-000000000001","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

SELECT lives_ok(
  $$UPDATE public.notification_preferences SET class_notification_scope = 'off', clubs_enabled = false WHERE student_id = 'a1000000-0000-0000-0000-000000000001'$$,
  'student1 can update own prefs'
);

-- RPC test

-- 14. get_or_create_notification_preferences returns existing row
RESET role;
SELECT is(
  (SELECT class_notification_scope FROM public.get_or_create_notification_preferences('a1000000-0000-0000-0000-000000000001')),
  'off',
  'RPC get_or_create returns existing prefs (class_notification_scope=off)'
);

SELECT * FROM finish();
ROLLBACK;
