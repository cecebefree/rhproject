-- 078_leads_test.sql
-- ITEM-23-DEP-B: leads table privilege and RLS tests.
-- Inherits production grant surfaces per R23 — no test-side grants.
-- Amendment A5: service_role full CRUD via default ACL is accepted; no
-- revocation and no assertion that service_role lacks SELECT/UPDATE/DELETE.

BEGIN;
SELECT plan(8);

-- 1. Privilege surface: authenticated has SELECT on leads (post-096 GRANT SELECT)
SELECT table_privs_are(
  'front_desk', 'leads', 'authenticated',
  ARRAY['SELECT'],
  'authenticated has SELECT grant on leads (post-096)'
);

-- 2. Privilege surface: anon has no per-table privileges on leads
SELECT table_privs_are(
  'front_desk', 'leads', 'anon',
  ARRAY[]::text[],
  'anon has no per-table privileges on leads'
);

-- 3. Denial: authenticated INSERT throws 42501 (grant-layer deny)
SET ROLE authenticated;
SELECT throws_ok(
  $$INSERT INTO front_desk.leads (tenant_id, name, email) VALUES ((SELECT id FROM public.tenant_devotional LIMIT 1), 'Test', 't@t.com')$$,
  '42501',
  NULL,
  'authenticated INSERT on leads throws 42501'
);

-- 4. [DATED COMMENT BLOCK] Original 42501 expectation preserved per R2 owner
-- ruling (Row 44). This active test is retired; the 42501 assertion now lives
-- as documentation below. After GRANT SELECT (096), authenticated SELECT on
-- leads is granted and returns 0 cross-tenant rows instead of 42501.
--   R2: tenant-scoped lead read for Front Desk.
--   Original test assertion:
--     SELECT throws_ok(
--       $$SELECT count(*) FROM front_desk.leads$$,
--       '42501',
--       NULL,
--       'authenticated SELECT on leads throws 42501'
--     );
--   Post-096: authenticated SELECT succeeds and returns 0 cross-tenant rows.
-- R2 owner ruling dated 2026-07-27.

-- 4b. Post-096: authenticated SELECT returns 0 cross-tenant rows (R2: 0 cross-tenant rows)
SELECT is(
  (SELECT count(*)::int FROM front_desk.leads),
  0,
  'authenticated SELECT returns 0 cross-tenant rows (fail-closed, no JWT tenant_id)'
);

-- 5. Denial: authenticated UPDATE throws 42501
SELECT throws_ok(
  $$UPDATE front_desk.leads SET name = 'x'$$,
  '42501',
  NULL,
  'authenticated UPDATE on leads throws 42501'
);

-- 6. Denial: anon INSERT throws 42501
SET ROLE anon;
SELECT throws_ok(
  $$INSERT INTO front_desk.leads (tenant_id, name, email) VALUES ((SELECT id FROM public.tenant_devotional LIMIT 1), 'Test', 't@t.com')$$,
  '42501',
  NULL,
  'anon INSERT on leads throws 42501'
);

-- 7. Positive: service_role INSERT succeeds (bypasses RLS via default ACL)
RESET ROLE;
SET ROLE service_role;
SELECT lives_ok(
  $$INSERT INTO front_desk.leads (tenant_id, name, email) VALUES ((SELECT id FROM public.tenant_devotional LIMIT 1), 'Verified', 'v@v.com')$$,
  'service_role can INSERT into leads'
);

-- 8. Inserted row carries the correct tenant_id
SELECT is(
  (SELECT tenant_id::text FROM front_desk.leads WHERE email = 'v@v.com'),
  (SELECT id::text FROM public.tenant_devotional LIMIT 1),
  'lead row carries the correct tenant_id'
);

SELECT * FROM finish();
ROLLBACK;
