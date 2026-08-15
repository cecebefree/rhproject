-- 110_ef_rate_limit_test.sql
-- pgTAP tests for EF-to-EF rate limiting.
-- Tests: under limit, at limit, over limit, burst window, cross-tenant isolation.
--
-- PREDECESSOR: 110_ef_rate_limiting.sql

BEGIN;
SELECT plan(9);

-- ============================================================
-- Schema + helper (mirrors 109 pattern)
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
-- Fixtures
-- ============================================================
INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A', 'tenant-a', true, now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B', 'tenant-b', true, now())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Fixtures: auth.users (required by profiles FK)
-- ============================================================
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- The handle_new_user trigger creates profiles with role='student' on auth.users INSERT.
-- We must UPDATE to the correct role after the trigger fires.
-- Use tenant_assignment_bypass to update immutable tenant_id.
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
UPDATE public.profiles SET role = 'admin', tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' WHERE id = '11111111-1111-1111-1111-111111111111';
SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- Set a tight rate limit for testing: 5 calls/min for front_desk on tenant A
INSERT INTO public.rate_limit_config (caller_service, tenant_id, calls_per_minute, burst_allowed, enabled)
VALUES
  ('front_desk', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 5, false, true),
  ('front_desk', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 3, true, true)
ON CONFLICT (caller_service, tenant_id) DO UPDATE
  SET calls_per_minute = EXCLUDED.calls_per_minute,
      burst_allowed = EXCLUDED.burst_allowed,
      enabled = EXCLUDED.enabled;

-- ============================================================
-- Test 1. Under limit → allow
-- ============================================================
SET ROLE authenticated;
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- No calls yet → under limit
SELECT is(
  public.check_rate_limit('front_desk', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  true,
  'under limit (0/5) → allow'
);

-- ============================================================
-- Test 2. At limit → allow (boundary: count < limit, not <=)
-- ============================================================
RESET ROLE;
-- Insert 4 calls (4 < 5 = under limit)
INSERT INTO public.ef_call_log (tenant_id, caller, receiver, action, method, path, status_code)
SELECT
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'front_desk', 'school_desk', 'create_enrollment', 'POST', '/enrollments', 201
FROM generate_series(1, 4);

SET ROLE authenticated;
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT is(
  public.check_rate_limit('front_desk', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  true,
  'at boundary (4/5) → allow'
);

-- ============================================================
-- Test 3. Over limit → reject
-- ============================================================
RESET ROLE;
-- Insert 1 more call (total = 5, limit = 5, 5 < 5 is false)
INSERT INTO public.ef_call_log (tenant_id, caller, receiver, action, method, path, status_code)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'front_desk', 'school_desk', 'create_enrollment', 'POST', '/enrollments', 201);

SET ROLE authenticated;
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT is(
  public.check_rate_limit('front_desk', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  false,
  'over limit (5/5) → reject'
);

-- ============================================================
-- Test 4. get_rate_limit_info returns correct structure
-- ============================================================
SELECT is(
  (public.get_rate_limit_info('front_desk', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') ->> 'limited')::boolean,
  true,
  'get_rate_limit_info reports limited=true when over limit'
);

SELECT is(
  (public.get_rate_limit_info('front_desk', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') ->> 'limit')::int,
  5,
  'get_rate_limit_info returns correct limit'
);

-- ============================================================
-- Test 5. Cross-tenant isolation: tenant B has separate counter
-- ============================================================
RESET ROLE;
-- Tenant B has only 0 calls (limit = 3)
SET ROLE authenticated;
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'admin', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

SELECT is(
  public.check_rate_limit('front_desk', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  true,
  'cross-tenant: tenant B under limit (0/3) despite tenant A over limit'
);

-- ============================================================
-- Test 6. Tenant-specific config overrides global default
-- ============================================================
RESET ROLE;
-- Tenant B has limit=3, global is 100. Verify tenant-specific wins.
SELECT is(
  (public.get_rate_limit_info('front_desk', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') ->> 'limit')::int,
  3,
  'tenant-specific config overrides global default'
);

-- ============================================================
-- Test 7. Disabled config → always allow
-- ============================================================
RESET ROLE;
UPDATE public.rate_limit_config
  SET enabled = false
WHERE caller_service = 'front_desk'
  AND tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

SET ROLE authenticated;
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

SELECT is(
  public.check_rate_limit('front_desk', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  true,
  'disabled config → always allow even when over limit'
);

-- ============================================================
-- Test 8. Unknown caller → allow (fail-open)
-- ============================================================
SELECT is(
  public.check_rate_limit('unknown_service', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  true,
  'unknown service → fail-open (allow)'
);

SELECT * FROM finish();
ROLLBACK;
