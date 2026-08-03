-- 045_seed_data.sql (ITEM 13)
-- Seed: role expansion + demo families for the 4-role RBAC.
-- PREDECESSOR: 044_rls_for_042_043.sql
BEGIN;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN (
        'student', 'outside_student', 'family', 'alumni',
        'teacher', 'expert', 'guest', 'admin',
        'learner', 'office'
    ));

INSERT INTO public.tenant_mobile (id, name, slug, created_at)
VALUES ('e97e5c3a-1234-4321-abcd-000000000001', 'Redhouse Prep', 'demo', now())
ON CONFLICT (id) DO NOTHING;

-- Also insert tenant_devotional (profiles.tenant_id FK references tenant_devotional)
INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at)
VALUES ('e97e5c3a-1234-4321-abcd-000000000001', 'Redhouse Prep', 'demo', true, now())
ON CONFLICT (id) DO NOTHING;


-- 3. DEMO PROFILES (8 users, 4 roles)
-- Must insert into auth.users first (profiles FK references auth.users)
-- handle_new_user trigger auto-creates profiles row; we then UPDATE it.
DO $$
DECLARE
  uuids uuid[] := ARRAY[
    'e97e5c3a-1234-4321-abcd-000000000101',
    'e97e5c3a-1234-4321-abcd-000000000102',
    'e97e5c3a-1234-4321-abcd-000000000201',
    'e97e5c3a-1234-4321-abcd-000000000202',
    'e97e5c3a-1234-4321-abcd-000000000301',
    'e97e5c3a-1234-4321-abcd-000000000302',
    'e97e5c3a-1234-4321-abcd-000000000303',
    'e97e5c3a-1234-4321-abcd-000000000402'
  ];
  email_prefix text[] := ARRAY['admin','office','teacher1','teacher2','parent1','learner1','learner2','learner3'];
  i int;
BEGIN
  FOR i IN 1..array_length(uuids, 1) LOOP
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
    VALUES (uuids[i], '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated',
            email_prefix[i] || '@demo.redhouse',
            extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), now())
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END;
$$;

UPDATE public.profiles SET name = 'Aria Admin',    role = 'admin',   tenant_id = 'e97e5c3a-1234-4321-abcd-000000000001', registration_status = 'approved', consent_given = true WHERE id = 'e97e5c3a-1234-4321-abcd-000000000101';
UPDATE public.profiles SET name = 'Oliver Office', role = 'office',  tenant_id = 'e97e5c3a-1234-4321-abcd-000000000001', registration_status = 'approved', consent_given = true WHERE id = 'e97e5c3a-1234-4321-abcd-000000000102';
UPDATE public.profiles SET name = 'Tara Teacher',  role = 'teacher', tenant_id = 'e97e5c3a-1234-4321-abcd-000000000001', registration_status = 'approved', consent_given = true WHERE id = 'e97e5c3a-1234-4321-abcd-000000000201';
UPDATE public.profiles SET name = 'Tom Teacher',   role = 'teacher', tenant_id = 'e97e5c3a-1234-4321-abcd-000000000001', registration_status = 'approved', consent_given = true WHERE id = 'e97e5c3a-1234-4321-abcd-000000000202';
UPDATE public.profiles SET name = 'Maya Parent',   role = 'family',  tenant_id = 'e97e5c3a-1234-4321-abcd-000000000001', registration_status = 'approved', consent_given = true WHERE id = 'e97e5c3a-1234-4321-abcd-000000000301';
UPDATE public.profiles SET name = 'Leo Learner',   role = 'learner', tenant_id = 'e97e5c3a-1234-4321-abcd-000000000001', registration_status = 'approved', consent_given = true WHERE id = 'e97e5c3a-1234-4321-abcd-000000000302';
UPDATE public.profiles SET name = 'Luna Learner',  role = 'learner', tenant_id = 'e97e5c3a-1234-4321-abcd-000000000001', registration_status = 'approved', consent_given = true WHERE id = 'e97e5c3a-1234-4321-abcd-000000000303';
UPDATE public.profiles SET name = 'Pip Learner',   role = 'learner', tenant_id = 'e97e5c3a-1234-4321-abcd-000000000001', registration_status = 'approved', consent_given = true WHERE id = 'e97e5c3a-1234-4321-abcd-000000000402';

INSERT INTO public.consent_records (id, profile_id, consent_type, consent_given, given_at, ip_address, tenant_id, created_at, withdrawn_at) VALUES
('e97e5c3a-1234-4321-abcd-000000000501', 'e97e5c3a-1234-4321-abcd-000000000302', 'data_processing', true,  now() - interval '30 days', '192.168.1.1', 'e97e5c3a-1234-4321-abcd-000000000001', now(), NULL),
('e97e5c3a-1234-4321-abcd-000000000502', 'e97e5c3a-1234-4321-abcd-000000000302', 'marketing',        true,  now() - interval '20 days', '192.168.1.1', 'e97e5c3a-1234-4321-abcd-000000000001', now() - interval '20 days', now() - interval '10 days'),
('e97e5c3a-1234-4321-abcd-000000000503', 'e97e5c3a-1234-4321-abcd-000000000302', 'communications',   true,  now() - interval '5 days',  '192.168.1.1', 'e97e5c3a-1234-4321-abcd-000000000001', now() - interval '5 days', NULL),
('e97e5c3a-1234-4321-abcd-000000000504', 'e97e5c3a-1234-4321-abcd-000000000303', 'data_processing',  true,  now() - interval '30 days', '10.0.0.1',    'e97e5c3a-1234-4321-abcd-000000000001', now(), NULL),
('e97e5c3a-1234-4321-abcd-000000000505', 'e97e5c3a-1234-4321-abcd-000000000303', 'marketing',        true,  now() - interval '30 days', '10.0.0.1',    'e97e5c3a-1234-4321-abcd-000000000001', now(), NULL),
('e97e5c3a-1234-4321-abcd-000000000506', 'e97e5c3a-1234-4321-abcd-000000000303', 'communications',   true,  now() - interval '30 days', '10.0.0.1',    'e97e5c3a-1234-4321-abcd-000000000001', now(), NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.report_cards (id, student_id, term, subject, grade, status, created_by, released_by, released_at, visible_at, tenant_id, created_at) VALUES
('e97e5c3a-1234-4321-abcd-000000000601', 'e97e5c3a-1234-4321-abcd-000000000302', 'Summer 2026', 'Biology',    NULL, 'draft',    'e97e5c3a-1234-4321-abcd-000000000201', NULL, NULL, NULL, 'e97e5c3a-1234-4321-abcd-000000000001', now()),
('e97e5c3a-1234-4321-abcd-000000000602', 'e97e5c3a-1234-4321-abcd-000000000302', 'Summer 2026', 'Mathematics', 'A-', 'released', 'e97e5c3a-1234-4321-abcd-000000000201', 'e97e5c3a-1234-4321-abcd-000000000102', now() - interval '1 day', NULL, 'e97e5c3a-1234-4321-abcd-000000000001', now() - interval '3 days'),
('e97e5c3a-1234-4321-abcd-000000000603', 'e97e5c3a-1234-4321-abcd-000000000303', 'Summer 2026', 'Science',    'A',  'visible',  'e97e5c3a-1234-4321-abcd-000000000201', 'e97e5c3a-1234-4321-abcd-000000000102', now() - interval '5 days', now() - interval '2 days', 'e97e5c3a-1234-4321-abcd-000000000001', now() - interval '7 days'),
('e97e5c3a-1234-4321-abcd-000000000604', 'e97e5c3a-1234-4321-abcd-000000000402', 'Summer 2026', 'English',    NULL, 'draft',    'e97e5c3a-1234-4321-abcd-000000000202', NULL, NULL, NULL, 'e97e5c3a-1234-4321-abcd-000000000001', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.certificates (id, user_id, cert_class, title, description, source_ref, issued_at, signatory, file_url, status, tenant_id, created_at) VALUES
('e97e5c3a-1234-4321-abcd-000000000701', 'e97e5c3a-1234-4321-abcd-000000000303', 'core_subject',    'Science (Summer 2026)',              'Outstanding performance in Science', 'e97e5c3a-1234-4321-abcd-000000000603', now() - interval '1 day',  'Aria Admin', NULL, 'issued', 'e97e5c3a-1234-4321-abcd-000000000001', now()),
('e97e5c3a-1234-4321-abcd-000000000702', 'e97e5c3a-1234-4321-abcd-000000000302', 'year_completion', 'Year 7 Completion (Spring 2026)', 'Successfully completed Year 7',       NULL,                                      now() - interval '60 days', 'Aria Admin', NULL, 'issued', 'e97e5c3a-1234-4321-abcd-000000000001', now())
ON CONFLICT (id) DO NOTHING;

COMMIT;
