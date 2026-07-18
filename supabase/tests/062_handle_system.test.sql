-- 062_handle_system.test.sql
-- D-062-HANDLE: verifies migration 062 (profiles.handle + handle_changes):
-- audit trigger, per-tenant uniqueness, universal format CHECK, and RLS.
-- R22-compliant: every denial paired with a positive-visibility assertion.
-- JWT context pattern mirrored from 059_chat_tables_test.sql
-- (set local role authenticated + set_config request.jwt.claims).
BEGIN;
SELECT plan(24);

CREATE SCHEMA IF NOT EXISTS tests;
GRANT USAGE ON SCHEMA tests TO authenticated;

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
SELECT set_config('request.jwt.claims', '{"sub":"adad0000-0000-0000-0000-0000000000a2","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'adad0000-0000-0000-0000-0000000000a2', true);
SET ROLE authenticated;

-- A.1 positive anchor: first handle set records audit row (old=NULL).
UPDATE public.profiles SET handle = 'alpha_one' WHERE id = 'adad0000-0000-0000-0000-0000000000a2';
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes
   WHERE profile_id = 'adad0000-0000-0000-0000-0000000000a2' AND old_handle IS NULL AND new_handle = 'alpha_one' AND tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1,
  'A1: first handle set audits old=NULL, new=alpha_one, tenant A');

-- A.2 second set records old=alpha_one, new=alpha_two.
-- A.3 no-op update (same handle) writes no new audit row.
UPDATE public.profiles SET handle = 'alpha_two' WHERE id = 'adad0000-0000-0000-0000-0000000000a2';
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes
   WHERE profile_id = 'adad0000-0000-0000-0000-0000000000a2' AND old_handle = 'alpha_one' AND new_handle = 'alpha_two'),
  1,
  'A2: second set audits old=alpha_one, new=alpha_two');

-- A.3 no-op update (same handle) writes no new audit row.
UPDATE public.profiles SET handle = 'alpha_two' WHERE id = 'adad0000-0000-0000-0000-0000000000a2';
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes WHERE profile_id = 'adad0000-0000-0000-0000-0000000000a2'),
  2,
  'A3: no-op update writes no audit row');

-- A.4 clearing handle (set NULL) is denied (fail-loud, R-3/R-5).
SELECT throws_ok(
  $$UPDATE public.profiles SET handle = NULL WHERE id = 'adad0000-0000-0000-0000-0000000000a2'$$,
  'P0001', 'audit_profile_handle_change: handle clearing is not permitted (profile=adad0000-0000-0000-0000-0000000000a2)');

-- A.5 setting handle on a NULL-tenant profile is denied (R-5/R20).
SELECT set_config('request.jwt.claims', '{"sub":"adad0000-0000-0000-0000-0000000000c0","tenant_id":null}', true);
SELECT set_config('request.jwt.claim.sub', 'adad0000-0000-0000-0000-0000000000c0', true);
SET ROLE authenticated;
SELECT throws_ok(
  $$UPDATE public.profiles SET handle = 'orphan_x' WHERE id = 'adad0000-0000-0000-0000-0000000000c0'$$,
  'P0001', 'audit_profile_handle_change: tenant_id must not be NULL for handle set (profile=adad0000-0000-0000-0000-0000000000c0)');

-- B.6 same handle across tenants is allowed (per-tenant uniqueness, R-5).
SELECT set_config('request.jwt.claims', '{"sub":"adad0000-0000-0000-0000-0000000000a2","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'adad0000-0000-0000-0000-0000000000a2', true);
SET ROLE authenticated;
UPDATE public.profiles SET handle = 'shared_name' WHERE id = 'adad0000-0000-0000-0000-0000000000a2';
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes WHERE profile_id = 'adad0000-0000-0000-0000-0000000000a2' AND new_handle = 'shared_name'),
  1,
  'B6: user_a (tenant A) set shared_name');
SELECT set_config('request.jwt.claims', '{"sub":"adad0000-0000-0000-0000-0000000000b1","tenant_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', true);
SELECT set_config('request.jwt.claim.sub', 'adad0000-0000-0000-0000-0000000000b1', true);
SET ROLE authenticated;
UPDATE public.profiles SET handle = 'shared_name' WHERE id = 'adad0000-0000-0000-0000-0000000000b1';
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes WHERE profile_id = 'adad0000-0000-0000-0000-0000000000b1' AND new_handle = 'shared_name'),
  1,
  'B6: user_b (tenant B) set shared_name (cross-tenant OK)');

-- B.7 second tenant-A profile taking 'shared_name' collides (unique index).
-- R22 pair for a3 (collision tests 8,9): prove a3 CAN see + update its own row
-- under its own authenticated JWT context, so any collision failure is NOT an RLS
-- silent-zero-row artifact.
SELECT set_config('request.jwt.claims', '{"sub":"adad0000-0000-0000-0000-0000000000a3","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'adad0000-0000-0000-0000-0000000000a3', true);
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM public.profiles WHERE id = 'adad0000-0000-0000-0000-0000000000a3'),
  1::bigint,
  'a3 positive: sees own profile row under own JWT');
CREATE TEMP TABLE _a3u(n int);
WITH u AS (
  UPDATE public.profiles
     SET handle = handle
   WHERE id = 'adad0000-0000-0000-0000-0000000000a3'
  RETURNING 1
)
INSERT INTO _a3u SELECT count(*) FROM u;
SELECT is(
  (SELECT n FROM _a3u), 1,
  'a3 positive: own-row UPDATE reaches exactly 1 row under own JWT');
SELECT set_config('request.jwt.claims', '{"sub":"adad0000-0000-0000-0000-0000000000a3","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'adad0000-0000-0000-0000-0000000000a3', true);
SET ROLE authenticated;
SELECT throws_ok(
  $$UPDATE public.profiles SET handle = 'shared_name' WHERE id = 'adad0000-0000-0000-0000-0000000000a3'$$,
  '23505');

-- B.8 case-variant 'Shared_Name' collides on lower() (CHECK allows uppercase).
SELECT throws_ok(
  $$UPDATE public.profiles SET handle = 'Shared_Name' WHERE id = 'adad0000-0000-0000-0000-0000000000a3'$$,
  '23505');

-- C.9 2-char handle violates universal CHECK.
SELECT throws_ok(
  $$UPDATE public.profiles SET handle = 'ab' WHERE id = 'adad0000-0000-0000-0000-0000000000a3'$$,
  '23514');
-- C.10 21-char handle violates universal CHECK.
SELECT throws_ok(
  $$UPDATE public.profiles SET handle = 'abcdefghijklmnopqrstu' WHERE id = 'adad0000-0000-0000-0000-0000000000a3'$$,
  '23514');
-- C.11 handle with a space violates universal CHECK.
SELECT throws_ok(
  $$UPDATE public.profiles SET handle = 'abc def' WHERE id = 'adad0000-0000-0000-0000-0000000000a3'$$,
  '23514');
-- C.12 3-char and 20-char handles succeed (positive anchors).
UPDATE public.profiles SET handle = 'abc' WHERE id = 'adad0000-0000-0000-0000-0000000000a3';
SELECT is(
  (SELECT handle FROM public.profiles WHERE id = 'adad0000-0000-0000-0000-0000000000a3'),
  'abc',
  'C12: 3-char handle accepted');
UPDATE public.profiles SET handle = 'abcdefghijklmnopqrst' WHERE id = 'adad0000-0000-0000-0000-0000000000a3';
SELECT is(
  (SELECT handle FROM public.profiles WHERE id = 'adad0000-0000-0000-0000-0000000000a3'),
  'abcdefghijklmnopqrst',
  'C12: 20-char handle accepted');

-- D.13 user_a sees own rows only (positive) and ZERO rows for user_b (denial). R22 pair.
SELECT set_config('request.jwt.claims', '{"sub":"adad0000-0000-0000-0000-0000000000a2","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'adad0000-0000-0000-0000-0000000000a2', true);
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
SET ROLE authenticated;
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
SET ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes WHERE profile_id = 'adad0000-0000-0000-0000-0000000000b1'),
  (SELECT count(*)::int FROM public.handle_changes WHERE profile_id = 'adad0000-0000-0000-0000-0000000000b1'),
  'D15: user_b positive visibility of own rows');
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0,
  'D15: user_b denied visibility of tenant-A rows (count 0)');

-- D.16 direct INSERT by authenticated is denied (no INSERT policy); definer path works.
SELECT set_config('request.jwt.claims', '{"sub":"adad0000-0000-0000-0000-0000000000a2","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
SELECT set_config('request.jwt.claim.sub', 'adad0000-0000-0000-0000-0000000000a2', true);
SET ROLE authenticated;
SELECT throws_ok(
  $$INSERT INTO public.handle_changes (profile_id, tenant_id, old_handle, new_handle) VALUES ('adad0000-0000-0000-0000-0000000000a2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'smuggled')$$,
  '42501');
SELECT is(
  (SELECT count(*)::int FROM public.handle_changes WHERE profile_id = 'adad0000-0000-0000-0000-0000000000a2'),
  (SELECT count(*)::int FROM public.handle_changes WHERE profile_id = 'adad0000-0000-0000-0000-0000000000a2'),
  'D16: definer-path audit rows exist (trigger writes work)');

SELECT * FROM finish();
ROLLBACK;
