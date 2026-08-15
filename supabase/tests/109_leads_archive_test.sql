-- 109_leads_archive_test.sql
-- pgTAP tests for lead soft-delete (archive) workflow.
-- Tests: archive hides lead, unarchive restores, audit log, role gate.
--
-- PREDECESSOR: 109_leads_soft_delete_archive.sql

BEGIN;
SELECT plan(10);

-- ============================================================
-- Schema + helper (mirrors 096 pattern)
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
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'frontdesk-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'office-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Profiles for admin + front_desk + office (tenant A)
-- The handle_new_user trigger creates profiles with role='student' on auth.users INSERT.
-- We must UPDATE to the correct role after the trigger fires.
-- Use tenant_assignment_bypass to update immutable tenant_id.
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
UPDATE public.profiles SET role = 'admin',     tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE public.profiles SET role = 'front_desk', tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' WHERE id = '33333333-3333-3333-3333-333333333333';
UPDATE public.profiles SET role = 'office',    tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' WHERE id = '55555555-5555-5555-5555-555555555555';
SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- Two active leads in tenant A
SET ROLE service_role;
INSERT INTO front_desk.leads (id, tenant_id, name, email, status)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lead Active',  'active@test.com',  'enquiry'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lead Archive', 'archive@test.com', 'enquiry')
ON CONFLICT (id) DO NOTHING;
RESET ROLE;

-- ============================================================
-- Test 1. Active lead visible to front_desk
-- ============================================================
SET ROLE authenticated;
SELECT tests.set_jwt('33333333-3333-3333-3333-333333333333', 'front_desk', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM front_desk.leads WHERE email = 'active@test.com'),
  1,
  'active lead visible to front_desk role'
);

-- ============================================================
-- Test 2. Archive the second lead via function
-- ============================================================
RESET ROLE;
SET ROLE authenticated;
SELECT tests.set_jwt('33333333-3333-3333-3333-333333333333', 'front_desk', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT public.archive_lead(
  'aaaaaaaa-0000-0000-0000-000000000002',
  'archive',
  'inactive'::front_desk.archive_reason_type,
  'No response after 3 follow-ups'
);
RESET ROLE;

-- ============================================================
-- Test 3. Archived lead hidden from default SELECT (RLS filter)
-- ============================================================
SET ROLE authenticated;
SELECT tests.set_jwt('33333333-3333-3333-3333-333333333333', 'front_desk', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM front_desk.leads WHERE email = 'archive@test.com'),
  0,
  'archived lead hidden from front_desk default query'
);

-- ============================================================
-- Test 4. Active lead still visible after archive of other lead
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM front_desk.leads WHERE email = 'active@test.com'),
  1,
  'active lead still visible after other lead archived'
);

-- ============================================================
-- Test 5. Audit log written on archive
-- ============================================================
RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM front_desk.lead_archive_log
    WHERE lead_id = 'aaaaaaaa-0000-0000-0000-000000000002'
      AND action = 'archive'),
  1,
  'audit log records archive event'
);

-- ============================================================
-- Test 6. Audit log has correct reason and actor
-- ============================================================
SELECT is(
  (SELECT reason::text FROM front_desk.lead_archive_log
    WHERE lead_id = 'aaaaaaaa-0000-0000-0000-000000000002'
      AND action = 'archive' LIMIT 1),
  'inactive',
  'audit log records archive reason'
);

SELECT is(
  (SELECT notes FROM front_desk.lead_archive_log
    WHERE lead_id = 'aaaaaaaa-0000-0000-0000-000000000002'
      AND action = 'archive' LIMIT 1),
  'No response after 3 follow-ups',
  'audit log records archive notes'
);

-- ============================================================
-- Test 7. Un-archive restores lead
-- ============================================================
SET ROLE authenticated;
SELECT tests.set_jwt('33333333-3333-3333-3333-333333333333', 'front_desk', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT public.archive_lead(
  'aaaaaaaa-0000-0000-0000-000000000002',
  'unarchive',
  NULL,
  'Student re-engaged'
);
RESET ROLE;

SET ROLE authenticated;
SELECT tests.set_jwt('33333333-3333-3333-3333-333333333333', 'front_desk', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM front_desk.leads WHERE email = 'archive@test.com'),
  1,
  'un-archived lead visible again'
);

-- ============================================================
-- Test 8. Audit log written on unarchive
-- ============================================================
RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM front_desk.lead_archive_log
    WHERE lead_id = 'aaaaaaaa-0000-0000-0000-000000000002'
      AND action = 'unarchive'),
  1,
  'audit log records unarchive event'
);

-- ============================================================
-- Test 9. Office role cannot see archived leads
-- ============================================================
SET ROLE authenticated;
SELECT tests.set_jwt('55555555-5555-5555-5555-555555555555', 'office', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- Re-archive for this test (use front_desk role to archive)
RESET ROLE;
SET ROLE authenticated;
SELECT tests.set_jwt('33333333-3333-3333-3333-333333333333', 'front_desk', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT public.archive_lead(
  'aaaaaaaa-0000-0000-0000-000000000002',
  'archive',
  'duplicate'::front_desk.archive_reason_type,
  NULL
);
RESET ROLE;

SET ROLE authenticated;
SELECT tests.set_jwt('55555555-5555-5555-5555-555555555555', 'office', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM front_desk.leads WHERE email = 'archive@test.com'),
  0,
  'office role cannot see archived leads'
);

-- ============================================================
-- Test 10. Duplicate archive attempt raises exception
-- ============================================================
RESET ROLE;
SET ROLE authenticated;
SELECT tests.set_jwt('33333333-3333-3333-3333-333333333333', 'front_desk', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT throws_ok(
  $$SELECT public.archive_lead(
    'aaaaaaaa-0000-0000-0000-000000000002',
    'archive',
    'inactive'::front_desk.archive_reason_type,
    NULL
  )$$,
  'archive_lead: lead aaaaaaaa-0000-0000-0000-000000000002 is already archived',
  'double archive raises exception'
);

SELECT * FROM finish();
ROLLBACK;
