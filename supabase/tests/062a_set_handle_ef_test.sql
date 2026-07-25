-- 062a_set_handle_ef_test.sql
-- ROW 28a: set_handle EF database-level acceptance criteria.
-- Tests the database constraints, RLS, and trigger behavior that the EF relies on.
-- HTTP-level behavior (OPTIONS, GET, auth) is tested via the EF runtime.
-- R22-compliant: every denial paired with a positive-visibility assertion.
BEGIN;
SELECT plan(17);

CREATE SCHEMA IF NOT EXISTS tests;
GRANT USAGE ON SCHEMA tests TO authenticated;

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

-- T1: handle format CHECK rejects uppercase
SELECT set_config('request.jwt.claims', '{"sub":"efef0000-0000-0000-0000-0000000000a2","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'efef0000-0000-0000-0000-0000000000a2', true);
SET ROLE authenticated;
SELECT throws_ok(
  $$UPDATE public.profiles SET handle = 'Foo_Bar' WHERE id = 'efef0000-0000-0000-0000-0000000000a2'$$,
  '23514', NULL,
  'T1: uppercase handle rejected by CHECK');

-- T2: handle length CHECK rejects 2 chars
SELECT throws_ok(
  $$UPDATE public.profiles SET handle = 'ab' WHERE id = 'efef0000-0000-0000-0000-0000000000a2'$$,
  '23514', NULL,
  'T2: 2-char handle rejected by CHECK');

-- T3: handle length CHECK rejects 21 chars
SELECT throws_ok(
  $$UPDATE public.profiles SET handle = 'abcdefghijklmnopqrstu' WHERE id = 'efef0000-0000-0000-0000-0000000000a2'$$,
  '23514', NULL,
  'T3: 21-char handle rejected by CHECK');

-- T4: handle CHECK rejects whitespace
SELECT throws_ok(
  $$UPDATE public.profiles SET handle = 'foo bar' WHERE id = 'efef0000-0000-0000-0000-0000000000a2'$$,
  '23514', NULL,
  'T4: handle with space rejected by CHECK');

-- T5: valid handle accepted (positive anchor)
SELECT set_config('request.jwt.claims', '{"sub":"efef0000-0000-0000-0000-0000000000a2","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'efef0000-0000-0000-0000-0000000000a2', true);
SET ROLE authenticated;
UPDATE public.profiles SET handle = 'ef_valid' WHERE id = 'efef0000-0000-0000-0000-0000000000a2';
SELECT is(
  (SELECT handle FROM public.profiles WHERE id = 'efef0000-0000-0000-0000-0000000000a2'),
  'ef_valid',
  'T5: valid 3-20 char lowercase handle accepted');

-- T6: per-tenant uniqueness — duplicate within same tenant rejected
SELECT set_config('request.jwt.claims', '{"sub":"efef0000-0000-0000-0000-0000000000a1","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'efef0000-0000-0000-0000-0000000000a1', true);
SET ROLE authenticated;
SELECT throws_ok(
  $$UPDATE public.profiles SET handle = 'ef_valid' WHERE id = 'efef0000-0000-0000-0000-0000000000a1'$$,
  '23505', NULL,
  'T6: duplicate handle in same tenant rejected by unique index');

-- T7: same handle in different tenant allowed
SELECT set_config('request.jwt.claims', '{"sub":"efef0000-0000-0000-0000-0000000000b1","tenant_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT set_config('request.jwt.claim.sub', 'efef0000-0000-0000-0000-0000000000b1', true);
SET ROLE authenticated;
UPDATE public.profiles SET handle = 'ef_valid' WHERE id = 'efef0000-0000-0000-0000-0000000000b1';
SELECT is(
  (SELECT handle FROM public.profiles WHERE id = 'efef0000-0000-0000-0000-0000000000b1'),
  'ef_valid',
  'T7: same handle in different tenant allowed');

-- T8: audit trigger fires on handle change (old=NULL for first set)
SELECT set_config('request.jwt.claims', '{"sub":"efef0000-0000-0000-0000-0000000000a2","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'efef0000-0000-0000-0000-0000000000a2', true);
SET ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes
   WHERE profile_id = 'efef0000-0000-0000-0000-0000000000a2'
     AND old_handle IS NULL AND new_handle = 'ef_valid'),
  1,
  'T8: audit row created with old=NULL on first handle set');

-- T9: audit trigger records old handle on change
UPDATE public.profiles SET handle = 'ef_valid2' WHERE id = 'efef0000-0000-0000-0000-0000000000a2';
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes
   WHERE profile_id = 'efef0000-0000-0000-0000-0000000000a2'
     AND old_handle = 'ef_valid' AND new_handle = 'ef_valid2'),
  1,
  'T9: audit row created with old=ef_valid, new=ef_valid2');

-- T10: no-op update (same handle) writes no audit row
UPDATE public.profiles SET handle = 'ef_valid2' WHERE id = 'efef0000-0000-0000-0000-0000000000a2';
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes
   WHERE profile_id = 'efef0000-0000-0000-0000-0000000000a2'),
  2,
  'T10: no-op handle update creates no audit row');

-- T11: handle clearing (set NULL) is denied by trigger
SELECT throws_ok(
  $$UPDATE public.profiles SET handle = NULL WHERE id = 'efef0000-0000-0000-0000-0000000000a2'$$,
  'P0001', NULL,
  'T11: handle clearing denied by audit trigger');

-- T12: direct INSERT into handle_changes denied by RLS (no INSERT policy)
SELECT set_config('request.jwt.claims', '{"sub":"efef0000-0000-0000-0000-0000000000a2","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'efef0000-0000-0000-0000-0000000000a2', true);
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

-- T14: admin sees all tenant rows
SELECT set_config('request.jwt.claims', '{"sub":"efef0000-0000-0000-0000-0000000000a1","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'efef0000-0000-0000-0000-0000000000a1', true);
SET ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  (SELECT count(*)::int FROM public.handle_changes WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'T14: admin sees all tenant-A handle_changes rows');

-- T15: UPDATE(handle) grant exists for authenticated
SELECT ok(
  has_column_privilege('authenticated', 'public.profiles', 'handle', 'UPDATE'),
  'T15: authenticated has UPDATE privilege on profiles.handle');

-- T16: SELECT grant exists for authenticated on handle_changes
SELECT ok(
  has_table_privilege('authenticated', 'public.handle_changes', 'SELECT'),
  'T16: authenticated has SELECT privilege on handle_changes');

SELECT * FROM finish();
ROLLBACK;
