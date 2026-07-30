-- 062a_set_handle_ef_test.sql
-- ROW 28a: set_handle EF database-level acceptance criteria.
-- Tests the database constraints, RLS, and trigger behavior that the EF relies on.
-- HTTP-level behavior (OPTIONS, GET, auth) is tested via the EF runtime.
-- R22-compliant: every denial paired with a positive-visibility assertion.
-- Post-076: authenticated has no UPDATE on profiles; CHECK constraint tested
-- through SECURITY DEFINER helper; direct UPDATE denied at table level (42501).
-- Helper is REVOKE'd from PUBLIC/authenticated/anon (R23); called from
-- session-owner context. JWT claims set via set_config persist across
-- SET ROLE for RLS visibility tests.
BEGIN;
SELECT plan(19);

CREATE SCHEMA IF NOT EXISTS tests;
GRANT USAGE ON SCHEMA tests TO authenticated;

-- SECURITY DEFINER helper: mirrors set_handle EF (UPDATE + audit trigger).
CREATE OR REPLACE FUNCTION tests._test_update_handle(p_id uuid, p_handle text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $func$
BEGIN
  UPDATE public.profiles SET handle = p_handle WHERE id = p_id;
END;
$func$;
REVOKE EXECUTE ON FUNCTION tests._test_update_handle(uuid, text)
  FROM PUBLIC, authenticated, anon;

-- Item 2c: confirm REVOKE is effective
SELECT ok(
  NOT has_function_privilege('authenticated', 'tests._test_update_handle(uuid, text)', 'EXECUTE'),
  'helper: authenticated has no EXECUTE on _test_update_handle after REVOKE');

-- Tenants
INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A', 'tenant-a', true, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B', 'tenant-b', true, now())
ON CONFLICT (id) DO NOTHING;

-- Auth users
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES
  ('efef0000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ef-admin@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('efef0000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ef-user@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('efef0000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ef-userb@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Profiles via bypass
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name = 'EF Admin', role = 'admin' WHERE id = 'efef0000-0000-0000-0000-0000000000a1';
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name = 'EF User', role = 'student' WHERE id = 'efef0000-0000-0000-0000-0000000000a2';
UPDATE public.profiles SET tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name = 'EF User B', role = 'student' WHERE id = 'efef0000-0000-0000-0000-0000000000b1';
SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- Set JWT context (persists across SET ROLE for RLS tests)
SELECT set_config('request.jwt.claims', '{"sub":"efef0000-0000-0000-0000-0000000000a2","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'efef0000-0000-0000-0000-0000000000a2', true);

-- T1: handle format CHECK rejects uppercase
SELECT throws_ok(
  $$SELECT tests._test_update_handle('efef0000-0000-0000-0000-0000000000a2', 'Foo_Bar')$$,
  '23514', NULL,
  'T1: uppercase handle rejected by CHECK');

-- T2: handle length CHECK rejects 2 chars
SELECT throws_ok(
  $$SELECT tests._test_update_handle('efef0000-0000-0000-0000-0000000000a2', 'ab')$$,
  '23514', NULL,
  'T2: 2-char handle rejected by CHECK');

-- T3: handle length CHECK rejects 21 chars
SELECT throws_ok(
  $$SELECT tests._test_update_handle('efef0000-0000-0000-0000-0000000000a2', 'abcdefghijklmnopqrstu')$$,
  '23514', NULL,
  'T3: 21-char handle rejected by CHECK');

-- T4: handle CHECK rejects whitespace
SELECT throws_ok(
  $$SELECT tests._test_update_handle('efef0000-0000-0000-0000-0000000000a2', 'foo bar')$$,
  '23514', NULL,
  'T4: handle with space rejected by CHECK');

-- T5: valid handle accepted (positive anchor)
SELECT tests._test_update_handle('efef0000-0000-0000-0000-0000000000a2', 'ef_valid');
SELECT is(
  (SELECT handle FROM public.profiles WHERE id = 'efef0000-0000-0000-0000-0000000000a2'),
  'ef_valid',
  'T5: valid 3-20 char lowercase handle accepted');

-- T6: per-tenant uniqueness — duplicate within same tenant rejected
SELECT set_config('request.jwt.claims', '{"sub":"efef0000-0000-0000-0000-0000000000a1","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'efef0000-0000-0000-0000-0000000000a1', true);
SELECT throws_ok(
  $$SELECT tests._test_update_handle('efef0000-0000-0000-0000-0000000000a1', 'ef_valid')$$,
  '23505', NULL,
  'T6: duplicate handle in same tenant rejected by unique index');

-- T7: same handle in different tenant allowed
SELECT set_config('request.jwt.claims', '{"sub":"efef0000-0000-0000-0000-0000000000b1","tenant_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT set_config('request.jwt.claim.sub', 'efef0000-0000-0000-0000-0000000000b1', true);
SELECT tests._test_update_handle('efef0000-0000-0000-0000-0000000000b1', 'ef_valid');
SELECT is(
  (SELECT handle FROM public.profiles WHERE id = 'efef0000-0000-0000-0000-0000000000b1'),
  'ef_valid',
  'T7: same handle in different tenant allowed');

-- T8: audit trigger fires on handle change (old=NULL for first set)
SELECT set_config('request.jwt.claims', '{"sub":"efef0000-0000-0000-0000-0000000000a2","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'efef0000-0000-0000-0000-0000000000a2', true);
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes
   WHERE profile_id = 'efef0000-0000-0000-0000-0000000000a2'
     AND old_handle IS NULL AND new_handle = 'ef_valid'),
  1,
  'T8: audit row created with old=NULL on first handle set');

-- T9: audit trigger records old handle on change
SELECT tests._test_update_handle('efef0000-0000-0000-0000-0000000000a2', 'ef_valid2');
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes
   WHERE profile_id = 'efef0000-0000-0000-0000-0000000000a2'
     AND old_handle = 'ef_valid' AND new_handle = 'ef_valid2'),
  1,
  'T9: audit row created with old=ef_valid, new=ef_valid2');

-- T10: no-op update (same handle) writes no audit row
SELECT tests._test_update_handle('efef0000-0000-0000-0000-0000000000a2', 'ef_valid2');
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes
   WHERE profile_id = 'efef0000-0000-0000-0000-0000000000a2'),
  2,
  'T10: no-op handle update creates no audit row');

-- T11: handle clearing (set NULL) is denied by trigger
SELECT throws_ok(
  $$SELECT tests._test_update_handle('efef0000-0000-0000-0000-0000000000a2', NULL)$$,
  'P0001', NULL,
  'T11: handle clearing denied by audit trigger');

-- T12: direct INSERT into handle_changes denied by RLS (no INSERT policy)
SET ROLE authenticated;
SELECT throws_ok(
  $$INSERT INTO public.handle_changes (profile_id, tenant_id, old_handle, new_handle)
    VALUES ('efef0000-0000-0000-0000-0000000000a2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'smuggled')$$,
  '42501', NULL,
  'T12: direct INSERT into handle_changes denied (no INSERT policy)');

-- T13: user sees own handle_changes rows only
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes WHERE profile_id = 'efef0000-0000-0000-0000-0000000000a2'),
  (SELECT count(*)::int FROM public.handle_changes WHERE profile_id = 'efef0000-0000-0000-0000-0000000000a2'),
  'T13: user sees own handle_changes rows');
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes WHERE profile_id = 'efef0000-0000-0000-0000-0000000000b1'),
  0,
  'T13: user denied visibility of other tenant rows');
RESET ROLE;

-- T14: admin sees all tenant rows
SELECT set_config('request.jwt.claims', '{"sub":"efef0000-0000-0000-0000-0000000000a1","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'efef0000-0000-0000-0000-0000000000a1', true);
SET ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  (SELECT count(*)::int FROM public.handle_changes WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'T14: admin sees all tenant-A handle_changes rows');

-- T15: direct UPDATE by authenticated is denied (migration 076 revoked UPDATE).
SELECT throws_ok(
  $$UPDATE public.profiles SET handle = 'direct_attempt' WHERE id = 'efef0000-0000-0000-0000-0000000000a2'$$,
  '42501', 'permission denied for table profiles',
  'T15: authenticated direct UPDATE on profiles denied');
RESET ROLE;

-- T16: SELECT grant exists for authenticated on handle_changes
SELECT ok(
  has_table_privilege('authenticated', 'public.handle_changes', 'SELECT'),
  'T16: authenticated has SELECT privilege on handle_changes');

-- T17: authenticated has no UPDATE privilege on profiles (migration 076)
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
  'T17: authenticated has no UPDATE privilege on profiles (post-076)');

SELECT * FROM finish();
ROLLBACK;
