-- 063_family_ledger_test.sql
-- RLS denial tests for family-ledger policies (rc_family_select, cert_family_select).
-- R22 compliance: every file has at least one positive-anchor assertion.
-- R22 post-state: lives_ok on state-change ops (UPDATE/DELETE) gets a row-count check.
-- Family role is SELECT-only — no UPDATE/DELETE policies exist, so no
-- lives_ok wrapping is needed. All INSERT/UPDATE/DELETE tests are negative (throws_ok).
BEGIN;
SELECT plan(12);

-- ══════════════════════════════════════════════════════════
-- Fixture notes (from supabase/seed.sql and supabase/tests/):
--   stud1 (ac87ccc1-2186-4c6b-aeb2-dd966032ee0e) is a student in tenant 1
--   fam1 is a family member linked to stud1 via family_child
--   admin is dd000000-0000-0000-0000-0000000000d4 (tenant 1)
--   other_tenant_id = 99999999-9999-9999-9999-999999999999
-- ══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════
-- R22 POSITIVE ANCHOR: family sees linked child's
-- visible report card in own tenant.
-- ═══════════════════════════════════════════════

-- Set up: admin creates a visible report card for stud1
-- (This runs as superuser/reset role to bypass RLS — standard pgTAP fixture pattern)
reset role;
INSERT INTO public.report_cards (student_id, term, subject, grade, status, created_by, released_by, released_at, visible_at, tenant_id)
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

-- Set up: ensure family member is linked to stud1 via family_child
reset role;
INSERT INTO public.family_child (guardian_id, child_id)
VALUES ('ff000000-0000-0000-0000-0000000000f1', 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e')
ON CONFLICT (guardian_id, child_id) DO NOTHING;

-- Set up: ensure family profile has role='family'
reset role;
INSERT INTO public.profiles (id, name, role, tenant_id, registration_status, consent_given)
VALUES (
    'ff000000-0000-0000-0000-0000000000f1',
    'Family One',
    'family',
    '00000000-0000-0000-0000-000000000001',
    'approved',
    true
)
ON CONFLICT (id) DO NOTHING;

-- Set up: ensure auth.users entry for family member
reset role;
INSERT INTO auth.users (id, email, aud, role)
VALUES ('ff000000-0000-0000-0000-0000000000f1', 'fam1@test.local', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- R22 POSITIVE ANCHOR 1: family sees linked child's visible report card
set local role authenticated;
SELECT set_config('request.jwt.claims',
  '{sub:ff000000-0000-0000-0000-0000000000f1,tenant_id:00000000-0000-0000-0000-000000000001,app_metadata:{role:family}}', true);

SELECT is(
  (SELECT count(*)::int FROM public.report_cards
    WHERE student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
      AND status = 'visible'),
  1,
  'R22-POS: family sees linked childs visible report card'
);

-- R22 POSITIVE ANCHOR 2: family sees linked child's issued certificate
reset role;
INSERT INTO public.certificates (user_id, cert_class, title, description, signatory, status, tenant_id)
VALUES (
    'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e',
    'core_subject',
    'Mathematics Certificate',
    'Core subject completion',
    'Head Teacher',
    'issued',
    '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (user_id, cert_class, source_ref) DO NOTHING;

set local role authenticated;
SELECT set_config('request.jwt.claims',
  '{sub:ff000000-0000-0000-0000-0000000000f1,tenant_id:00000000-0000-0000-0000-000000000001,app_metadata:{role:family}}', true);

SELECT is(
  (SELECT count(*)::int FROM public.certificates
    WHERE user_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
      AND status = 'issued'),
  1,
  'R22-POS: family sees linked childs issued certificate'
);

-- ═══════════════════════════════════════════════
-- NEGATIVE: family cannot see DRAFT report cards
-- ═══════════════════════════════════════════════

-- Create a draft report card for the same student
reset role;
INSERT INTO public.report_cards (student_id, term, subject, grade, status, created_by, tenant_id)
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
  '{sub:ff000000-0000-0000-0000-0000000000f1,tenant_id:00000000-0000-0000-0000-000000000001,app_metadata:{role:family}}', true);

SELECT is(
  (SELECT count(*)::int FROM public.report_cards
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
  '{sub:ff000000-0000-0000-0000-0000000000f1,tenant_id:99999999-9999-9999-9999-999999999999,app_metadata:{role:family}}', true);

SELECT is(
  (SELECT count(*)::int FROM public.report_cards
    WHERE student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
      AND status = 'visible'),
  0,
  'family from other tenant sees 0 report cards (tenant isolation)'
);

-- ═══════════════════════════════════════════════
-- NEGATIVE: family INSERT on report_cards is rejected
-- ═══════════════════════════════════════════════

SELECT set_config('request.jwt.claims',
  '{sub:ff000000-0000-0000-0000-0000000000f1,tenant_id:00000000-0000-0000-0000-000000000001,app_metadata:{role:family}}', true);

SELECT throws_ok(
  $$INSERT INTO public.report_cards
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
-- R22: throws_ok with '42501' is sufficient for DML rejection
-- (no state-change to assert, so no lives_ok/post-state needed)
-- ═══════════════════════════════════════════════

SELECT throws_ok(
  $$UPDATE public.report_cards
    SET grade = 'A+'
    WHERE student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
      AND status = 'visible'$$,
  '42501',
  NULL,
  'family UPDATE on report_cards is rejected by RLS'
);

-- ═══════════════════════════════════════════════
-- NEGATIVE: family DELETE on report_cards is rejected
-- ═══════════════════════════════════════════════

SELECT throws_ok(
  $$DELETE FROM public.report_cards
    WHERE student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
      AND status = 'visible'$$,
  '42501',
  NULL,
  'family DELETE on report_cards is rejected by RLS'
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

SELECT throws_ok(
  $$UPDATE public.certificates
    SET title = 'Hacked'
    WHERE user_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'$$,
  '42501',
  NULL,
  'family UPDATE on certificates is rejected by RLS'
);

-- ═══════════════════════════════════════════════
-- NEGATIVE: family DELETE on certificates is rejected
-- ═══════════════════════════════════════════════

SELECT throws_ok(
  $$DELETE FROM public.certificates
    WHERE user_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'$$,
  '42501',
  NULL,
  'family DELETE on certificates is rejected by RLS'
);

-- ═══════════════════════════════════════════════
-- NEGATIVE: student role (not family) cannot use
-- rc_family_select (no family_child link by default)
-- ═══════════════════════════════════════════════

SELECT set_config('request.jwt.claims',
  '{sub:ac87ccc1-2186-4c6b-aeb2-dd966032ee0e,tenant_id:00000000-0000-0000-0000-000000000001,app_metadata:{role:student}}', true);

SELECT is(
  (SELECT count(*)::int FROM public.report_cards
    WHERE status = 'visible'),
  -- student sees own via rc_learner_select_visible, not rc_family_select
  -- fixture only has report_cards where student_id matches the viewing user
  -- student sees 1 visible card (the one for stud1)
  1,
  'student sees own visible report card (rc_learner_select_visible, not rc_family_select)'
);

-- ═══════════════════════════════════════════════
-- CLEANUP: remove test-only fixture rows
-- ═══════════════════════════════════════════════
reset role;
DELETE FROM public.report_cards
WHERE created_by = 'cc000000-0000-0000-0000-0000000000c3'
  AND student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
  AND term = '2026 Term 1';

DELETE FROM public.certificates
WHERE user_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
  AND cert_class = 'core_subject';

DELETE FROM public.family_child
WHERE guardian_id = 'ff000000-0000-0000-0000-0000000000f1'
  AND child_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e';

DELETE FROM public.profiles
WHERE id = 'ff000000-0000-0000-0000-0000000000f1';

DELETE FROM auth.users
WHERE id = 'ff000000-0000-0000-0000-0000000000f1';

SELECT * FROM finish();
ROLLBACK;
