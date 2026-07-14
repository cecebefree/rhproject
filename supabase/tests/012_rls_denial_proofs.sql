-- 012_rls_denial_proofs.sql
BEGIN;
SELECT plan(18);

CREATE SCHEMA IF NOT EXISTS tests;
GRANT USAGE ON SCHEMA tests TO authenticated;

-- Helper: inject JWT claims for a given user
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

-- Helper: try DELETE and return row count (silent RLS = 0)
CREATE OR REPLACE FUNCTION tests.try_delete_suppression(p_profile_id uuid)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE
  v_count int;
BEGIN
  DELETE FROM public.suppression_records WHERE profile_id = p_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- NOTE: rc_office_select must exist (migration 052).
-- Test must fail if 052 is absent -- do NOT create it here.

SET ROLE authenticated;

-- a1: Learner cannot SELECT another learner's consent
SELECT tests.set_jwt('e97e5c3a-1234-4321-abcd-000000000302','learner','e97e5c3a-1234-4321-abcd-000000000001');
SELECT is((SELECT count(*)::int FROM public.consent_records WHERE profile_id='e97e5c3a-1234-4321-abcd-000000000303'),0,'a1: learner cannot SELECT another learner''s consent');

-- a2: Teacher cannot INSERT for another user
SELECT tests.set_jwt('e97e5c3a-1234-4321-abcd-000000000201','teacher','e97e5c3a-1234-4321-abcd-000000000001');
SELECT throws_ok($$INSERT INTO public.consent_records(profile_id,consent_type,consent_given,tenant_id)VALUES('e97e5c3a-1234-4321-abcd-000000000302','research',true,'e97e5c3a-1234-4321-abcd-000000000001')$$,NULL,'a2: teacher cannot INSERT consent for another');

-- a3: Learner cannot SELECT another's suppression
SELECT tests.set_jwt('e97e5c3a-1234-4321-abcd-000000000302','learner','e97e5c3a-1234-4321-abcd-000000000001');
SELECT is((SELECT count(*)::int FROM public.suppression_records WHERE profile_id='e97e5c3a-1234-4321-abcd-000000000303'),0,'a3: learner cannot SELECT another''s suppression');

-- b1: Learner cannot see own draft card
SELECT tests.set_jwt('e97e5c3a-1234-4321-abcd-000000000302','learner','e97e5c3a-1234-4321-abcd-000000000001');
SELECT is((SELECT count(*)::int FROM public.report_cards WHERE student_id='e97e5c3a-1234-4321-abcd-000000000302' AND status='draft'),0,'b1: learner cannot see own draft card');

-- b2: Learner CAN see own visible card
SELECT tests.set_jwt('e97e5c3a-1234-4321-abcd-000000000303','learner','e97e5c3a-1234-4321-abcd-000000000001');
SELECT is((SELECT count(*)::int FROM public.report_cards WHERE student_id='e97e5c3a-1234-4321-abcd-000000000303' AND status='visible'),1,'b2: learner can see own visible card');

-- b3: Teacher cannot release card (teacher_update_own WITH CHECK fails)
SELECT tests.set_jwt('e97e5c3a-1234-4321-abcd-000000000201','teacher','e97e5c3a-1234-4321-abcd-000000000001');
SELECT throws_ok($$UPDATE public.report_cards SET status='released',released_by='e97e5c3a-1234-4321-abcd-000000000201',released_at=now() WHERE id='e97e5c3a-1234-4321-abcd-000000000601'$$,NULL,'b3: teacher cannot release card');

-- b4: Office cannot skip draft->visible (lifecycle trigger blocks)
SELECT tests.set_jwt('e97e5c3a-1234-4321-abcd-000000000102','office','e97e5c3a-1234-4321-abcd-000000000001');
-- rc_office_manage WITH CHECK passes (status=visible) but the lifecycle trigger fires
-- and rejects draft->visible
SELECT throws_ok($$UPDATE public.report_cards SET status='visible',visible_at=now() WHERE id='e97e5c3a-1234-4321-abcd-000000000601'$$,NULL,'b4: office cannot skip draft->visible (trigger)');

-- c1: Learner cannot INSERT suppression (only admin_all permits INSERT)
SELECT tests.set_jwt('e97e5c3a-1234-4321-abcd-000000000302','learner','e97e5c3a-1234-4321-abcd-000000000001');
SELECT throws_ok($$INSERT INTO public.suppression_records(profile_id,suppressed_by,suppression_type,tenant_id)VALUES('e97e5c3a-1234-4321-abcd-000000000302','e97e5c3a-1234-4321-abcd-000000000302','full','e97e5c3a-1234-4321-abcd-000000000001')$$,NULL,'c1: learner cannot INSERT suppression');

-- c2: Teacher cannot DELETE suppression (silent 0 rows via RLS)
SELECT tests.set_jwt('e97e5c3a-1234-4321-abcd-000000000201','teacher','e97e5c3a-1234-4321-abcd-000000000001');
SELECT is(tests.try_delete_suppression('e97e5c3a-1234-4321-abcd-000000000302'),0,'c2: teacher cannot DELETE suppression (0 rows)');

-- d: Cert trigger blocks non-status UPDATE
SELECT tests.set_jwt('e97e5c3a-1234-4321-abcd-000000000101','admin','e97e5c3a-1234-4321-abcd-000000000001');
SELECT throws_ok($$UPDATE public.certificates SET title='Hacked Title' WHERE id='e97e5c3a-1234-4321-abcd-000000000701'$$,NULL,'d: admin non-status UPDATE blocked by cert trigger');

-- e: Consent trigger blocks admin consent_given rewrite
SELECT throws_ok($$UPDATE public.consent_records SET consent_given=false WHERE id='e97e5c3a-1234-4321-abcd-000000000501'$$,NULL,'e: admin consent_given rewrite blocked by consent trigger');

-- f1: Grant
SELECT tests.set_jwt('e97e5c3a-1234-4321-abcd-000000000302','learner','e97e5c3a-1234-4321-abcd-000000000001');
INSERT INTO public.consent_records(id,profile_id,consent_type,consent_given,given_at,ip_address,tenant_id,created_at)VALUES('e97e5c3a-1234-4321-abcd-000000000801','e97e5c3a-1234-4321-abcd-000000000302','research',true,now()-interval'10 days','10.0.0.2','e97e5c3a-1234-4321-abcd-000000000001',now()-interval'10 days');
SELECT ok(true,'f1: grant');

-- f2: Withdraw
INSERT INTO public.consent_records(id,profile_id,consent_type,consent_given,given_at,ip_address,tenant_id,created_at)VALUES('e97e5c3a-1234-4321-abcd-000000000802','e97e5c3a-1234-4321-abcd-000000000302','research',false,now()-interval'5 days','10.0.0.2','e97e5c3a-1234-4321-abcd-000000000001',now()-interval'5 days');
UPDATE public.consent_records SET withdrawn_at=now()-interval'5 days' WHERE id='e97e5c3a-1234-4321-abcd-000000000801';
SELECT ok(true,'f2: withdraw');

-- f3: Re-grant
INSERT INTO public.consent_records(id,profile_id,consent_type,consent_given,given_at,ip_address,tenant_id,created_at)VALUES('e97e5c3a-1234-4321-abcd-000000000803','e97e5c3a-1234-4321-abcd-000000000302','research',true,now(),'10.0.0.2','e97e5c3a-1234-4321-abcd-000000000001',now());
UPDATE public.consent_records SET withdrawn_at=now() WHERE id='e97e5c3a-1234-4321-abcd-000000000802';
SELECT ok(true,'f3: re-grant');

-- f4: Three consent rows exist
SELECT is((SELECT count(*)::int FROM public.consent_records WHERE profile_id='e97e5c3a-1234-4321-abcd-000000000302' AND consent_type='research'),3,'f4: three consent rows (grant,withdraw,re-grant)');

-- f5: Exactly one active row
SELECT is((SELECT count(*)::int FROM public.consent_records WHERE profile_id='e97e5c3a-1234-4321-abcd-000000000302' AND consent_type='research' AND withdrawn_at IS NULL),1,'f5: exactly one active row');

-- f6: Partial unique index is valid
SELECT lives_ok($$SELECT 1 FROM public.consent_records WHERE profile_id='e97e5c3a-1234-4321-abcd-000000000302' AND consent_type='research' AND withdrawn_at IS NULL$$,'f6: partial unique index on active rows');

-- f7: Admin cannot un-withdraw (trigger)
SELECT tests.set_jwt('e97e5c3a-1234-4321-abcd-000000000101','admin','e97e5c3a-1234-4321-abcd-000000000001');
SELECT throws_ok($$UPDATE public.consent_records SET withdrawn_at=NULL WHERE id='e97e5c3a-1234-4321-abcd-000000000801'$$,NULL,'f7: admin cannot un-withdraw (trigger blocks)');

SELECT * FROM finish();
ROLLBACK;
