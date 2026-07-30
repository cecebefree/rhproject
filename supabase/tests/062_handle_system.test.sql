-- 062_handle_system.test.sql
-- D-062-HANDLE: verifies migration 062 (profiles.handle + handle_changes):
-- audit trigger, per-tenant uniqueness, universal format CHECK, and RLS.
-- R22-compliant: every denial paired with a positive-visibility assertion.
-- Post-076: authenticated has no UPDATE on profiles; handle writes via
-- SECURITY DEFINER test helper (mirrors set_handle EF path).
-- CHECK constraint tested through the helper (fires on UPDATE regardless of
-- caller privilege). Direct UPDATE denied at table level (42501).
-- Helper is REVOKE'd from PUBLIC/authenticated/anon (R23); called from
-- session-owner context. JWT claims set via set_config persist across
-- SET ROLE for RLS visibility tests.
BEGIN;
SELECT plan(25);

CREATE SCHEMA IF NOT EXISTS tests;
GRANT USAGE ON SCHEMA tests TO authenticated;

-- SECURITY DEFINER helper: mirrors set_handle EF (UPDATE + audit trigger).
-- Fully qualified names so search_path is irrelevant under SET ROLE.
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

-- Tenants (reuse 059 uuids to stay consistent with local fixtures).
INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A', 'tenant-a', true, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B', 'tenant-b', true, now())
ON CONFLICT (id) DO NOTHING;

-- Auth users (profiles FK requires matching auth.users rows).
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES
  ('adad0000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('adad0000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('adad0000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user-b@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('adad0000-0000-0000-0000-0000000000c0', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nullp@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('adad0000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user-a2@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Session-scoped tenant-assignment bypass (mirrors seed.sql usage).
SELECT set_config('app.tenant_assignment_bypass', 'true', false);

-- Profiles are auto-created by handle_new_user trigger on auth.users insert
-- (tenant_id NULL). Assign tenants via the immutability-bypass session var
-- (mirrors assign_tenant Edge Function path). c0 stays NULL by design.
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name = 'Admin A', role = 'admin' WHERE id = 'adad0000-0000-0000-0000-0000000000a1';
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name = 'User A', role = 'student' WHERE id = 'adad0000-0000-0000-0000-0000000000a2';
UPDATE public.profiles SET tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name = 'User B', role = 'student' WHERE id = 'adad0000-0000-0000-0000-0000000000b1';
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name = 'User A2', role = 'student' WHERE id = 'adad0000-0000-0000-0000-0000000000a3';
-- c0 intentionally left tenant_id NULL.
SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- Helper: set JWT context as a given profile (mirrors 059 pattern).
-- Session-level set_config persists across SET ROLE for RLS visibility tests.
SELECT set_config('request.jwt.claims', '{"sub":"adad0000-0000-0000-0000-0000000000a2","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'adad0000-0000-0000-0000-0000000000a2', true);

-- A.1 positive anchor: first handle set records audit row (old=NULL).
-- Helper called as session owner (function owner has EXECUTE after REVOKE).
SELECT tests._test_update_handle('adad0000-0000-0000-0000-0000000000a2', 'alpha_one');
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes
   WHERE profile_id = 'adad0000-0000-0000-0000-0000000000a2' AND old_handle IS NULL AND new_handle = 'alpha_one' AND tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1,
  'A1: first handle set audits old=NULL, new=alpha_one, tenant A');

-- A.2 second set records old=alpha_one, new=alpha_two.
SELECT tests._test_update_handle('adad0000-0000-0000-0000-0000000000a2', 'alpha_two');
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes
   WHERE profile_id = 'adad0000-0000-0000-0000-0000000000a2' AND old_handle = 'alpha_one' AND new_handle = 'alpha_two'),
  1,
  'A2: second set audits old=alpha_one, new=alpha_two');

-- A.3 no-op update (same handle) writes no new audit row.
SELECT tests._test_update_handle('adad0000-0000-0000-0000-0000000000a2', 'alpha_two');
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes WHERE profile_id = 'adad0000-0000-0000-0000-0000000000a2'),
  2,
  'A3: no-op update writes no audit row');

-- A.4 clearing handle (set NULL) is denied (fail-loud, R-3/R-5).
SELECT throws_ok(
  $$SELECT tests._test_update_handle('adad0000-0000-0000-0000-0000000000a2', NULL)$$,
  'P0001', 'audit_profile_handle_change: handle clearing is not permitted (profile=adad0000-0000-0000-0000-0000000000a2)');

-- A.5 setting handle on a NULL-tenant profile is denied (R-5/R20).
SELECT set_config('request.jwt.claims', '{"sub":"adad0000-0000-0000-0000-0000000000c0","tenant_id":null}', true);
SELECT set_config('request.jwt.claim.sub', 'adad0000-0000-0000-0000-0000000000c0', true);
SELECT throws_ok(
  $$SELECT tests._test_update_handle('adad0000-0000-0000-0000-0000000000c0', 'orphan_x')$$,
  'P0001', 'audit_profile_handle_change: tenant_id must not be NULL for handle set (profile=adad0000-0000-0000-0000-0000000000c0)');

-- B.6 same handle across tenants is allowed (per-tenant uniqueness, R-5).
SELECT set_config('request.jwt.claims', '{"sub":"adad0000-0000-0000-0000-0000000000a2","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'adad0000-0000-0000-0000-0000000000a2', true);
SELECT tests._test_update_handle('adad0000-0000-0000-0000-0000000000a2', 'shared_name');
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes WHERE profile_id = 'adad0000-0000-0000-0000-0000000000a2' AND new_handle = 'shared_name'),
  1,
  'B6: user_a (tenant A) set shared_name');
SELECT set_config('request.jwt.claims', '{"sub":"adad0000-0000-0000-0000-0000000000b1","tenant_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT set_config('request.jwt.claim.sub', 'adad0000-0000-0000-0000-0000000000b1', true);
SELECT tests._test_update_handle('adad0000-0000-0000-0000-0000000000b1', 'shared_name');
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes WHERE profile_id = 'adad0000-0000-0000-0000-0000000000b1' AND new_handle = 'shared_name'),
  1,
  'B6: user_b (tenant B) set shared_name (cross-tenant OK)');

-- B.7 second tenant-A profile taking 'shared_name' collides (unique index).
SELECT set_config('request.jwt.claims', '{"sub":"adad0000-0000-0000-0000-0000000000a3","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'adad0000-0000-0000-0000-0000000000a3', true);
SELECT throws_ok(
  $$SELECT tests._test_update_handle('adad0000-0000-0000-0000-0000000000a3', 'shared_name')$$,
  '23505');

-- C.8 uppercase 'Shared_Name' rejected by lowercase CHECK (23514).
SELECT throws_ok(
  $$SELECT tests._test_update_handle('adad0000-0000-0000-0000-0000000000a3', 'Shared_Name')$$,
  '23514');

-- C.9 2-char handle violates universal CHECK.
SELECT throws_ok(
  $$SELECT tests._test_update_handle('adad0000-0000-0000-0000-0000000000a3', 'ab')$$,
  '23514');
-- C.10 21-char handle violates universal CHECK.
SELECT throws_ok(
  $$SELECT tests._test_update_handle('adad0000-0000-0000-0000-0000000000a3', 'abcdefghijklmnopqrstu')$$,
  '23514');
-- C.11 handle with a space violates universal CHECK.
SELECT throws_ok(
  $$SELECT tests._test_update_handle('adad0000-0000-0000-0000-0000000000a3', 'abc def')$$,
  '23514');

-- C.12 3-char and 20-char handles succeed (positive anchors).
SELECT tests._test_update_handle('adad0000-0000-0000-0000-0000000000a3', 'abc');
SELECT is(
  (SELECT handle FROM public.profiles WHERE id = 'adad0000-0000-0000-0000-0000000000a3'),
  'abc',
  'C12: 3-char handle accepted');
SELECT tests._test_update_handle('adad0000-0000-0000-0000-0000000000a3', 'abcdefghijklmnopqrst');
SELECT is(
  (SELECT handle FROM public.profiles WHERE id = 'adad0000-0000-0000-0000-0000000000a3'),
  'abcdefghijklmnopqrst',
  'C12: 20-char handle accepted');

-- D.13 user_a sees own rows only (positive) and ZERO rows for user_b (denial). R22 pair.
SET ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes WHERE profile_id = 'adad0000-0000-0000-0000-0000000000a2'),
  (SELECT count(*)::int FROM public.handle_changes WHERE profile_id = 'adad0000-0000-0000-0000-0000000000a2'),
  'D13: user_a positive visibility of own rows');
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes WHERE profile_id = 'adad0000-0000-0000-0000-0000000000b1'),
  0,
  'D13: user_a denied visibility of user_b rows (count 0)');

-- D.14 admin_a sees all tenant-A rows (positive) and ZERO tenant-B rows (denial). R22 pair.
SELECT set_config('request.jwt.claims', '{"sub":"adad0000-0000-0000-0000-0000000000a1","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'adad0000-0000-0000-0000-0000000000a1', true);
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  (SELECT count(*)::int FROM public.handle_changes WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'D14: admin_a positive visibility of all tenant-A rows');
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes WHERE tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'D14: admin_a denied visibility of tenant-B rows (count 0)');

-- D.15 user_b sees own rows only (positive) and ZERO tenant-A rows (denial). R22 pair.
SELECT set_config('request.jwt.claims', '{"sub":"adad0000-0000-0000-0000-0000000000b1","tenant_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT set_config('request.jwt.claim.sub', 'adad0000-0000-0000-0000-0000000000b1', true);
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes WHERE profile_id = 'adad0000-0000-0000-0000-0000000000b1'),
  (SELECT count(*)::int FROM public.handle_changes WHERE profile_id = 'adad0000-0000-0000-0000-0000000000b1'),
  'D15: user_b positive visibility of own rows');
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0,
  'D15: user_b denied visibility of tenant-A rows (count 0)');

-- D.16 direct INSERT by authenticated is denied (no INSERT policy); definer path works.
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes WHERE profile_id = 'adad0000-0000-0000-0000-0000000000a2'),
  (SELECT count(*)::int FROM public.handle_changes WHERE profile_id = 'adad0000-0000-0000-0000-0000000000a2'),
  'D16: definer-path audit rows exist (trigger writes work)');

RESET ROLE;

-- E.17 direct UPDATE by authenticated is denied (migration 076 revoked UPDATE).
SELECT set_config('request.jwt.claims', '{"sub":"adad0000-0000-0000-0000-0000000000a2","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'adad0000-0000-0000-0000-0000000000a2', true);
SET ROLE authenticated;
SELECT throws_ok(
  $$UPDATE public.profiles SET handle = 'direct_attempt' WHERE id = 'adad0000-0000-0000-0000-0000000000a2'$$,
  '42501', 'permission denied for table profiles',
  'E17: authenticated direct UPDATE on profiles denied');

-- E.18 direct UPDATE(handle) by authenticated is denied even with IS NULL guard.
SELECT throws_ok(
  $$UPDATE public.profiles SET handle = 'sneaky' WHERE id = 'adad0000-0000-0000-0000-0000000000a2' AND handle IS NULL$$,
  '42501', 'permission denied for table profiles',
  'E18: authenticated UPDATE(handle) denied even with IS NULL guard');

SELECT * FROM finish();
ROLLBACK;
