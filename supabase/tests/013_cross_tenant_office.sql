-- 013_cross_tenant_office.sql
-- Proves office user in tenant A cannot read/update tenant B report_cards.
BEGIN;
SELECT plan(4);

CREATE SCHEMA IF NOT EXISTS tests;
GRANT USAGE ON SCHEMA tests TO authenticated;

-- Helper: inject JWT claims
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

-- Seed: two tenants (profiles.tenant_id refs tenant_devotional)
INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A', 'tenant-a', true, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B', 'tenant-b', true, now())
ON CONFLICT (id) DO NOTHING;

-- Create auth.users entries
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'office-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'office-b@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'learner-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'learner-b@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Profiles: rows already exist via signup trigger (tenant_id NULL); INSERT below no-ops, tenant assignment happens via bypass beneath.
INSERT INTO public.profiles (id, name, role, tenant_id, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Office A', 'office', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
  ('22222222-2222-2222-2222-222222222222', 'Office B', 'office', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', now()),
  ('33333333-3333-3333-3333-333333333333', 'Teacher A', 'teacher', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
  ('44444444-4444-4444-4444-444444444444', 'Learner A', 'learner', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
  ('55555555-5555-5555-5555-555555555555', 'Learner B', 'learner', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', now())
ON CONFLICT (id) DO NOTHING;
-- Fixture repair (D-013t3): the signup trigger (handle_new_user) pre-creates
-- these profiles with role='student' and tenant_id NULL, so the INSERT above
-- no-ops. Probe finding: trigger default role='student'. Tenant assignment via
-- the sanctioned fixture bypass (same mechanism as seed.sql post-058). Role
-- repair below restores the office/teacher/learner vocabulary. Transaction-local: dies with ROLLBACK.
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
UPDATE public.profiles SET tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  WHERE id IN ('11111111-1111-1111-1111-111111111111',
               '33333333-3333-3333-3333-333333333333',
               '44444444-4444-4444-4444-444444444444')
    AND tenant_id IS NULL;
UPDATE public.profiles SET tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  WHERE id IN ('22222222-2222-2222-2222-222222222222',
               '55555555-5555-5555-5555-555555555555')
    AND tenant_id IS NULL;
UPDATE public.profiles SET role = 'office'
  WHERE id IN ('11111111-1111-1111-1111-111111111111',
               '22222222-2222-2222-2222-222222222222');
UPDATE public.profiles SET role = 'teacher'
  WHERE id = '33333333-3333-3333-3333-333333333333';
UPDATE public.profiles SET role = 'learner'
  WHERE id IN ('44444444-4444-4444-4444-444444444444',
               '55555555-5555-5555-5555-555555555555');
SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- Report card in tenant A (draft)
INSERT INTO public.report_cards (id, student_id, term, subject, status, created_by, tenant_id, created_at)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'Term 1', 'Math', 'draft', '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now())
ON CONFLICT (id) DO NOTHING;

-- Report card in tenant B (draft)
INSERT INTO public.report_cards (id, student_id, term, subject, status, created_by, tenant_id, created_at)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'Term 1', 'Math', 'draft', '33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', now())
ON CONFLICT (id) DO NOTHING;

SET ROLE authenticated;

-- t1: Office A cannot SELECT tenant B report_cards
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111','office','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
    (SELECT count(*)::int FROM public.report_cards
     WHERE tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    0,
    't1: office A sees 0 rows from tenant B report_cards'
);

-- t2: Office A cannot UPDATE tenant B report_cards (0 rows matched)
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111','office','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT is(
    (SELECT count(*)::int FROM public.report_cards
     WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
     AND status = 'visible'
     AND visible_at IS NOT NULL),
    0,
    't2: office A sees 0 updatable rows from tenant B'
);
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111','office','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
-- t3: Office A CAN SELECT own tenant report_cards
SELECT is(
    (SELECT count(*)::int FROM public.report_cards
     WHERE tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    1,
    't3: office A sees own tenant report_cards'
);

-- t4: Office A CAN UPDATE own tenant report_cards (release)
SELECT tests.set_jwt('11111111-1111-1111-1111-111111111111','office','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT lives_ok($$UPDATE public.report_cards
SET status='released', released_by='11111111-1111-1111-1111-111111111111', released_at=now()
WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND status='draft'$$,
't4: office A can release own tenant draft card');

SELECT * FROM finish();
ROLLBACK;
