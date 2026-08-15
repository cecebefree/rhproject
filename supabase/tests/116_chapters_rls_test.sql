-- 116_chapters_rls_test.sql
-- pgTAP tests for public.chapters access control
-- Verifies that direct SELECT on chapters throws 42501 for authenticated
-- (no SELECT grant). Access is via chapters_read() SECURITY DEFINER RPC.
-- Migration: 015 + 074 (policies dropped) + 077 (RPC created)

BEGIN;
SELECT plan(4);

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
  ('33333333-3333-3333-3333-333333333333', 'Student A', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
  ('44444444-4444-4444-4444-444444444444', 'Admin A', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now())
ON CONFLICT (id) DO NOTHING;

-- Repair profiles that may have been pre-created by signup trigger
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role = 'teacher'
  WHERE id = '11111111-1111-1111-1111-111111111111' AND (tenant_id IS NULL OR role != 'teacher');
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
  ('cccc0000-0000-0000-0000-000000000001', 'Course A1', '11111111-1111-1111-1111-111111111111', 'published', 0, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now())
ON CONFLICT (id) DO NOTHING;
RESET ROLE;

-- ============================================================
-- Fixtures: chapters
-- ============================================================
SET ROLE service_role;
INSERT INTO public.chapters (id, course_id, title, video_url, order_index, created_at, updated_at)
VALUES
  ('dddd0000-0000-0000-0000-000000000001', 'cccc0000-0000-0000-0000-000000000001', 'Chapter A1-0', 'https://x/a1-0', 0, now(), now()),
  ('dddd0000-0000-0000-0000-000000000002', 'cccc0000-0000-0000-0000-000000000001', 'Chapter A1-1', 'https://x/a1-1', 1, now(), now())
ON CONFLICT (id) DO NOTHING;
RESET ROLE;

-- ============================================================
-- Test 1. DENIAL: Teacher direct SELECT → 42501 (no grant)
-- ============================================================
SET ROLE authenticated;
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'teacher', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT throws_ok(
  $$SELECT * FROM public.chapters LIMIT 1$$,
  '42501', NULL,
  'teacher direct SELECT on chapters denied (no grant)'
);

-- ============================================================
-- Test 2. DENIAL: Student direct SELECT → 42501 (no grant)
-- ============================================================
SELECT tests.set_jwt('33333333-3333-3333-3333-333333333333', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT throws_ok(
  $$SELECT * FROM public.chapters LIMIT 1$$,
  '42501', NULL,
  'student direct SELECT on chapters denied (no grant)'
);

-- ============================================================
-- Test 3. DENIAL: Admin direct SELECT → 42501 (no grant)
-- ============================================================
SELECT tests.set_jwt('44444444-4444-4444-4444-444444444444', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT throws_ok(
  $$SELECT * FROM public.chapters LIMIT 1$$,
  '42501', NULL,
  'admin direct SELECT on chapters denied (no grant)'
);

-- ============================================================
-- Test 4. DENIAL: Direct SELECT with WHERE clause also denied
-- ============================================================
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'teacher', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT throws_ok(
  $$SELECT * FROM public.chapters WHERE course_id = 'cccc0000-0000-0000-0000-000000000001'$$,
  '42501', NULL,
  'teacher direct SELECT with WHERE denied (no grant)'
);

SELECT * FROM finish();
ROLLBACK;
