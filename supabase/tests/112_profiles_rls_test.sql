-- 112_profiles_rls_test.sql
-- pgTAP tests for public.profiles RLS policies
-- Tests: positive (allowed) + negative (denied) polarity
-- Migration: 013_lms_users_profiles.sql

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

-- ============================================================
-- Fixtures: auth.users
-- ============================================================
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-b@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher-b@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Fixtures: profiles (with tenant_bypass for immutable tenant_id)
-- ============================================================
SELECT set_config('app.tenant_assignment_bypass', 'true', true);

INSERT INTO public.profiles (id, name, role, tenant_id, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Student A', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
  ('22222222-2222-2222-2222-222222222222', 'Student B', 'student', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', now()),
  ('33333333-3333-3333-3333-333333333333', 'Admin A', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
  ('44444444-4444-4444-4444-444444444444', 'Teacher B', 'teacher', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', now())
ON CONFLICT (id) DO NOTHING;

-- Repair profiles that may have been pre-created by signup trigger
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role = 'student'
  WHERE id = '11111111-1111-1111-1111-111111111111' AND (tenant_id IS NULL OR role != 'student');
UPDATE public.profiles SET tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', role = 'student'
  WHERE id = '22222222-2222-2222-2222-222222222222' AND (tenant_id IS NULL OR role != 'student');
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role = 'admin'
  WHERE id = '33333333-3333-3333-3333-333333333333' AND (tenant_id IS NULL OR role != 'admin');
UPDATE public.profiles SET tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', role = 'teacher'
  WHERE id = '44444444-4444-4444-4444-444444444444' AND (tenant_id IS NULL OR role != 'teacher');

SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- ============================================================
-- Test 1. POSITIVE: Student A reads own profile
-- ============================================================
SET ROLE authenticated;
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
  1,
  'student A reads own profile'
);

-- ============================================================
-- Test 2. NEGATIVE: Student A cannot read Student B profile
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM public.profiles WHERE id = '22222222-2222-2222-2222-222222222222'),
  0,
  'student A cannot read student B profile'
);

-- ============================================================
-- Test 3. POSITIVE: Admin A reads all profiles in tenant
-- ============================================================
SELECT tests.set_jwt('33333333-3333-3333-3333-333333333333', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM public.profiles WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  2,
  'admin A reads all profiles in tenant A'
);

-- ============================================================
-- Test 4. NEGATIVE: Student A cannot read profiles in other tenant
-- ============================================================
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM public.profiles WHERE tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'student A cannot read profiles in tenant B'
);

-- ============================================================
-- Test 5. DENIAL: Student cannot INSERT into profiles
-- ============================================================
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT throws_ok(
  $$INSERT INTO public.profiles (id, name, role) VALUES ('99999999-9999-9999-9999-999999999999', 'Hacker', 'admin')$$,
  '42501',
  NULL,
  'student INSERT on profiles denied'
);

-- ============================================================
-- Test 6. DENIAL: Student cannot UPDATE other profiles
-- ============================================================
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT throws_ok(
  $$UPDATE public.profiles SET role = 'admin' WHERE id = '22222222-2222-2222-2222-222222222222'$$,
  '42501',
  NULL,
  'student UPDATE on other profile denied'
);

-- ============================================================
-- Test 7. POSITIVE: Teacher B reads own profile (cross-tenant, own tenant)
-- ============================================================
SELECT tests.set_jwt('44444444-4444-4444-4444-444444444444', 'teacher', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
SELECT is(
  (SELECT count(*)::int FROM public.profiles WHERE id = '44444444-4444-4444-4444-444444444444'),
  1,
  'teacher B reads own profile'
);

-- ============================================================
-- Test 8. NEGATIVE: Teacher B cannot read profiles in tenant A
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM public.profiles WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0,
  'teacher B cannot read profiles in tenant A'
);

SELECT * FROM finish();
ROLLBACK;
