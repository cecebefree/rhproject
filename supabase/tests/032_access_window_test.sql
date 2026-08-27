-- 032_access_window_test.sql — verifies has_core_access() and has_item_access()
begin;
select plan(4);

-- Fixtures: tenant, auth.users, profiles, courses, enrollments
INSERT INTO public.tenant_lms (id, name, slug, is_active, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Tenant', 'test', true, now())
ON CONFLICT (id) DO NOTHING;

-- Insert users (handle_new_user trigger auto-creates profiles with role='student')
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student1@032.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('bb000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student2@032.test', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Update profiles: student1 has_core=true with valid access window, student2 has_core=false
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
UPDATE public.profiles SET 
  has_core = true, 
  access_starts_at = now() - interval '1 day',
  access_ends_at = now() + interval '30 days',
  tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e';
UPDATE public.profiles SET 
  has_core = false,
  tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'bb000000-0000-0000-0000-0000000000b2';
SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- Course 1111 exists (teacher_id = student1 for simplicity)
INSERT INTO school_desk.courses (id, title, price, teacher_id, type, tenant_id)
VALUES ('11111111-1111-1111-1111-111111111111', 'Course 1111', 0, 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', 'core', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- student1 enrolled in course 1111
INSERT INTO school_desk.enrollments (student_id, course_id, payment_reference)
VALUES ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '11111111-1111-1111-1111-111111111111', 'test-032')
ON CONFLICT (student_id, course_id) DO NOTHING;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","tenant_id":"00000000-0000-0000-0000-000000000001","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select ok( public.has_core_access(),
  'student1 with has_core=true and live window passes has_core_access' );

select ok( public.has_item_access('11111111-1111-1111-1111-111111111111'),
  'student1 passes has_item_access for their enrolled course 1111' );

select set_config('request.jwt.claims', '{"sub":"bb000000-0000-0000-0000-0000000000b2","role":"authenticated","tenant_id":"00000000-0000-0000-0000-000000000001","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select ok( NOT public.has_core_access(),
  'student2 with has_core=false fails has_core_access' );

select ok( NOT public.has_item_access('11111111-1111-1111-1111-111111111111'),
  'student2 fails has_item_access for course 1111 (not enrolled)' );

select * from finish();
rollback;
