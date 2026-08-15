-- 096_leads_read_test.sql
-- ITEM-23-DEP-B / Row 48: pgTAP test for GRANT SELECT (096) + read EF.
-- 096 grant activates 095 lead_read_own_tenant policy.
-- New expectation (R2): authenticated SELECT returns 0 cross-tenant rows.
-- Original 42501 expectation preserved in dated comment block citing R2 owner ruling.
-- R2 owner ruling (Row 44): tenant-scoped lead read for Front Desk.
-- R4 carry-over: Turnstile QA (local test key).
-- R20 pattern: forged-JWT tenant mismatch returns 0 rows.

BEGIN;
SELECT plan(8);

-- ============================================================
-- Schema + helper (mirrors 091 pattern)
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
-- Fixtures: tenants in tenant_devotional (FK target for leads)
-- ============================================================
INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A', 'tenant-a', true, now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B', 'tenant-b', true, now())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Fixtures: auth.users + profiles for admin users
-- (required because leads_admin_all policy checks profiles.role)
-- ============================================================
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-b@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- The handle_new_user trigger creates profiles with role='student' on auth.users INSERT.
-- We must UPDATE to the correct role after the trigger fires.
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
UPDATE public.profiles SET role = 'admin', tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE public.profiles SET role = 'admin', tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' WHERE id = '22222222-2222-2222-2222-222222222222';
SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- ============================================================
-- Test 1. 096 grant: authenticated has SELECT on leads
-- ============================================================
SELECT table_privs_are(
  'front_desk', 'leads', 'authenticated',
  ARRAY['SELECT'],
  'authenticated has SELECT grant on leads (096 grant, R2)'
);

-- ============================================================
-- Test 2. service_role INSERT (creates fixture lead for Tenant-A)
-- ============================================================
RESET ROLE;
SET ROLE service_role;
SELECT lives_ok(
  $$INSERT INTO front_desk.leads (tenant_id, name, email) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Verified', 'v@v.com')$$,
  'service_role can INSERT into leads'
);
RESET ROLE;

-- ============================================================
-- Test 3. Tenant-A admin sees own leads (R2: cross-tenant isolation, own tenant only)
-- ============================================================
SET ROLE authenticated;
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM front_desk.leads WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1,
  'R2: tenant-A admin sees own leads (own tenant)'
);

-- ============================================================
-- Test 4. Tenant-B admin sees 0 of Tenant-A (R2: cross-tenant isolation)
-- ============================================================
SELECT tests.set_jwt('22222222-2222-2222-2222-222222222222', 'admin', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
SELECT is(
  (SELECT count(*)::int FROM front_desk.leads WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0,
  'R2: tenant-B admin sees 0 of Tenant-A leads (cross-tenant isolation)'
);

-- ============================================================
-- Test 5. NEW expectation (R2): authenticated SELECT returns 0 cross-tenant rows
-- ============================================================
SELECT tests.set_jwt('22222222-2222-2222-2222-222222222222', 'admin', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
SELECT is(
  (SELECT count(*)::int FROM front_desk.leads WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0,
  'R2 new expectation: authenticated SELECT returns 0 cross-tenant rows (Tenant-B admin sees 0 Tenant-A leads)'
);

-- ============================================================
-- Test 6. NULL tenant sees 0 (fail-closed)
-- ============================================================
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'admin', NULL);
SELECT is(
  (SELECT count(*)::int FROM front_desk.leads WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0,
  'NULL tenant sees 0 leads (fail-closed)'
);

-- ============================================================
-- Test 7. Forged JWT tenant mismatch (R20 pattern)
-- ============================================================
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'admin', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
SELECT is(
  (SELECT count(*)::int FROM front_desk.leads WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0,
  'Forged JWT (tenant mismatch, R20 pattern) returns 0 rows'
);

-- ============================================================
-- Test 8. service_role SELECT (bypasses RLS, defense-in-depth filter)
-- ============================================================
RESET ROLE;
SET ROLE service_role;
SELECT is(
  (SELECT count(*)::int FROM front_desk.leads WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1,
  'service_role SELECT on leads (bypasses RLS, server-side tenant filter)'
);

SELECT * FROM finish();
ROLLBACK;