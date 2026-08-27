-- 117_courses_rls_test.sql
-- pgTAP tests for school_desk.courses RLS policies
-- Tests: positive (allowed) + negative (denied) polarity
-- Migration: 014_lms_courses.sql

BEGIN;
SELECT plan(8);

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
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher-b@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Fixtures: profiles (with tenant_bypass for immutable tenant_id)
-- ============================================================
SELECT set_config('app.tenant_assignment_bypass', 'true', true);

INSERT INTO public.profiles (id, name, role, tenant_id, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Teacher A', 'teacher', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
  ('22222222-2222-2222-2222-222222222222', 'Teacher B', 'teacher', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', now()),
  ('33333333-3333-3333-3333-333333333333', 'Student A', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
  ('44444444-4444-4444-4444-444444444444', 'Admin A', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now())
ON CONFLICT (id) DO NOTHING;

-- Repair profiles that may have been pre-created by signup trigger
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role = 'teacher'
  WHERE id = '11111111-1111-1111-1111-111111111111' AND (tenant_id IS NULL OR role != 'teacher');
UPDATE public.profiles SET tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', role = 'teacher'
  WHERE id = '22222222-2222-2222-2222-222222222222' AND (tenant_id IS NULL OR role != 'teacher');
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role = 'student'
  WHERE id = '33333333-3333-3333-3333-333333333333' AND (tenant_id IS NULL OR role != 'student');
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role = 'admin'
  WHERE id = '44444444-4444-4444-4444-444444444444' AND (tenant_id IS NULL OR role != 'admin');

SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- ============================================================
-- Fixtures: courses
-- ============================================================
SET ROLE service_role;
INSERT INTO school_desk.courses (id, title, teacher_id, status, price, tenant_id, created_at)
VALUES
  ('cccc0000-0000-0000-0000-000000000001', 'Published A1', '11111111-1111-1111-1111-111111111111', 'published', 0, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
  ('cccc0000-0000-0000-0000-000000000002', 'Published B1', '22222222-2222-2222-2222-222222222222', 'published', 0, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', now()),
  ('cccc0000-0000-0000-0000-000000000003', 'Draft A1', '11111111-1111-1111-1111-111111111111', 'draft', 0, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now())
ON CONFLICT (id) DO NOTHING;
RESET ROLE;

-- ============================================================
-- Test 1. POSITIVE: Teacher A reads own courses
-- ============================================================
SET ROLE authenticated;
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'teacher', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM school_desk.courses WHERE teacher_id = '11111111-1111-1111-1111-111111111111'),
  2,
  'teacher A reads own courses (published + draft)'
);

-- ============================================================
-- Test 2. POSITIVE: Student A reads published courses in tenant
-- ============================================================
SELECT tests.set_jwt('33333333-3333-3333-3333-333333333333', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM school_desk.courses WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND status = 'published'),
  1,
  'student A reads published courses in tenant A'
);

-- ============================================================
-- Test 3. NEGATIVE: Student A cannot read draft courses
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM school_desk.courses WHERE status = 'draft' AND tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0,
  'student A cannot read draft courses'
);

-- ============================================================
-- Test 4. NEGATIVE: Student A cannot read courses from tenant B
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM school_desk.courses WHERE tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'student A cannot read courses from tenant B'
);

-- ============================================================
-- Test 5. POSITIVE: Admin A reads all courses in tenant
-- ============================================================
SELECT tests.set_jwt('44444444-4444-4444-4444-444444444444', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM school_desk.courses WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  2,
  'admin A reads all courses in tenant A (published + draft)'
);

-- ============================================================
-- Test 6. DENIAL: Student cannot INSERT courses
-- ============================================================
SELECT tests.set_jwt('33333333-3333-3333-3333-333333333333', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT throws_ok(
  $$INSERT INTO school_desk.courses (title, teacher_id, status, price, tenant_id) VALUES ('Hacker Course', '33333333-3333-3333-3333-333333333333', 'published', 0, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  '42501',
  NULL,
  'student INSERT on courses denied'
);

-- ============================================================
-- Test 7. DENIAL: Student cannot UPDATE courses
-- ============================================================
SELECT throws_ok(
  $$UPDATE school_desk.courses SET title = 'Hacked' WHERE id = 'cccc0000-0000-0000-0000-000000000001'$$,
  '42501',
  NULL,
  'student UPDATE on courses denied'
);

-- ============================================================
-- Test 8. NEGATIVE: Teacher A cannot read courses from tenant B
-- ============================================================
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'teacher', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM school_desk.courses WHERE tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'teacher A cannot read courses from tenant B'
);

SELECT * FROM finish();
ROLLBACK;
