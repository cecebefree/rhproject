-- 063_family_ledger_test.sql
-- RLS denial tests for family-ledger policies (rc_family_select, cert_family_select).
-- R22 compliance: every file has at least one positive-anchor assertion.
-- R22 post-state: lives_ok on state-change ops (UPDATE/DELETE) gets a row-count check.
-- Family role is SELECT-only — no UPDATE/DELETE policies exist, so no
-- lives_ok wrapping is needed. All INSERT/UPDATE/DELETE tests are negative (throws_ok).
BEGIN;
SELECT plan(16);

-- ══════════════════════════════════════════════════════════
-- Fixture notes (from supabase/seed.sql and supabase/tests/):
--   stud1 (ac87ccc1-2186-4c6b-aeb2-dd966032ee0e) is a student in tenant 1
--   fam1 is a family member linked to stud1 via family_child
--   admin is dd000000-0000-0000-0000-0000000000d4 (tenant 1)
--   other_tenant_id = 99999999-9999-9999-9999-999999999999
-- ══════════════════════════════════════════════════════════

-- FIXTURE SETUP: tenants, auth.users, profiles, family_child, report_cards, certificates
INSERT INTO public.tenant_lms (id, name, slug, is_active, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Tenant 1', 't1', true, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Tenant 1', 't1', true, now())
ON CONFLICT (id) DO NOTHING;

-- Insert auth.users for student, teacher, admin, family
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student@063.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('cc000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher@063.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('dd000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@063.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('ff000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fam1@063.test', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Update profiles
SELECT set_config('app.tenant_assignment_bypass', 'true', false);
UPDATE public.profiles SET role = 'teacher', tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'cc000000-0000-0000-0000-0000000000c3';
UPDATE public.profiles SET role = 'admin', tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'dd000000-0000-0000-0000-0000000000d4';
UPDATE public.profiles SET role = 'family', registration_status = 'approved', consent_given = true, tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'ff000000-0000-0000-0000-0000000000f1';
UPDATE public.profiles SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e';
SELECT set_config('app.tenant_assignment_bypass', 'false', false);

-- Link family member -> child
INSERT INTO public.family_child (guardian_id, child_id)
VALUES ('ff000000-0000-0000-0000-0000000000f1', 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e')
ON CONFLICT (guardian_id, child_id) DO NOTHING;

-- Create visible report card for stud1
INSERT INTO school_desk.report_cards (student_id, term, subject, grade, status, created_by, released_by, released_at, visible_at, tenant_id)
VALUES (
    'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e',
    '2026 Term 1',
    'Mathematics',
    'A',
    'visible',
    'cc000000-0000-0000-0000-0000000000c3',
    'dd000000-0000-0000-0000-0000000000d4',
    now(),
    now(),
    '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (student_id, term, subject) DO NOTHING;

-- Create issued certificate for stud1
INSERT INTO public.certificates (user_id, cert_class, title, description, signatory, status, tenant_id)
VALUES (
    'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e',
    'core_subject',
    'Mathematics Certificate (063)',
    'Core subject completion',
    'Head Teacher',
    'issued',
    '00000000-0000-0000-0000-000000000001'
);


-- R22 POSITIVE ANCHOR 1: family sees linked child's visible report card
set local role authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"ff000000-0000-0000-0000-0000000000f1","role":"authenticated","app_metadata":{"role":"family","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

SELECT is(
  (SELECT count(*)::int FROM school_desk.report_cards
    WHERE student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
      AND status = 'visible'),
  1,
  'R22-POS: family sees linked childs visible report card'
);

-- R22 POSITIVE ANCHOR 2: family sees linked child's issued certificate
set local role authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"ff000000-0000-0000-0000-0000000000f1","role":"authenticated","app_metadata":{"role":"family","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

SELECT is(
  (SELECT count(*)::int FROM public.certificates
    WHERE user_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
      AND status = 'issued'
      AND title = 'Mathematics Certificate (063)'),
  1,
  'R22-POS: family sees linked childs issued certificate'
);

-- ═══════════════════════════════════════════════
-- NEGATIVE: family cannot see DRAFT report cards
-- ═══════════════════════════════════════════════

-- Create a draft report card for the same student
reset role;
INSERT INTO school_desk.report_cards (student_id, term, subject, grade, status, created_by, tenant_id)
VALUES (
    'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e',
    '2026 Term 1',
    'English',
    'B',
    'draft',
    'cc000000-0000-0000-0000-0000000000c3',
    '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (student_id, term, subject) DO NOTHING;

set local role authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"ff000000-0000-0000-0000-0000000000f1","role":"authenticated","app_metadata":{"role":"family","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

SELECT is(
  (SELECT count(*)::int FROM school_desk.report_cards
    WHERE student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
      AND status = 'draft'),
  0,
  'family cannot see draft report cards'
);

-- ═══════════════════════════════════════════════
-- NEGATIVE: family cannot see report cards for
-- unlinked child (different tenant)
-- ═══════════════════════════════════════════════

SELECT set_config('request.jwt.claims',
  '{"sub":"ff000000-0000-0000-0000-0000000000f1","role":"authenticated","app_metadata":{"role":"family","tenant_id":"99999999-9999-9999-9999-999999999999"}}', true);

SELECT is(
  (SELECT count(*)::int FROM school_desk.report_cards
    WHERE student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
      AND status = 'visible'),
  0,
  'family from other tenant sees 0 report cards (tenant isolation)'
);

-- ═══════════════════════════════════════════════
-- NEGATIVE: family INSERT on report_cards is rejected
-- ═══════════════════════════════════════════════

SELECT set_config('request.jwt.claims',
  '{"sub":"ff000000-0000-0000-0000-0000000000f1","role":"authenticated","app_metadata":{"role":"family","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

SELECT throws_ok(
  $$INSERT INTO school_desk.report_cards
    (student_id, term, subject, grade, status, created_by, tenant_id)
  VALUES
    ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e',
     '2026 Term 2',
     'Science',
     'A',
     'draft',
     'ff000000-0000-0000-0000-0000000000f1',
     '00000000-0000-0000-0000-000000000001')$$,
  '42501',
  NULL,
  'family INSERT on report_cards is rejected by RLS'
);

-- ═══════════════════════════════════════════════
-- NEGATIVE: family UPDATE on report_cards is rejected
-- ═══════════════════════════════════════════════

SELECT lives_ok(
  $$UPDATE school_desk.report_cards
    SET grade = 'A+'
    WHERE student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
      AND status = 'visible'$$,
  'family UPDATE on report_cards blocked by RLS (0 rows, no error)'
);

SELECT is(
  (SELECT grade FROM school_desk.report_cards
    WHERE student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
      AND status = 'visible' LIMIT 1),
  'A',
  'grade unchanged after family UPDATE attempt'
);

-- ═══════════════════════════════════════════════
-- NEGATIVE: family DELETE on report_cards is rejected
-- ═══════════════════════════════════════════════

SELECT throws_ok(
  $$DELETE FROM school_desk.report_cards
    WHERE student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
      AND status = 'visible'$$,
  '42501',
  NULL,
  'family DELETE on report_cards blocked by grant revocation (permission denied)'
);

SELECT is(
  (SELECT count(*)::int FROM school_desk.report_cards
    WHERE student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
      AND status = 'visible'),
  1,
  'report card still exists after family DELETE attempt'
);

-- ═══════════════════════════════════════════════
-- NEGATIVE: family INSERT on certificates is rejected
-- ═══════════════════════════════════════════════

SELECT throws_ok(
  $$INSERT INTO public.certificates
    (user_id, cert_class, title, signatory, status, tenant_id)
  VALUES
    ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e',
     'core_subject',
     'Test Cert',
     'Test Signatory',
     'issued',
     '00000000-0000-0000-0000-000000000001')$$,
  '42501',
  NULL,
  'family INSERT on certificates is rejected by RLS'
);

-- ═══════════════════════════════════════════════
-- NEGATIVE: family UPDATE on certificates is rejected
-- ═══════════════════════════════════════════════

SELECT lives_ok(
  $$UPDATE public.certificates
    SET title = 'Hacked'
    WHERE user_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'$$,
  'family UPDATE on certificates blocked by RLS (0 rows, no error)'
);

SELECT is(
  (SELECT count(*)::int FROM public.certificates
    WHERE user_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
      AND title = 'Hacked'),
  0,
  'no certificate row was modified by family UPDATE attempt'
);

-- ═══════════════════════════════════════════════
-- NEGATIVE: family DELETE on certificates is rejected
-- ═══════════════════════════════════════════════

SELECT throws_ok(
  $$DELETE FROM public.certificates
    WHERE user_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'$$,
  '42501',
  NULL,
  'family DELETE on certificates blocked by grant revocation (permission denied)'
);

SELECT is(
  (SELECT count(*)::int FROM public.certificates
    WHERE user_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
      AND title = 'Mathematics Certificate (063)'),
  1,
  'certificate still exists after family DELETE attempt'
);

-- ═══════════════════════════════════════════════
-- NEGATIVE: student role (not family) cannot use
-- rc_family_select (no family_child link by default)
-- ═══════════════════════════════════════════════

SELECT set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

SELECT is(
  (SELECT count(*)::int FROM school_desk.report_cards
    WHERE status = 'visible'),
  -- student sees own via rc_learner_select_visible, not rc_family_select
  -- fixture only has report_cards where student_id matches the viewing user
  -- student sees 1 visible card (the one for stud1)
  1,
  'student sees own visible report card (rc_learner_select_visible, not rc_family_select)'
);

SELECT is(
  (SELECT subject::text FROM school_desk.report_cards
    WHERE status = 'visible' LIMIT 1),
  'Mathematics',
  'student sees correct subject of own visible report card (R22 positive-visibility)'
);

-- ═══════════════════════════════════════════════
-- CLEANUP: remove test-only fixture rows
-- ═══════════════════════════════════════════════
reset role;
DELETE FROM school_desk.report_cards
WHERE created_by = 'cc000000-0000-0000-0000-0000000000c3'
  AND student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
  AND term = '2026 Term 1';

DELETE FROM public.certificates
WHERE user_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
  AND title = 'Mathematics Certificate (063)';

DELETE FROM public.family_child
WHERE guardian_id = 'ff000000-0000-0000-0000-0000000000f1'
  AND child_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e';

DELETE FROM public.profiles
WHERE id = 'ff000000-0000-0000-0000-0000000000f1';

DELETE FROM auth.users
WHERE id = 'ff000000-0000-0000-0000-0000000000f1';

SELECT * FROM finish();
ROLLBACK;
