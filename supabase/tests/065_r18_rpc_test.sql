-- 065_r18_rpc_test.sql — R18 RPC acceptance criteria (REWRITTEN)
-- Per ruling: office-loaded, read-only in app; teachers have NO write path.
-- Office can create drafts; teachers/students/parents are DENIED.
-- Dependencies: seed.sql applied, migration 065 + 093 applied
BEGIN;
SELECT plan(13);

-- Grab seed user IDs as constants
-- stud1: 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e' (role=student)
-- teacher1: 'cc000000-0000-0000-0000-0000000000c3' (role=teacher)
-- admin: 'dd000000-0000-0000-0000-0000000000d4' (role=admin)
-- family: 'a0000000-0000-0000-0000-0000000000a1' (role=family)

-- Fixture bypass per seed.sql pattern (057 blocks direct tenant_id writes)
SELECT set_config('app.tenant_assignment_bypass', 'true', false);

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
    ON CONFLICT (id) DO UPDATE SET role = excluded.role, tenant_id = excluded.tenant_id;
  END IF;
END;
$$;

-- Seed a second-tenant office user (cross-tenant isolation tests)
DO LANGUAGE plpgsql $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000fe') THEN
    INSERT INTO auth.users (id, email, aud, role)
    VALUES ('00000000-0000-0000-0000-0000000000fe', 'office2@test.local', 'authenticated', 'authenticated')
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, name, role, registration_status, consent_given, tenant_id)
    VALUES ('00000000-0000-0000-0000-0000000000fe', 'Test Office 2', 'office', 'approved', true,
            '00000000-0000-0000-0000-000000000002')
    ON CONFLICT (id) DO UPDATE SET role = excluded.role, tenant_id = excluded.tenant_id;
  END IF;
END;
$$;

-- Create a teacher test user if not present (for DENY tests)
DO LANGUAGE plpgsql $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = 'cc000000-0000-0000-0000-0000000000c3') THEN
    INSERT INTO auth.users (id, email, aud, role)
    VALUES ('cc000000-0000-0000-0000-0000000000c3', 'teacher@test.local', 'authenticated', 'authenticated')
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, name, role, registration_status, consent_given, tenant_id)
    VALUES ('cc000000-0000-0000-0000-0000000000c3', 'Test Teacher', 'teacher', 'approved', true,
            '00000000-0000-0000-0000-000000000001')
    ON CONFLICT (id) DO UPDATE SET role = excluded.role, tenant_id = excluded.tenant_id;
  END IF;
END;
$$;

-- Create student fixture (required for FK on report_cards.student_id)
DO LANGUAGE plpgsql $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e') THEN
    INSERT INTO auth.users (id, email, aud, role)
    VALUES ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', 'student@test.local', 'authenticated', 'authenticated')
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, name, role, registration_status, consent_given, tenant_id)
    VALUES ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', 'Test Student', 'learner', 'approved', true,
            '00000000-0000-0000-0000-000000000001')
    ON CONFLICT (id) DO UPDATE SET role = excluded.role, tenant_id = excluded.tenant_id;
  END IF;
END;
$$;

SELECT set_config('app.tenant_assignment_bypass', 'false', false);

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

-- AC-1: Office creates draft report card (ALLOW)
SELECT tests.set_jwt('00000000-0000-0000-0000-0000000000ff','office','00000000-0000-0000-0000-000000000001');
SELECT is(
  (SELECT status FROM public.create_draft_report_card(
    'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e',
    '2026 Term 2',
    'Science',
    'B'
  )),
  'draft',
  'AC-1: office creates draft report card'
);

-- Verify draft exists and capture ID (must be done before role switch)
SELECT is(
  (SELECT count(*)::int FROM public.report_cards
   WHERE student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
     AND status = 'draft'
     AND term = '2026 Term 2'),
  1,
  'AC-1b: draft row exists in report_cards'
);

-- Capture draft card ID (office role can see draft via rc_office_select)
SELECT id INTO TEMP TABLE draft_card FROM public.report_cards
WHERE student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
  AND term = '2026 Term 2'
  AND status = 'draft'
LIMIT 1;

-- AC-1c: Teacher CANNOT create draft (DENY per ruling)
SELECT tests.set_jwt('cc000000-0000-0000-0000-0000000000c3','teacher','00000000-0000-0000-0000-000000000001');
SELECT throws_ok(
  'SELECT public.create_draft_report_card(''ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'', ''2026 Term 2'', ''Math'', ''A'')',
  'Only office desk can create draft report cards',
  'AC-1c: teacher create denied (report-card ruling: teachers have NO write path)'
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

SELECT throws_ok(
  format('SELECT public.release_report_card(''%s'')', (SELECT id FROM draft_card)),
  'Only Office Desk can release report cards',
  'AC-5: teacher release rejected by RPC role check'
);

-- AC-6: Cross-tenant office cannot release card in another tenant
SELECT tests.set_jwt('00000000-0000-0000-0000-0000000000fe','office','00000000-0000-0000-0000-000000000002');
SELECT throws_ok(
  format('SELECT public.release_report_card(''%s'')', (SELECT id FROM draft_card)),
  'Report card not found or not accessible',
  'AC-6: cross-tenant office release rejected by tenant guard'
);

-- AC-7: Card state unchanged after cross-tenant attempt
-- Switch back to office role to query the card (cross-tenant JWT blocks RLS)
SELECT tests.set_jwt('00000000-0000-0000-0000-0000000000ff','office','00000000-0000-0000-0000-000000000001');
SELECT is(
  (SELECT status FROM public.report_cards WHERE id = (SELECT id FROM draft_card)),
  'draft',
  'AC-7: card remains in draft after cross-tenant release attempt'
);

-- AC-8: No existence oracle — identical error for missing and cross-tenant cards
SELECT tests.set_jwt('00000000-0000-0000-0000-0000000000fe','office','00000000-0000-0000-0000-000000000002');
SELECT throws_ok(
  'SELECT public.release_report_card(''00000000-0000-0000-0000-000000000000'')',
  'Report card not found or not accessible',
  'AC-8: nonexistent card returns same error as cross-tenant (no existence oracle)'
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

-- AC-9: Double-release guard — card already visible, cannot release again
SELECT tests.set_jwt('00000000-0000-0000-0000-0000000000ff','office','00000000-0000-0000-0000-000000000001');
SELECT throws_ok(
  format('SELECT public.release_report_card(''%s'')', (SELECT id FROM draft_card)),
  'Report card not in draft status',
  'AC-9: double-release rejected (card already visible)'
);

DROP TABLE IF EXISTS draft_card;
SELECT * FROM finish();
ROLLBACK;
