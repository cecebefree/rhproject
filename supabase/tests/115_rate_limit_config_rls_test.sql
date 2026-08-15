-- 115_rate_limit_config_rls_test.sql
-- pgTAP tests for public.rate_limit_config RLS policies
-- Tests: positive (allowed) + negative (denied) polarity
-- Migration: 110_ef_rate_limiting.sql

BEGIN;
SELECT plan(6);

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

-- ============================================================
-- Fixtures: auth.users
-- ============================================================
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Fixtures: profiles (with tenant_bypass for immutable tenant_id)
-- ============================================================
SELECT set_config('app.tenant_assignment_bypass', 'true', true);

INSERT INTO public.profiles (id, name, role, tenant_id, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Admin A', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
  ('22222222-2222-2222-2222-222222222222', 'Teacher A', 'teacher', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now())
ON CONFLICT (id) DO NOTHING;

-- Repair profiles that may have been pre-created by signup trigger
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role = 'admin'
  WHERE id = '11111111-1111-1111-1111-111111111111' AND (tenant_id IS NULL OR role != 'admin');
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role = 'teacher'
  WHERE id = '22222222-2222-2222-2222-222222222222' AND (tenant_id IS NULL OR role != 'teacher');

SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- ============================================================
-- Fixtures: rate_limit_config entries (inserted as service_role)
-- ============================================================
SET ROLE service_role;
INSERT INTO public.rate_limit_config (id, caller_service, tenant_id, calls_per_minute, burst_allowed, enabled, created_at, updated_at)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'front_desk', NULL, 100, true, true, now(), now()),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'front_desk', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 50, false, true, now(), now())
ON CONFLICT (id) DO NOTHING;
RESET ROLE;

-- ============================================================
-- Test 1. POSITIVE: Admin A reads rate_limit_config (global + tenant + seed)
-- ============================================================
SET ROLE authenticated;
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM public.rate_limit_config),
  5,
  'admin A reads rate_limit_config (2 inserted + 3 seed = 5)'
);

-- ============================================================
-- Test 2. NEGATIVE: Teacher A cannot read rate_limit_config
-- ============================================================
SELECT tests.set_jwt('22222222-2222-2222-2222-222222222222', 'teacher', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM public.rate_limit_config),
  0,
  'teacher A cannot read rate_limit_config'
);

-- ============================================================
-- Test 3. POSITIVE: Admin A can INSERT rate_limit_config
-- ============================================================
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT lives_ok(
  $$INSERT INTO public.rate_limit_config (caller_service, tenant_id, calls_per_minute, burst_allowed, enabled) VALUES ('school_desk', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 200, true, true)$$,
  'admin INSERT on rate_limit_config succeeds'
);

-- ============================================================
-- Test 4. NEGATIVE: Admin A cannot INSERT for tenant B (RLS check)
-- ============================================================
SELECT throws_ok(
  $$INSERT INTO public.rate_limit_config (caller_service, tenant_id, calls_per_minute, burst_allowed, enabled) VALUES ('school_desk', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 200, true, true)$$,
  '42501',
  NULL,
  'admin INSERT for tenant B denied (RLS tenant check)'
);

-- ============================================================
-- Test 5. DENIAL: Teacher cannot INSERT into rate_limit_config
-- ============================================================
SELECT tests.set_jwt('22222222-2222-2222-2222-222222222222', 'teacher', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT throws_ok(
  $$INSERT INTO public.rate_limit_config (caller_service, tenant_id, calls_per_minute, burst_allowed, enabled) VALUES ('test', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100, false, true)$$,
  '42501',
  NULL,
  'teacher INSERT on rate_limit_config denied'
);

-- ============================================================
-- Test 6. NEGATIVE: Teacher cannot UPDATE rate_limit_config (RLS filters)
-- ============================================================
SELECT tests.set_jwt('22222222-2222-2222-2222-222222222222', 'teacher', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM public.rate_limit_config WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0,
  'teacher cannot see rate_limit_config rows (RLS filter)'
);

SELECT * FROM finish();
ROLLBACK;
