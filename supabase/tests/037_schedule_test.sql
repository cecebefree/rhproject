-- 037_schedule_test.sql (P2-012)
-- RLS: student sees slots via enrolment + access window; teacher sees own; admin sees all.
--            student from different tenant sees 0; expired access sees 0.
-- Exclusion: same-course overlapping slot on same day is rejected;
--            same-time different-day slot is accepted.
-- Insert: student insert is rejected (admin-only writes).
begin;
select plan(12);

-- Fixtures: tenant, auth.users, profiles, courses, terms, schedule_slot, student_class, enrollments
INSERT INTO public.tenant_lms (id, name, slug, is_active, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Tenant', 'test', true, now())
ON CONFLICT (id) DO NOTHING;

-- Insert users
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student1@037.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('bb000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student2@037.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('cc000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher1@037.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('eeee0000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher2@037.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('dd000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@037.test', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Update profiles: set roles and tenant_id
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
UPDATE public.profiles SET role = 'teacher', tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id IN ('cc000000-0000-0000-0000-0000000000c3', 'eeee0000-0000-0000-0000-0000000000e5');
UPDATE public.profiles SET role = 'admin', tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'dd000000-0000-0000-0000-0000000000d4';
UPDATE public.profiles SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id IN ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', 'bb000000-0000-0000-0000-0000000000b2');
SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- Courses: 1111 (teacher1), 2222 (teacher1)
INSERT INTO public.courses (id, title, price, teacher_id, type, tenant_id)
VALUES ('11111111-1111-1111-1111-111111111111', 'Course A', 0, 'cc000000-0000-0000-0000-0000000000c3', 'core', '00000000-0000-0000-0000-000000000001'),
       ('22222222-2222-2222-2222-222222222222', 'Course B', 0, 'cc000000-0000-0000-0000-0000000000c3', 'core', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Terms: cccc0000 (active)
INSERT INTO public.terms (id, tenant_id, name, start_date, end_date)
VALUES ('cccc0000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001', 'Current Term', (now() - interval '1 day')::date, (now() + interval '300 days')::date)
ON CONFLICT (id) DO NOTHING;

-- Schedule slots: 2 slots (course 1111 and 2222)
INSERT INTO public.schedule_slot (id, tenant_id, course_id, term_id, start_time, end_time, days_of_week)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'cccc0000-0000-0000-0000-0000000000c1', '09:00', '10:00', ARRAY[1,3,5]),
       ('bbbb0000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'cccc0000-0000-0000-0000-0000000000c1', '11:00', '12:00', ARRAY[2,4])
ON CONFLICT (id) DO NOTHING;

-- student_class: student1 in course 1111, student2 in both
INSERT INTO public.student_class (student_id, class_id, tenant_id)
VALUES ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001'),
       ('bb000000-0000-0000-0000-0000000000b2', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001'),
       ('bb000000-0000-0000-0000-0000000000b2', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (student_id, class_id) DO NOTHING;

-- Enrollments: student1 in 1111, student2 in both
INSERT INTO public.enrollments (student_id, course_id, payment_reference)
VALUES ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '11111111-1111-1111-1111-111111111111', 'test-037-001'),
       ('bb000000-0000-0000-0000-0000000000b2', '11111111-1111-1111-1111-111111111111', 'test-037-002'),
       ('bb000000-0000-0000-0000-0000000000b2', '22222222-2222-2222-2222-222222222222', 'test-037-003')
ON CONFLICT (student_id, course_id) DO NOTHING;

-- RLS tests

-- 1. student1 sees exactly one slot (enrolled in course 11111111, active access window)
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select is(
  (select count(*)::int from public.schedule_slot),
  1,
  'student1 sees exactly one slot via enrolment'
);

-- 2. student1 cannot see slot on course 22222222 (not enrolled)
select is(
  (select count(*)::int from public.schedule_slot
     where id = 'bbbb0000-0000-0000-0000-0000000000b2'),
  0,
  'student1 cannot see slot on course 22222222 (not enrolled)'
);

set local role authenticated;

-- 3. student2 enrolled in both courses -> sees both slots
select set_config('request.jwt.claims',
  '{"sub":"bb000000-0000-0000-0000-0000000000b2","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select is(
  (select count(*)::int from public.schedule_slot),
  2,
  'student2 sees both slots (enrolled in both courses)'
);

-- 4. teacher1 owns both courses -> sees both slots
select set_config('request.jwt.claims',
  '{"sub":"cc000000-0000-0000-0000-0000000000c3","role":"authenticated","app_metadata":{"role":"teacher","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select is(
  (select count(*)::int from public.schedule_slot),
  2,
  'teacher1 sees both slots (owns both courses)'
);

-- 5. teacher2 owns no course -> sees 0 slots
select set_config('request.jwt.claims',
  '{"sub":"eeee0000-0000-0000-0000-0000000000e5","role":"authenticated","app_metadata":{"role":"teacher","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select is(
  (select count(*)::int from public.schedule_slot),
  0,
  'teacher2 sees 0 slots (owns no courses)'
);

-- 6. admin sees all slots
select set_config('request.jwt.claims',
  '{"sub":"dd000000-0000-0000-0000-0000000000d4","role":"authenticated","app_metadata":{"role":"admin","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select is(
  (select count(*)::int from public.schedule_slot),
  2,
  'admin sees all slots'
);

-- 7. student insert is rejected (ss_admin_write only)
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select throws_ok(
  $$insert into public.schedule_slot
    (tenant_id, course_id, term_id, start_time, end_time, days_of_week)
  values
    ('00000000-0000-0000-0000-000000000001',
     '11111111-1111-1111-1111-111111111111',
     'cccc0000-0000-0000-0000-0000000000c1',
     '12:00', '13:00',
     ARRAY[2])$$,
  '42501',
  null,
  'student insert is rejected by RLS'
);

-- 8. different tenant sees 0 slots
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","app_metadata":{"role":"student","tenant_id":"99999999-9999-9999-9999-999999999999"}}', true);

select is(
  (select count(*)::int from public.schedule_slot),
  0,
  'different tenant sees 0 slots'
);

-- 9. enrolled student with expired access window sees 0
-- Expire and restore updates run as superuser to bypass RLS
reset role;
update public.profiles
  set access_ends_at = now() - interval '1 day'
  where id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e';

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select is(
  (select count(*)::int from public.schedule_slot),
  0,
  'enrolled student with expired access window sees 0'
);

reset role;
update public.profiles
  set access_ends_at = now() + interval '365 days'
  where id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e';

-- Exclusion constraint tests (admin context)

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"dd000000-0000-0000-0000-0000000000d4","role":"authenticated","app_metadata":{"role":"admin","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

-- 10. REJECT: same course, overlapping time, overlapping day (Wed=3)
-- Existing slot: course 11111111, 09:00-10:00, ARRAY[1,3,5]
-- New slot:      course 11111111, 09:30-10:30, ARRAY[3,5]
-- Overlap: both on day 3 (Wed), time 09:30-10:00
select throws_ok(
  $$insert into public.schedule_slot
    (tenant_id, course_id, term_id, start_time, end_time, days_of_week)
  values
    ('00000000-0000-0000-0000-000000000001',
     '11111111-1111-1111-1111-111111111111',
     'cccc0000-0000-0000-0000-0000000000c1',
     '09:30', '10:30',
     ARRAY[3,5])$$,
  '23P01',
  null,
  'same-course overlapping slot on same day is rejected'
);

-- 11. ACCEPT: same course, same time, different day (Sat=6)
-- Existing slot: course 11111111, 09:00-10:00, ARRAY[1,3,5]
-- New slot:      course 11111111, 09:00-10:00, ARRAY[6]
-- No day overlap: {6} && {1,3,5} = false
select lives_ok(
  $$insert into public.schedule_slot
    (tenant_id, course_id, term_id, start_time, end_time, days_of_week)
  values
    ('00000000-0000-0000-0000-000000000001',
     '11111111-1111-1111-1111-111111111111',
     'cccc0000-0000-0000-0000-0000000000c1',
     '09:00', '10:00',
     ARRAY[6])$$,
  'same-time different-day slot is accepted'
);

-- 12. term read works for student (calendar rendering, scoped to fixture term)
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select is(
  (select count(*)::int from public.terms
     where id = 'cccc0000-0000-0000-0000-0000000000c1'),
  1,
  'student can read active term for calendar rendering'
);

reset role;
select * from finish();
rollback;
