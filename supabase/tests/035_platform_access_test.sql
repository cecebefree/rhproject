-- 035_platform_access_test.sql
begin;
select plan(4);

-- Fixtures: tenant, auth.users, profiles, platform_access
INSERT INTO public.tenant_lms (id, name, slug, is_active, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Tenant', 'test', true, now())
ON CONFLICT (id) DO NOTHING;

-- Insert users (handle_new_user trigger auto-creates profiles)
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student1@035.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('bb000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student2@035.test', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Update profiles: set tenant_id
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
UPDATE public.profiles SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id IN ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', 'bb000000-0000-0000-0000-0000000000b2');
SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- student1 has core + enrichment access, student2 has only enrichment access
INSERT INTO public.platform_access (user_id, tenant_id, platform)
VALUES ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '00000000-0000-0000-0000-000000000001', 'core'),
       ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '00000000-0000-0000-0000-000000000001', 'enrichment'),
       ('bb000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000001', 'enrichment')
ON CONFLICT (user_id, platform) DO NOTHING;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","tenant_id":"00000000-0000-0000-0000-000000000001","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);
select ok( public.has_platform_access('core'), 'student1 has core open' );
select ok( public.has_platform_access('enrichment'), 'student1 has enrichment open' );
select set_config('request.jwt.claims', '{"sub":"bb000000-0000-0000-0000-0000000000b2","role":"authenticated","tenant_id":"00000000-0000-0000-0000-000000000001","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);
select ok( NOT public.has_platform_access('core'), 'student2 does NOT have core open' );
select ok( public.has_platform_access('enrichment'), 'student2 has enrichment open' );
select * from finish();
rollback;
