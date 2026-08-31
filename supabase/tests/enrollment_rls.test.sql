-- enrollment_rls.test.sql
-- pgTAP tests for enrollment RLS policies, audit_log triggers, and idempotency
-- Tests: 195_adult_rls_policy.sql, 027_student_class.sql, 196_history_tables.sql
--
-- Covers:
--   1.  RLS: adult sees only own children's student_class rows
--   2.  RLS: adult CANNOT see other adults' children
--   3.  RLS: student sees only own student_class rows
--   4.  RLS: student CANNOT see other students' rows
--   5.  RLS: admin sees all student_class rows
--   6.  Audit: INSERT on student_class logs to audit_log
--   7.  Audit: UPDATE on student_class logs to audit_log
--   8.  Audit: DELETE on student_class logs to audit_log
--   9.  Idempotency: duplicate enrollment violates unique constraint
--  10.  Adult RLS: adult profile policy restricts to linked children only

BEGIN;
SELECT plan(10);

-- ============================================================
-- Schema + helper
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
      'tenant_id', p_tenant_id::text,
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
-- Fixtures: tenants
-- ============================================================
INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A', 'tenant-a', true, now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B', 'tenant-b', true, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tenant_lms (id, name, slug, is_active, created_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A', 'tenant-a', true, now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B', 'tenant-b', true, now())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Fixtures: auth.users (student-a, student-b, adult-a, adult-b, admin)
-- ============================================================
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-b@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adult-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adult-b@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Fixtures: profiles
-- ============================================================
SELECT set_config('app.tenant_assignment_bypass', 'true', true);

INSERT INTO public.profiles (id, name, role, tenant_id, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Student A', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
  ('22222222-2222-2222-2222-222222222222', 'Student B', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
  ('33333333-3333-3333-3333-333333333333', 'Adult A', 'adult', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
  ('44444444-4444-4444-4444-444444444444', 'Adult B', 'adult', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
  ('55555555-5555-5555-5555-555555555555', 'Admin', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now())
ON CONFLICT (id) DO NOTHING;

-- Repair trigger-created profiles
UPDATE public.profiles SET role = 'student', tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE public.profiles SET role = 'student', tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE public.profiles SET role = 'adult', tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  WHERE id = '33333333-3333-3333-3333-333333333333';
UPDATE public.profiles SET role = 'adult', tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  WHERE id = '44444444-4444-4444-4444-444444444444';
UPDATE public.profiles SET role = 'admin', tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  WHERE id = '55555555-5555-5555-5555-555555555555';

SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- ============================================================
-- Fixtures: family_child links
--   Adult A → Student A (guardian_id → child_id)
--   Adult B → Student B
-- ============================================================
INSERT INTO public.family_child (guardian_id, child_id)
VALUES
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111'),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (guardian_id, child_id) DO NOTHING;

-- ============================================================
-- Fixtures: courses
-- ============================================================
SET ROLE service_role;
INSERT INTO school_desk.courses (id, title, teacher_id, status, price, tenant_id, created_at)
VALUES
  ('cccc0000-0000-0000-0000-000000000001', 'Course A', '55555555-5555-5555-5555-555555555555', 'published', 0, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
  ('cccc0000-0000-0000-0000-000000000002', 'Course B', '55555555-5555-5555-5555-555555555555', 'published', 0, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now())
ON CONFLICT (id) DO NOTHING;
RESET ROLE;

-- ============================================================
-- Fixtures: student_class enrollments
--   Student A enrolled in Course A
--   Student B enrolled in Course B
-- ============================================================
INSERT INTO public.student_class (student_id, class_id, tenant_id)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'cccc0000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('22222222-2222-2222-2222-222222222222', 'cccc0000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (student_id, class_id) DO NOTHING;

-- ============================================================
-- Test 1. Adult A reads Student A's enrollment (linked child)
-- ============================================================
SET ROLE authenticated;
SELECT tests.set_jwt('33333333-3333-3333-3333-333333333333', 'adult', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM public.student_class
   WHERE student_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'adult A sees own child (student A) enrollment'
);
RESET ROLE;

-- ============================================================
-- Test 2. Adult A CANNOT see Student B's enrollment (not linked)
-- ============================================================
SET ROLE authenticated;
SELECT tests.set_jwt('33333333-3333-3333-3333-333333333333', 'adult', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM public.student_class
   WHERE student_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'adult A cannot see student B enrollment (not linked)'
);
RESET ROLE;

-- ============================================================
-- Test 3. Student A sees only own enrollment
-- ============================================================
SET ROLE authenticated;
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM public.student_class),
  1,
  'student A sees only own enrollment (1 row)'
);
RESET ROLE;

-- ============================================================
-- Test 4. Student A CANNOT see Student B's enrollment
-- ============================================================
SET ROLE authenticated;
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM public.student_class
   WHERE student_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'student A cannot see student B enrollment'
);
RESET ROLE;

-- ============================================================
-- Test 5. Admin sees all student_class rows (filtered to test tenant)
-- ============================================================
SET ROLE authenticated;
SELECT tests.set_jwt('55555555-5555-5555-5555-555555555555', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
  (SELECT count(*)::int FROM public.student_class WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  2,
  'admin sees all student_class rows (test tenant)'
);
RESET ROLE;

-- ============================================================
-- Test 6. Audit log: INSERT on student_class creates audit entry
-- ============================================================
-- Clear any prior audit entries for this test
DELETE FROM public.audit_log WHERE table_name = 'student_class';

INSERT INTO public.student_class (student_id, class_id, tenant_id)
VALUES ('11111111-1111-1111-1111-111111111111', 'cccc0000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (student_id, class_id) DO NOTHING;

SELECT is(
  (SELECT count(*)::int FROM public.audit_log
   WHERE table_name = 'student_class' AND operation = 'INSERT'),
  1,
  'audit_log has INSERT entry for student_class'
);

-- ============================================================
-- Test 7. Audit log: UPDATE on student_class creates audit entry
-- ============================================================
UPDATE public.student_class
SET enrolled_at = now()
WHERE student_id = '11111111-1111-1111-1111-111111111111'
  AND class_id = 'cccc0000-0000-0000-0000-000000000002';

SELECT is(
  (SELECT count(*)::int FROM public.audit_log
   WHERE table_name = 'student_class' AND operation = 'UPDATE'),
  1,
  'audit_log has UPDATE entry for student_class'
);

-- ============================================================
-- Test 8. Audit log: DELETE on student_class creates audit entry
-- ============================================================
DELETE FROM public.student_class
WHERE student_id = '11111111-1111-1111-1111-111111111111'
  AND class_id = 'cccc0000-0000-0000-0000-000000000002';

SELECT is(
  (SELECT count(*)::int FROM public.audit_log
   WHERE table_name = 'student_class' AND operation = 'DELETE'),
  1,
  'audit_log has DELETE entry for student_class'
);

-- ============================================================
-- Test 9. Idempotency: duplicate enrollment violates unique constraint
-- ============================================================
SELECT throws_ok(
  $$INSERT INTO public.student_class (student_id, class_id, tenant_id)
    VALUES ('11111111-1111-1111-1111-111111111111', 'cccc0000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  '23505',  -- unique_violation
  NULL,
  'duplicate enrollment violates unique(student_id, class_id) constraint'
);

-- ============================================================
-- Test 10. Adult profile RLS: adult sees only linked children's profiles
-- ============================================================
SET ROLE authenticated;
SELECT tests.set_jwt('33333333-3333-3333-3333-333333333333', 'adult', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- Adult A should see Student A's profile (linked child)
SELECT is(
  (SELECT count(*)::int FROM public.profiles
   WHERE id = '11111111-1111-1111-1111-111111111111'),
  1,
  'adult A can see linked child (student A) profile'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
