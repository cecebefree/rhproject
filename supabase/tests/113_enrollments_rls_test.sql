-- 113_enrollments_rls_test.sql
-- pgTAP tests for school_desk.enrollments RLS policies
-- Tests: positive (allowed) + negative (denied) polarity
-- Migration: 016_lms_enrollments.sql

BEGIN;
SELECT plan(10);

-- ============================================================
-- Schema + helper
-- ============================================================
CREATE SCHEMA IF NOT EXISTS tests;
GRANT USAGE ON SCHEMA tests TO authenticated;

CREATE OR REPLACE FUNCTION tests.set_jwt(p_sub uuid, p_role text, p_tenant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $func$
BEGIN
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object(
      'sub', p_sub::text,
      'role', 'authenticated',
      'tenant_id', p_tenant_id::text,
      'app_metadata', jsonb_build_object(
        'role', p_role,
        'tenant_id', p_tenant_id::text
      )
    )::text,
    true
  );
END;
$func$;
GRANT EXECUTE ON FUNCTION tests.set_jwt(uuid, text, uuid) TO authenticated;

-- ============================================================
-- Fixtures: two tenants
-- ============================================================
INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A', 'tenant-a', true, now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B', 'tenant-b', true, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tenant_lms (id, name, slug, is_active, created_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A', 'tenant-a', true, now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B', 'tenant-b', true, now())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Fixtures: auth.users
-- ============================================================
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-b@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher-b@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Fixtures: profiles (with tenant_bypass for immutable tenant_id)
-- ============================================================
SELECT set_config('app.tenant_assignment_bypass', 'true', true);

INSERT INTO public.profiles (id, name, role, tenant_id, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Student A', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
  ('22222222-2222-2222-2222-222222222222', 'Student B', 'student', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', now()),
  ('33333333-3333-3333-3333-333333333333', 'Teacher A', 'teacher', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
  ('44444444-4444-4444-4444-444444444444', 'Teacher B', 'teacher', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', now()),
  ('55555555-5555-5555-5555-555555555555', 'Admin A', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now())
ON CONFLICT (id) DO NOTHING;

-- Repair profiles that may have been pre-created by signup trigger
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role = 'student'
  WHERE id = '11111111-1111-1111-1111-111111111111' AND (tenant_id IS NULL OR role != 'student');
UPDATE public.profiles SET tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', role = 'student'
  WHERE id = '22222222-2222-2222-2222-222222222222' AND (tenant_id IS NULL OR role != 'student');
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role = 'teacher'
  WHERE id = '33333333-3333-3333-3333-333333333333' AND (tenant_id IS NULL OR role != 'teacher');
UPDATE public.profiles SET tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', role = 'teacher'
  WHERE id = '44444444-4444-4444-4444-444444444444' AND (tenant_id IS NULL OR role != 'teacher');
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role = 'admin'
  WHERE id = '55555555-5555-5555-5555-555555555555' AND (tenant_id IS NULL OR role != 'admin');

SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- ============================================================
-- Fixtures: courses
-- ============================================================
SET ROLE service_role;
INSERT INTO school_desk.courses (id, title, teacher_id, status, price, tenant_id, created_at)
VALUES
  ('cccc0000-0000-0000-0000-000000000001', 'Course A1', '33333333-3333-3333-3333-333333333333', 'published', 0, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
  ('cccc0000-0000-0000-0000-000000000002', 'Course B1', '44444444-4444-4444-4444-444444444444', 'published', 0, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', now())
ON CONFLICT (id) DO NOTHING;
RESET ROLE;

-- ============================================================
-- Fixtures: enrollments
-- ============================================================
SET ROLE service_role;
INSERT INTO school_desk.enrollments (id, student_id, course_id, purchased_at)
VALUES
  ('dddd0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'cccc0000-0000-0000-0000-000000000001', now()),
  ('dddd0000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'cccc0000-0000-0000-0000-000000000002', now())
ON CONFLICT (id) DO NOTHING;
RESET ROLE;

-- ============================================================
-- Test 1. POSITIVE: Student A reads own enrollment
-- ============================================================
SET ROLE authenticated;
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM school_desk.enrollments WHERE student_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'student A reads own enrollment'
);

-- ============================================================
-- Test 2. NEGATIVE: Student A cannot read Student B enrollment
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM school_desk.enrollments WHERE student_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'student A cannot read student B enrollment'
);

-- ============================================================
-- Test 3. POSITIVE: Teacher A reads enrollments for own courses
-- ============================================================
SELECT tests.set_jwt('33333333-3333-3333-3333-333333333333', 'teacher', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM school_desk.enrollments WHERE course_id = 'cccc0000-0000-0000-0000-000000000001'),
  1,
  'teacher A reads enrollments for own course'
);

-- ============================================================
-- Test 4. NEGATIVE: Teacher A cannot read enrollments for Teacher B course
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM school_desk.enrollments WHERE course_id = 'cccc0000-0000-0000-0000-000000000002'),
  0,
  'teacher A cannot read enrollments for teacher B course'
);

-- ============================================================
-- Test 5. POSITIVE: Admin A reads all enrollments
-- ============================================================
SELECT tests.set_jwt('55555555-5555-5555-5555-555555555555', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM school_desk.enrollments),
  2,
  'admin A reads all enrollments (no tenant scoping on enrollments table)'
);

-- ============================================================
-- Test 6. NEGATIVE: Student A cannot see enrollments for other student
-- ============================================================
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM school_desk.enrollments WHERE student_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'student A cannot see enrollments for student B'
);

-- ============================================================
-- Test 7. DENIAL: Student cannot INSERT enrollment (no INSERT grant)
-- ============================================================
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT throws_ok(
  $$INSERT INTO school_desk.enrollments (student_id, course_id, purchased_at) VALUES ('11111111-1111-1111-1111-111111111111', 'cccc0000-0000-0000-0000-000000000001', now())$$,
  '42501',
  NULL,
  'student INSERT on enrollments denied'
);

-- ============================================================
-- Test 8. DENIAL: Student cannot UPDATE enrollment (no UPDATE grant)
-- ============================================================
SELECT throws_ok(
  $$UPDATE school_desk.enrollments SET purchased_at = now() WHERE id = 'dddd0000-0000-0000-0000-000000000001'$$,
  '42501',
  NULL,
  'student UPDATE on enrollments denied'
);

-- ============================================================
-- Test 9. DENIAL: Student cannot DELETE enrollment (no DELETE grant)
-- ============================================================
SELECT throws_ok(
  $$DELETE FROM school_desk.enrollments WHERE id = 'dddd0000-0000-0000-0000-000000000001'$$,
  '42501',
  NULL,
  'student DELETE on enrollments denied'
);

-- ============================================================
-- Test 10. NEGATIVE: Teacher B cannot see enrollments for Teacher A courses
-- ============================================================
SELECT tests.set_jwt('44444444-4444-4444-4444-444444444444', 'teacher', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
SELECT is(
  (SELECT count(*)::int FROM school_desk.enrollments WHERE course_id = 'cccc0000-0000-0000-0000-000000000001'),
  0,
  'teacher B cannot see enrollments for teacher A courses'
);

SELECT * FROM finish();
ROLLBACK;
