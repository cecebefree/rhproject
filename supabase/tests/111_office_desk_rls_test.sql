-- 111_office_desk_rls_test.sql
-- pgTAP tests for Office Desk RLS + cross-desk reporting.
-- Tests: tenant isolation, role gate, cross-desk read, write rejection,
--        reporting functions, audit trail.
--
-- PREDECESSOR: 111_office_desk_rls_and_reporting.sql

BEGIN;
SELECT plan(10);

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
-- Fixtures: two tenants, office + admin + teacher profiles
-- ============================================================
INSERT INTO public.tenant_lms (id, name, slug)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A', 'tenant-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B', 'tenant-b')
ON CONFLICT (id) DO NOTHING;

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
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'office-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'office-b@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- The handle_new_user trigger creates profiles with role='student' on auth.users INSERT.
-- We must UPDATE to the correct role after the trigger fires.
-- Use tenant_assignment_bypass to update immutable tenant_id.
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
UPDATE public.profiles SET role = 'office',   tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE public.profiles SET role = 'office',   tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE public.profiles SET role = 'admin',    tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' WHERE id = '33333333-3333-3333-3333-333333333333';
UPDATE public.profiles SET role = 'teacher',  tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' WHERE id = '44444444-4444-4444-4444-444444444444';
SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- Lead in tenant A
SET ROLE service_role;
INSERT INTO front_desk.leads (id, tenant_id, name, email, status)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lead A', 'lead-a@test.com', 'enquiry')
ON CONFLICT (id) DO NOTHING;

-- Lead in tenant B
INSERT INTO front_desk.leads (id, tenant_id, name, email, status)
VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Lead B', 'lead-b@test.com', 'enquiry')
ON CONFLICT (id) DO NOTHING;

-- Registration + invoice + payment in tenant A
INSERT INTO office_desk.registrations (id, tenant_id, lead_reference_id, student_name, student_email, status)
VALUES ('aaaaaaaa-0000-0000-0000-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-000000000001', 'Student A', 's-a@test.com', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO office_desk.invoices (id, tenant_id, registration_id, amount, status)
VALUES ('aaaaaaaa-0000-0000-0000-000000000020', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-000000000010', 1500.00, 'paid')
ON CONFLICT (id) DO NOTHING;

INSERT INTO office_desk.payments (id, tenant_id, invoice_id, amount, status, paid_at)
VALUES ('aaaaaaaa-0000-0000-0000-000000000030', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-000000000020', 1500.00, 'confirmed', now())
ON CONFLICT (id) DO NOTHING;

-- Registration in tenant B
INSERT INTO office_desk.registrations (id, tenant_id, lead_reference_id, student_name, student_email, status)
VALUES ('bbbbbbbb-0000-0000-0000-000000000010', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-0000-0000-0000-000000000001', 'Student B', 's-b@test.com', 'active')
ON CONFLICT (id) DO NOTHING;
RESET ROLE;

-- ============================================================
-- Test 1. Office A sees own tenant registrations
-- ============================================================
SET ROLE authenticated;
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'office', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM office_desk.registrations),
  1,
  'office A sees own tenant registrations'
);

-- ============================================================
-- Test 2. Office A cannot see tenant B registrations
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM office_desk.registrations
    WHERE tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'office A cannot see tenant B registrations'
);

-- ============================================================
-- Test 3. Office A sees own tenant invoices
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM office_desk.invoices),
  1,
  'office A sees own tenant invoices'
);

-- ============================================================
-- Test 4. Office A sees own tenant payments
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM office_desk.payments),
  1,
  'office A sees own tenant payments'
);

-- ============================================================
-- Test 5. Teacher role CANNOT SELECT office_desk tables
-- ============================================================
SELECT tests.set_jwt('44444444-4444-4444-4444-444444444444', 'teacher', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM office_desk.registrations),
  0,
  'teacher cannot see office_desk registrations (role gate)'
);

-- ============================================================
-- Test 6. Office A can read leads (cross-desk, via 106 §5)
-- ============================================================
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'office', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM front_desk.leads),
  1,
  'office A can read own tenant leads (cross-desk)'
);

-- ============================================================
-- Test 7. Office A cannot see tenant B leads
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM front_desk.leads
    WHERE tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'office A cannot see tenant B leads (cross-desk tenant isolation)'
);

-- ============================================================
-- Test 8. Office CANNOT INSERT into office_desk (reporting only)
-- ============================================================
SELECT throws_ok(
  $$INSERT INTO office_desk.registrations (tenant_id, student_name, student_email, status)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test', 't@test.com', 'pending_init')$$,
  '42501',
  NULL,
  'office INSERT on registrations denied (reporting only)'
);

-- ============================================================
-- Test 9. Admin can still read office_desk (admin bypass preserved)
-- ============================================================
SELECT tests.set_jwt('33333333-3333-3333-3333-333333333333', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM office_desk.registrations),
  1,
  'admin can still read office_desk registrations (admin bypass)'
);

-- ============================================================
-- Test 10. Reporting function returns correct pipeline data
-- ============================================================
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'office', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM public.get_lead_pipeline()),
  1,
  'get_lead_pipeline returns 1 lead for tenant A'
);

SELECT * FROM finish();
ROLLBACK;
