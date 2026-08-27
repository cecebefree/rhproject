begin;
select plan(2);

-- Fixtures: tenant, auth.users, profiles, courses, student_class
INSERT INTO public.tenant_lms (id, name, slug, is_active, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Tenant', 'test', true, now())
ON CONFLICT (id) DO NOTHING;

-- Insert users (handle_new_user trigger auto-creates profiles with role='student')
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student1@028.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('bb000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student2@028.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('dd000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@028.test', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Update trigger-created profiles to correct roles and tenant_id
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
UPDATE public.profiles SET role = 'admin', tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'dd000000-0000-0000-0000-0000000000d4';
UPDATE public.profiles SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id IN ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', 'bb000000-0000-0000-0000-0000000000b2');
SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- 4 courses (teacher_id = admin for simplicity)
INSERT INTO school_desk.courses (id, title, price, teacher_id, type, tenant_id)
VALUES ('11111111-1111-1111-1111-111111111111', 'Course A', 0, 'dd000000-0000-0000-0000-0000000000d4', 'core', '00000000-0000-0000-0000-000000000001'),
       ('22222222-2222-2222-2222-222222222222', 'Course B', 0, 'dd000000-0000-0000-0000-0000000000d4', 'core', '00000000-0000-0000-0000-000000000001'),
       ('33333333-3333-3333-3333-333333333333', 'Course C', 0, 'dd000000-0000-0000-0000-0000000000d4', 'core', '00000000-0000-0000-0000-000000000001'),
       ('44444444-4444-4444-4444-444444444444', 'Course D', 0, 'dd000000-0000-0000-0000-0000000000d4', 'core', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- student1 enrolled in 3 courses, student2 in 4 courses (total 7 rows)
INSERT INTO public.student_class (student_id, class_id, tenant_id)
VALUES ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001'),
       ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001'),
       ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001'),
       ('bb000000-0000-0000-0000-0000000000b2', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001'),
       ('bb000000-0000-0000-0000-0000000000b2', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001'),
       ('bb000000-0000-0000-0000-0000000000b2', '33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001'),
       ('bb000000-0000-0000-0000-0000000000b2', '44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (student_id, class_id) DO NOTHING;

-- Student context: should see ONLY their own enrolment (3 rows for student1)
set local role authenticated;
set local request.jwt.claims to '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","tenant_id":"00000000-0000-0000-0000-000000000001","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}';

select is(
  (select count(*)::int from student_class),
  3,
  'student sees only their own student_class rows'
);

reset role;

-- Admin context: should see ALL enrolments (7 rows)
set local role authenticated;
set local request.jwt.claims to '{"sub":"dd000000-0000-0000-0000-0000000000d4","role":"authenticated","tenant_id":"00000000-0000-0000-0000-000000000001","app_metadata":{"role":"admin","tenant_id":"00000000-0000-0000-0000-000000000001"}}';

select is(
  (select count(*)::int from student_class),
  7,
  'admin sees all student_class rows'
);

select * from finish();
rollback;
