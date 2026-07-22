-- 065_r18_rpc_test.sql — R18 RPC acceptance criteria
-- Dependencies: seed.sql applied, migration 065 applied
BEGIN;
SELECT plan(8);

-- Grab seed user IDs as constants
-- stud1: 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e' (role=student)
-- teacher1: 'cc000000-0000-0000-0000-0000000000c3' (role=teacher)
-- admin: 'dd000000-0000-0000-0000-0000000000d4' (role=admin)
-- family: 'a0000000-0000-0000-0000-0000000000a1' (role=family)

DO LANGUAGE plpgsql $$
BEGIN
  -- Create an office test user if not present
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000ff') THEN
    INSERT INTO auth.users (id, email, aud, role)
    VALUES ('00000000-0000-0000-0000-0000000000ff', 'office@test.local', 'authenticated', 'authenticated')
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, name, role, registration_status, consent_given, tenant_id)
    VALUES ('00000000-0000-0000-0000-0000000000ff', 'Test Office', 'office', 'approved', true,
            '00000000-0000-0000-0000-000000000001')
    ON CONFLICT (id) DO UPDATE SET role = 'office';
  END IF;
END;
$$;

CREATE SCHEMA IF NOT EXISTS tests;
GRANT USAGE ON SCHEMA tests TO authenticated;

-- JWT helper (same as 012)
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

-- ─────────────────────────────────────────────
SET ROLE authenticated;

-- AC-1: Teacher creates draft report card
SELECT tests.set_jwt('cc000000-0000-0000-0000-0000000000c3','teacher','00000000-0000-0000-0000-000000000001');
SELECT is(
  (SELECT status FROM public.create_draft_report_card(
    'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e',
    '2026 Term 2',
    'Science',
    'B'
  )),
  'draft',
  'AC-1: teacher creates draft report card'
);

-- Verify draft exists
SELECT is(
  (SELECT count(*)::int FROM public.report_cards
   WHERE student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
     AND status = 'draft'
     AND term = '2026 Term 2'),
  1,
  'AC-1b: draft row exists in report_cards'
);

-- AC-4: Learner cannot see draft card (before release)
SELECT tests.set_jwt('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e','student','00000000-0000-0000-0000-000000000001');
SELECT is(
  (SELECT count(*)::int FROM public.report_cards
   WHERE student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
     AND status = 'draft'
     AND term = '2026 Term 2'),
  0,
  'AC-4: learner sees zero draft rows (RLS blocks status=draft)'
);

-- AC-5: Teacher cannot release (non-office caller rejected by RPC)
SELECT tests.set_jwt('cc000000-0000-0000-0000-0000000000c3','teacher','00000000-0000-0000-0000-000000000001');

-- Get the draft card id
SELECT id INTO TEMP TABLE draft_card FROM public.report_cards
WHERE student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
  AND term = '2026 Term 2'
  AND status = 'draft'
LIMIT 1;

SELECT throws_ok(
  format('SELECT public.release_report_card(''%s'')', (SELECT id FROM draft_card)),
  'Only Office Desk can release report cards',
  'AC-5: teacher release rejected by RPC role check'
);

-- AC-2: Office releases the card (one tx, stamps released_at, lands on visible)
SELECT tests.set_jwt('00000000-0000-0000-0000-0000000000ff','office','00000000-0000-0000-0000-000000000001');

SELECT is(
  (SELECT status FROM public.release_report_card((SELECT id FROM draft_card))),
  'visible',
  'AC-2a: office release returns status=visible'
);

SELECT is(
  (SELECT released_at IS NOT NULL FROM public.report_cards WHERE id = (SELECT id FROM draft_card)),
  true,
  'AC-2b: released_at is stamped'
);

SELECT is(
  (SELECT released_by FROM public.report_cards WHERE id = (SELECT id FROM draft_card)),
  '00000000-0000-0000-0000-0000000000ff',
  'AC-2c: released_by matches office caller'
);

-- AC-3: Learner sees the released (visible) card
SELECT tests.set_jwt('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e','student','00000000-0000-0000-0000-000000000001');
SELECT is(
  (SELECT count(*)::int FROM public.report_cards
   WHERE student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
     AND status = 'visible'
     AND term = '2026 Term 2'),
  1,
  'AC-3: learner sees visible card after release'
);

DROP TABLE IF EXISTS draft_card;
SELECT * FROM finish();
ROLLBACK;
