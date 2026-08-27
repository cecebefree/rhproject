-- 091_courses_tenant_isolation_test.sql
-- Proves tenant-scoped RLS on courses table (migration 091).
-- Tests cross-tenant denial, same-tenant visibility, outside_student
-- RESTRICTIVE filter, teacher management, and fail-closed NULL paths.

BEGIN;
SELECT plan(8);

CREATE SCHEMA IF NOT EXISTS tests;
GRANT USAGE ON SCHEMA tests TO authenticated;

-- ============================================================
-- Helper: inject JWT with app_metadata.tenant_id
-- ============================================================
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

-- ============================================================
-- Fixtures: two tenants (tenant_devotional for profiles FK,
--            tenant_lms for courses FK)
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
-- Fixtures: auth.users (required by profiles FK)
-- ============================================================
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher-b@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-b@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outside-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now())
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
  ('44444444-4444-4444-4444-444444444444', 'Student B', 'student', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', now()),
  ('55555555-5555-5555-5555-555555555555', 'Outside A', 'outside_student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
  ('66666666-6666-6666-6666-666666666666', 'Admin A', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now())
ON CONFLICT (id) DO NOTHING;

-- Repair profiles that may have been pre-created by signup trigger
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role = 'teacher'
  WHERE id = '11111111-1111-1111-1111-111111111111' AND (tenant_id IS NULL OR role != 'teacher');
UPDATE public.profiles SET tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', role = 'teacher'
  WHERE id = '22222222-2222-2222-2222-222222222222' AND (tenant_id IS NULL OR role != 'teacher');
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role = 'student'
  WHERE id = '33333333-3333-3333-3333-333333333333' AND (tenant_id IS NULL OR role != 'student');
UPDATE public.profiles SET tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', role = 'student'
  WHERE id = '44444444-4444-4444-4444-444444444444' AND (tenant_id IS NULL OR role != 'student');
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role = 'outside_student'
  WHERE id = '55555555-5555-5555-5555-555555555555' AND (tenant_id IS NULL OR role != 'outside_student');
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role = 'admin'
  WHERE id = '66666666-6666-6666-6666-666666666666' AND (tenant_id IS NULL OR role != 'admin');

SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- ============================================================
-- Fixtures: courses
-- ============================================================

-- Tenant A: core course (published)
INSERT INTO school_desk.courses (id, title, teacher_id, status, price, type, tenant_id, created_at)
VALUES ('cccc0000-0000-0000-0000-000000000001', 'Core A', '11111111-1111-1111-1111-111111111111', 'published', 0, 'core', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now())
ON CONFLICT (id) DO NOTHING;

-- Tenant A: published non-core, open_to_outside
INSERT INTO school_desk.courses (id, title, teacher_id, status, price, type, open_to_outside, tenant_id, created_at)
VALUES ('cccc0000-0000-0000-0000-000000000002', 'Club A', '11111111-1111-1111-1111-111111111111', 'published', 0, 'club', true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now())
ON CONFLICT (id) DO NOTHING;

-- Tenant B: core course (published)
INSERT INTO school_desk.courses (id, title, teacher_id, status, price, type, tenant_id, created_at)
VALUES ('cccc0000-0000-0000-0000-000000000003', 'Core B', '22222222-2222-2222-2222-222222222222', 'published', 0, 'core', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', now())
ON CONFLICT (id) DO NOTHING;

-- Tenant A: draft course (should NOT be visible to students)
INSERT INTO school_desk.courses (id, title, teacher_id, status, price, type, tenant_id, created_at)
VALUES ('cccc0000-0000-0000-0000-000000000004', 'Draft A', '11111111-1111-1111-1111-111111111111', 'draft', 0, 'core', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now())
ON CONFLICT (id) DO NOTHING;

-- NULL-tenant course (Seed Mathematics scenario — inserted as superuser)
INSERT INTO school_desk.courses (id, title, teacher_id, status, price, type, tenant_id, created_at)
VALUES ('cccc0000-0000-0000-0000-000000000099', 'Orphan Course', '11111111-1111-1111-1111-111111111111', 'published', 0, 'core', NULL, now())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Tests
-- ============================================================
SET ROLE authenticated;

-- a. Cross-tenant SELECT denied: student A sees zero courses from tenant B
SELECT tests.set_jwt('33333333-3333-3333-3333-333333333333', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM school_desk.courses
   WHERE tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'a: cross-tenant SELECT denied — student A sees 0 courses from tenant B'
);

-- b. Same-tenant published course visible to same-tenant student
SELECT tests.set_jwt('33333333-3333-3333-3333-333333333333', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM school_desk.courses
   WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
     AND status = 'published'),
  2,
  'b: same-tenant published courses visible to same-tenant student'
);

-- c. outside_student cannot see core courses (RESTRICTIVE policy)
SELECT tests.set_jwt('55555555-5555-5555-5555-555555555555', 'outside_student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM school_desk.courses
   WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
     AND type = 'core'),
  0,
  'c: outside_student sees 0 core courses (RESTRICTIVE policy bites)'
);

-- d. outside_student CAN see non-core courses with open_to_outside = true
SELECT tests.set_jwt('55555555-5555-5555-5555-555555555555', 'outside_student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM school_desk.courses
   WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
     AND type = 'club'
     AND open_to_outside = true),
  1,
  'd: outside_student sees non-core open_to_outside course'
);

-- e. Teacher UPDATE on own course: blocked by column grants (42501)
--    (RLS allows via courses_teacher_manage, but authenticated lacks UPDATE grant)
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'teacher', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT throws_ok(
  $$UPDATE school_desk.courses SET title = 'Hacked' WHERE id = 'cccc0000-0000-0000-0000-000000000001'$$,
  42501,
  NULL,
  'e: teacher UPDATE on own course denied by column grants (42501)'
);

-- f. NULL-tenant teacher denied on SELECT of tenant-scoped courses (fail-closed)
--    Teacher with NULL tenant_id in JWT cannot see any courses (tenant_id = NULL is never true)
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'teacher', NULL);
SELECT is(
  (SELECT count(*)::int FROM school_desk.courses
   WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0,
  'f1: NULL-tenant teacher sees 0 tenant-scoped courses (fail-closed)'
);
-- Also: tenant-A teacher cannot see NULL-tenant course
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'teacher', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM school_desk.courses
   WHERE id = 'cccc0000-0000-0000-0000-000000000099'),
  0,
  'f2: tenant-A teacher sees 0 NULL-tenant courses (fail-closed)'
);

-- g. NULL-tenant course is invisible to non-admin roles
SELECT tests.set_jwt('33333333-3333-3333-3333-333333333333', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM school_desk.courses
   WHERE id = 'cccc0000-0000-0000-0000-000000000099'),
  0,
  'g: NULL-tenant course invisible to student (fail-closed)'
);

SELECT * FROM finish();
ROLLBACK;
