-- 07_tenant_assignment_immutable_test.sql
-- pgTAP tests for Ruling R20: tenant_id immutability trigger

SELECT plan(31);

-- Ensure pgTAP is available
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;

BEGIN;

-- ============================================================
-- Setup
-- ============================================================

INSERT INTO public.tenant_devotional (id, name, slug, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Test Tenant A', 'test-a', true),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'Test Tenant B', 'test-b', true),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'Inactive Tenant', 'inactive', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'admin_a@test.com', crypt('pw', gen_salt('bf')), now(), now(), now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'admin_b@test.com', crypt('pw', gen_salt('bf')), now(), now(), now(), now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'user_pending@test.com', crypt('pw', gen_salt('bf')), now(), now(), now(), now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'user_assigned@test.com', crypt('pw', gen_salt('bf')), now(), now(), now(), now()),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'non_admin@test.com', crypt('pw', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

DELETE FROM public.profiles WHERE id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid
);

DO $$
BEGIN
  PERFORM set_config('app.tenant_assignment_bypass', 'true', false);
END;
$$;

INSERT INTO public.profiles (id, name, role, tenant_id)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Admin A', 'admin', '11111111-1111-1111-1111-111111111111'::uuid);

INSERT INTO public.profiles (id, name, role, tenant_id)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Admin B', 'admin', '22222222-2222-2222-2222-222222222222'::uuid);

INSERT INTO public.profiles (id, name, role, tenant_id)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'User Pending', 'student', NULL);

INSERT INTO public.profiles (id, name, role, tenant_id)
VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'User Assigned', 'student', '11111111-1111-1111-1111-111111111111'::uuid);

INSERT INTO public.profiles (id, name, role, tenant_id)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, 'Non Admin', 'student', NULL);

DO $$
BEGIN
  PERFORM set_config('app.tenant_assignment_bypass', 'false', false);
END;
$$;

-- ============================================================
-- Test 1: NULL -> uuid via assign_tenant_to_profile
-- ============================================================
SELECT lives_ok(
  'SELECT public.assign_tenant_to_profile(''cccccccc-cccc-cccc-cccc-cccccccccccc''::uuid, ''11111111-1111-1111-1111-111111111111''::uuid, ''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa''::uuid)',
  'assign_tenant_to_profile: master-admin can assign NULL -> uuid'
);

SELECT is(
  (SELECT tenant_id FROM public.profiles WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'assign_tenant_to_profile: tenant_id persisted correctly'
);

-- ============================================================
-- Test 2: assign_tenant_to_profile blocks uuid -> different uuid
-- ============================================================
SELECT throws_ok(
  'SELECT public.assign_tenant_to_profile(''dddddddd-dddd-dddd-dddd-dddddddddddd''::uuid, ''22222222-2222-2222-2222-222222222222''::uuid, ''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa''::uuid)',
  'assign_tenant_to_profile: caller not master-admin of target tenant (caller_tenant=11111111-1111-1111-1111-111111111111, target=22222222-2222-2222-2222-222222222222)',
  'assign_tenant_to_profile: blocks different tenant (master-admin check)'
);

SELECT is(
  (SELECT tenant_id FROM public.profiles WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'assign_tenant_to_profile: original tenant_id preserved'
);

-- ============================================================
-- Test 3: assign_tenant_to_profile blocks uuid -> same uuid
-- ============================================================
SELECT throws_ok(
  'SELECT public.assign_tenant_to_profile(''dddddddd-dddd-dddd-dddd-dddddddddddd''::uuid, ''11111111-1111-1111-1111-111111111111''::uuid, ''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa''::uuid)',
  'assign_tenant_to_profile: tenant_id already set to this value (11111111-1111-1111-1111-111111111111)',
  'assign_tenant_to_profile: blocks idempotent reassignment'
);

-- ============================================================
-- Test 4: Direct UPDATE on tenant_id blocked by trigger
-- ============================================================
SELECT throws_ok(
  'UPDATE public.profiles SET tenant_id = ''22222222-2222-2222-2222-222222222222''::uuid WHERE id = ''dddddddd-dddd-dddd-dddd-dddddddddddd''::uuid',
  'tenant_id is immutable: direct updates blocked. Use assign_tenant Edge Function (profile dddddddd-dddd-dddd-dddd-dddddddddddd: 11111111-1111-1111-1111-111111111111 -> 22222222-2222-2222-2222-222222222222)',
  'Direct UPDATE on tenant_id: blocked by trigger'
);

SELECT is(
  (SELECT tenant_id FROM public.profiles WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Direct UPDATE: tenant_id preserved after blocked update'
);

-- ============================================================
-- Test 5: Direct UPDATE NULL -> uuid also blocked
-- ============================================================
SELECT throws_ok(
  'UPDATE public.profiles SET tenant_id = ''11111111-1111-1111-1111-111111111111''::uuid WHERE id = ''eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee''::uuid',
  'tenant_id is immutable: direct updates blocked. Use assign_tenant Edge Function (profile eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee: <NULL> -> 11111111-1111-1111-1111-111111111111)',
  'Direct UPDATE NULL -> uuid: blocked by trigger'
);

-- ============================================================
-- Test 6: assign_tenant_to_profile rejects non-admin caller
-- ============================================================
SELECT throws_ok(
  'SELECT public.assign_tenant_to_profile(''eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee''::uuid, ''11111111-1111-1111-1111-111111111111''::uuid, ''eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee''::uuid)',
  'assign_tenant_to_profile: caller is not admin (eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee)',
  'assign_tenant_to_profile: rejects non-admin caller'
);

-- ============================================================
-- Test 7: assign_tenant_to_profile rejects admin of wrong tenant
-- ============================================================
SELECT throws_ok(
  'SELECT public.assign_tenant_to_profile(''eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee''::uuid, ''11111111-1111-1111-1111-111111111111''::uuid, ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb''::uuid)',
  'assign_tenant_to_profile: caller not master-admin of target tenant (caller_tenant=22222222-2222-2222-2222-222222222222, target=11111111-1111-1111-1111-111111111111)',
  'assign_tenant_to_profile: rejects admin of different tenant'
);

-- ============================================================
-- Test 8: Bypass allows same tenant_id update (idempotent)
-- ============================================================
DO $$
BEGIN
  PERFORM set_config('app.tenant_assignment_bypass', 'true', false);
END;
$$;

UPDATE public.profiles SET tenant_id = '11111111-1111-1111-1111-111111111111'::uuid WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid;

DO $$
BEGIN
  PERFORM set_config('app.tenant_assignment_bypass', 'false', false);
END;
$$;

SELECT is(
  (SELECT tenant_id FROM public.profiles WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Bypass allows same tenant_id update (idempotent)'
);

-- ============================================================
-- Test 9: assign_tenant_to_profile rejects non-existent tenant
-- (master-admin check passes, then tenant check fails)
-- Use admin B (tenant 2) calling for non-existent tenant
-- ============================================================
-- R20 doctrine: authorization checked BEFORE tenant existence to prevent
-- cross-tenant existence probing; expectation aligned to sealed order.
SELECT throws_ok(
  'SELECT public.assign_tenant_to_profile(''eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee''::uuid, ''ffffffff-ffff-ffff-ffff-ffffffffffff''::uuid, ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb''::uuid)',
  'assign_tenant_to_profile: caller not master-admin of target tenant (caller_tenant=22222222-2222-2222-2222-222222222222, target=ffffffff-ffff-ffff-ffff-ffffffffffff)',
  'assign_tenant_to_profile: rejects non-existent tenant'
);

-- ============================================================
-- Test 10: assign_tenant_to_profile rejects inactive tenant
-- ============================================================
-- R20 doctrine: authorization checked BEFORE tenant existence to prevent
-- cross-tenant existence probing; expectation aligned to sealed order.
SELECT throws_ok(
  'SELECT public.assign_tenant_to_profile(''eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee''::uuid, ''33333333-3333-3333-3333-333333333333''::uuid, ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb''::uuid)',
  'assign_tenant_to_profile: caller not master-admin of target tenant (caller_tenant=22222222-2222-2222-2222-222222222222, target=33333333-3333-3333-3333-333333333333)',
  'assign_tenant_to_profile: rejects inactive tenant'
);

-- ============================================================
-- Test 11: assign_tenant_to_profile rejects non-existent profile
-- Use a fresh profile ID that hasn't been created
-- ============================================================
SELECT throws_ok(
  'SELECT public.assign_tenant_to_profile(''00000000-0000-0000-0000-000000000001''::uuid, ''11111111-1111-1111-1111-111111111111''::uuid, ''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa''::uuid)',
  'assign_tenant_to_profile: target profile not found (00000000-0000-0000-0000-000000000001)',
  'assign_tenant_to_profile: rejects non-existent profile'
);

-- ============================================================
-- Test 12: Regression - non-tenant_id updates work
-- ============================================================
UPDATE public.profiles SET name = 'Updated Name' WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid;
SELECT is(
  (SELECT name FROM public.profiles WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid),
  'Updated Name',
  'Regression: non-tenant_id updates still work'
);

-- ============================================================
-- Test 13: Trigger allows UPDATE of other columns
-- ============================================================
UPDATE public.profiles SET updated_at = now() WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid;
SELECT is(
  (SELECT tenant_id FROM public.profiles WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Regression: UPDATE without tenant_id change works'
);

-- ============================================================
-- Test 14-19: Hook behavior preserved
-- ============================================================
SELECT is(
  custom_access_token_hook('{"claims":{"sub":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"}}'::jsonb)
    -> 'claims' -> 'app_metadata' ->> 'tenant_id',
  NULL::text,
  'Hook: NULL tenant_id returns NULL (jsonb ->> on null)'
);

SELECT is(
  custom_access_token_hook('{"claims":{"sub":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"}}'::jsonb)
    -> 'claims' -> 'app_metadata' ->> 'role',
  'student',
  'Hook: role still injected when tenant_id is NULL'
);

SELECT is(
  custom_access_token_hook('{"claims":{"sub":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"}}'::jsonb)
    -> 'claims' -> 'app_metadata' ? 'tenant_id',
  true,
  'Hook: app_metadata has tenant_id key even when value is null'
);

SELECT is(
  custom_access_token_hook('{"claims":{"sub":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"}}'::jsonb)
    -> 'claims' -> 'app_metadata' ? 'role',
  true,
  'Hook: app_metadata has role key'
);

SELECT is(
  custom_access_token_hook('{"claims":{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd"}}'::jsonb)
    -> 'claims' -> 'app_metadata' ->> 'tenant_id',
  '11111111-1111-1111-1111-111111111111',
  'Hook: assigned user gets correct tenant_id'
);

-- User cccccccc... was assigned in test 1, so it has tenant_id now
SELECT is(
  custom_access_token_hook('{"claims":{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc"}}'::jsonb)
    -> 'claims' -> 'app_metadata' ->> 'tenant_id',
  '11111111-1111-1111-1111-111111111111',
  'Hook: previously pending user (now assigned) gets tenant_id'
);

-- ============================================================
-- Test 20: UPDATE role without tenant_id change works
-- ============================================================
UPDATE public.profiles SET role = 'teacher' WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid;
SELECT is(
  (SELECT tenant_id FROM public.profiles WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Regression: UPDATE role without tenant_id change works'
);

-- ============================================================
-- Test 21: Direct UPDATE uuid -> NULL blocked
-- ============================================================
SELECT throws_ok(
  'UPDATE public.profiles SET tenant_id = NULL WHERE id = ''dddddddd-dddd-dddd-dddd-dddddddddddd''::uuid',
  'tenant_id is immutable: direct updates blocked. Use assign_tenant Edge Function (profile dddddddd-dddd-dddd-dddd-dddddddddddd: 11111111-1111-1111-1111-111111111111 -> <NULL>)',
  'Direct UPDATE uuid -> NULL: blocked by trigger'
);

-- ============================================================
-- Test 22: Direct UPDATE uuid -> different uuid blocked
-- ============================================================
SELECT throws_ok(
  'UPDATE public.profiles SET tenant_id = ''22222222-2222-2222-2222-222222222222''::uuid WHERE id = ''dddddddd-dddd-dddd-dddd-dddddddddddd''::uuid',
  'tenant_id is immutable: direct updates blocked. Use assign_tenant Edge Function (profile dddddddd-dddd-dddd-dddd-dddddddddddd: 11111111-1111-1111-1111-111111111111 -> 22222222-2222-2222-2222-222222222222)',
  'Direct UPDATE uuid -> different uuid: blocked by trigger'
);

-- ============================================================
-- Test 23: Bypass allows idempotent same tenant_id update
-- ============================================================
DO $$
BEGIN
  PERFORM set_config('app.tenant_assignment_bypass', 'true', false);
END;
$$;

UPDATE public.profiles SET tenant_id = '11111111-1111-1111-1111-111111111111'::uuid WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid;

DO $$
BEGIN
  PERFORM set_config('app.tenant_assignment_bypass', 'false', false);
END;
$$;

SELECT is(
  (SELECT tenant_id FROM public.profiles WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Bypass allows idempotent same tenant_id update'
);

-- ============================================================
-- Test 24: assign_tenant_to_profile works for master-admin (regression)
-- ============================================================
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'newuser2@test.com', crypt('pw', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

DELETE FROM public.profiles WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid;
INSERT INTO public.profiles (id, name, role, tenant_id)
VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, 'New User', 'student', NULL);

SELECT lives_ok(
  'SELECT public.assign_tenant_to_profile(''ffffffff-ffff-ffff-ffff-ffffffffffff''::uuid, ''11111111-1111-1111-1111-111111111111''::uuid, ''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa''::uuid)',
  'assign_tenant_to_profile: master-admin assignment still works (regression)'
);

SELECT is(
  (SELECT tenant_id FROM public.profiles WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Regression: tenant_id correctly assigned'
);

-- ============================================================
-- Test 25: Bypass allows NULL -> uuid (initial assignment)
-- ============================================================
DO $$
BEGIN
  PERFORM set_config('app.tenant_assignment_bypass', 'true', false);
END;
$$;

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES ('22222222-3333-4444-5555-666666666666'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'bypass2@test.com', crypt('pw', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

DELETE FROM public.profiles WHERE id = '22222222-3333-4444-5555-666666666666'::uuid;
INSERT INTO public.profiles (id, name, role, tenant_id)
VALUES ('22222222-3333-4444-5555-666666666666'::uuid, 'Bypass User 2', 'student', NULL);

UPDATE public.profiles SET tenant_id = '11111111-1111-1111-1111-111111111111'::uuid WHERE id = '22222222-3333-4444-5555-666666666666'::uuid;

DO $$
BEGIN
  PERFORM set_config('app.tenant_assignment_bypass', 'false', false);
END;
$$;

SELECT is(
  (SELECT tenant_id FROM public.profiles WHERE id = '22222222-3333-4444-5555-666666666666'::uuid),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Bypass allows NULL -> uuid (initial assignment)'
);

SELECT is(
  custom_access_token_hook('{"claims":{"sub":"22222222-3333-4444-5555-666666666666"}}'::jsonb)
    -> 'claims' -> 'app_metadata' ->> 'tenant_id',
  '11111111-1111-1111-1111-111111111111',
  'Hook: bypass-assigned user gets tenant_id'
);

-- ============================================================
-- Test 26: Regression - UPDATE name without tenant_id change works
-- ============================================================
UPDATE public.profiles SET name = 'Another Name' WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid;
SELECT is(
  (SELECT tenant_id FROM public.profiles WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Regression: UPDATE name without tenant_id change works'
);

SELECT * FROM finish();
ROLLBACK;
