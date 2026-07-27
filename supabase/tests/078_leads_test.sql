-- 078_leads_test.sql
-- ITEM-23-DEP-B: leads table privilege and RLS tests.
-- Inherits production grant surfaces per R23 — no test-side grants.
-- Amendment A5: service_role full CRUD via default ACL is accepted; no
-- revocation and no assertion that service_role lacks SELECT/UPDATE/DELETE.

BEGIN;
SELECT plan(8);

-- 1. Privilege surface: authenticated has no per-table privileges on leads
SELECT table_privs_are(
  'public', 'leads', 'authenticated',
  ARRAY[]::text[],
  'authenticated has no per-table privileges on leads'
);

-- 2. Privilege surface: anon has no per-table privileges on leads
SELECT table_privs_are(
  'public', 'leads', 'anon',
  ARRAY[]::text[],
  'anon has no per-table privileges on leads'
);

-- 3. Denial: authenticated INSERT throws 42501 (grant-layer deny)
SET ROLE authenticated;
SELECT throws_ok(
  $$INSERT INTO public.leads (tenant_id, name, email) VALUES ((SELECT id FROM public.tenant_devotional LIMIT 1), 'Test', 't@t.com')$$,
  '42501',
  NULL,
  'authenticated INSERT on leads throws 42501'
);

-- 4. Denial: authenticated SELECT throws 42501 (no SELECT grant)
SELECT throws_ok(
  $$SELECT count(*) FROM public.leads$$,
  '42501',
  NULL,
  'authenticated SELECT on leads throws 42501'
);

-- 5. Denial: authenticated UPDATE throws 42501
SELECT throws_ok(
  $$UPDATE public.leads SET name = 'x'$$,
  '42501',
  NULL,
  'authenticated UPDATE on leads throws 42501'
);

-- 6. Denial: anon INSERT throws 42501
SET ROLE anon;
SELECT throws_ok(
  $$INSERT INTO public.leads (tenant_id, name, email) VALUES ((SELECT id FROM public.tenant_devotional LIMIT 1), 'Test', 't@t.com')$$,
  '42501',
  NULL,
  'anon INSERT on leads throws 42501'
);

-- 7. Positive: service_role INSERT succeeds (bypasses RLS via default ACL)
RESET ROLE;
SET ROLE service_role;
SELECT lives_ok(
  $$INSERT INTO public.leads (tenant_id, name, email) VALUES ((SELECT id FROM public.tenant_devotional LIMIT 1), 'Verified', 'v@v.com')$$,
  'service_role can INSERT into leads'
);

-- 8. Inserted row carries the correct tenant_id
SELECT is(
  (SELECT tenant_id::text FROM public.leads WHERE email = 'v@v.com'),
  (SELECT id::text FROM public.tenant_devotional LIMIT 1),
  'lead row carries the correct tenant_id'
);

SELECT * FROM finish();
ROLLBACK;
