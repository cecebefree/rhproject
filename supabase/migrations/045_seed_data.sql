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

INSERT INTO public.tenants (id, name, subdomain, created_at)
VALUES ('e97e5c3a-1234-4321-abcd-000000000001', 'Redhouse Prep', 'demo', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, name, role, tenant_id, registration_status, consent_given, created_at) VALUES
('e97e5c3a-1234-4321-abcd-000000000101', 'Aria Admin',    'admin',   'e97e5c3a-1234-4321-abcd-000000000001', 'approved', true, now()),
('e97e5c3a-1234-4321-abcd-000000000102', 'Oliver Office', 'office',  'e97e5c3a-1234-4321-abcd-000000000001', 'approved', true, now()),
('e97e5c3a-1234-4321-abcd-000000000201', 'Tara Teacher',  'teacher', 'e97e5c3a-1234-4321-abcd-000000000001', 'approved', true, now()),
('e97e5c3a-1234-4321-abcd-000000000202', 'Tom Teacher',   'teacher', 'e97e5c3a-1234-4321-abcd-000000000001', 'approved', true, now()),
('e97e5c3a-1234-4321-abcd-000000000301', 'Maya Parent',   'family',  'e97e5c3a-1234-4321-abcd-000000000001', 'approved', true, now()),
('e97e5c3a-1234-4321-abcd-000000000302', 'Leo Learner',   'learner', 'e97e5c3a-1234-4321-abcd-000000000001', 'approved', true, now()),
('e97e5c3a-1234-4321-abcd-000000000303', 'Luna Learner',  'learner', 'e97e5c3a-1234-4321-abcd-000000000001', 'approved', true, now()),
('e97e5c3a-1234-4321-abcd-000000000402', 'Pip Learner',   'learner', 'e97e5c3a-1234-4321-abcd-000000000001', 'approved', true, now())
ON CONFLICT (id) DO NOTHING;

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
