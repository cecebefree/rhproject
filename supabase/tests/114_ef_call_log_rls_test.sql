-- 114_ef_call_log_rls_test.sql
-- pgTAP tests for public.ef_call_log RLS policies
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
-- Fixtures: ef_call_log entries (inserted as service_role)
-- ============================================================
SET ROLE service_role;
INSERT INTO public.ef_call_log (id, tenant_id, caller, receiver, action, method, path, status_code, created_at)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'front_desk', 'office_desk', 'read_leads', 'POST', '/functions/v1/front-desk-read-leads', 200, now()),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'school_desk', 'office_desk', 'read_report_cards', 'POST', '/functions/v1/school-desk-read-report-cards', 200, now())
ON CONFLICT (id) DO NOTHING;
RESET ROLE;

-- ============================================================
-- Test 1. POSITIVE: Admin A reads call log in own tenant
-- ============================================================
SET ROLE authenticated;
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM public.ef_call_log WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  2,
  'admin A reads call log in own tenant'
);

-- ============================================================
-- Test 2. NEGATIVE: Teacher A cannot read call log
-- ============================================================
SELECT tests.set_jwt('22222222-2222-2222-2222-222222222222', 'teacher', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM public.ef_call_log),
  0,
  'teacher A cannot read call log'
);

-- ============================================================
-- Test 3. NEGATIVE: Admin A cannot read call log from tenant B
-- ============================================================
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM public.ef_call_log WHERE tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'admin A cannot read call log from tenant B'
);

-- ============================================================
-- Test 4. DENIAL: Teacher cannot INSERT into ef_call_log
-- ============================================================
SELECT tests.set_jwt('22222222-2222-2222-2222-222222222222', 'teacher', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT throws_ok(
  $$INSERT INTO public.ef_call_log (tenant_id, caller, receiver, action, method, path, status_code) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'test', 'test', 'test', 'POST', '/test', 200)$$,
  '42501',
  NULL,
  'teacher INSERT on ef_call_log denied'
);

-- ============================================================
-- Test 5. DENIAL: Teacher cannot UPDATE ef_call_log
-- ============================================================
SELECT throws_ok(
  $$UPDATE public.ef_call_log SET status_code = 500 WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  '42501',
  NULL,
  'teacher UPDATE on ef_call_log denied'
);

-- ============================================================
-- Test 6. DENIAL: Teacher cannot DELETE ef_call_log
-- ============================================================
SELECT throws_ok(
  $$DELETE FROM public.ef_call_log WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  '42501',
  NULL,
  'teacher DELETE on ef_call_log denied'
);

SELECT * FROM finish();
ROLLBACK;
