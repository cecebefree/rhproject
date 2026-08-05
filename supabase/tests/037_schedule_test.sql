-- 037_schedule_test.sql (P2-012)
-- RLS: student sees slots via enrolment + access window; teacher sees own; admin sees all.
--            student from different tenant sees 0; expired access sees 0.
-- Exclusion: same-course overlapping slot on same day is rejected;
--            same-time different-day slot is accepted.
-- Insert: student insert is rejected (admin-only writes).
begin;
select plan(12);

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

-- Per-test fixture: student2 needs two rows for RLS to pass:
--  1. student_class row satisfies ss_student_read join (via class_id path)
--  2. enrollment row satisfies has_item_access() (checks enrollments + access window)
-- Both are required; neither is redundant.
reset role;
insert into public.student_class (student_id, class_id, tenant_id)
values ('bb000000-0000-0000-0000-0000000000b2', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001')

on conflict do nothing;

-- Per-test fixture: student2 needs enrollment in course 1111 for has_item_access
reset role;
insert into public.enrollments (student_id, course_id, payment_reference)
values ('bb000000-0000-0000-0000-0000000000b2', '11111111-1111-1111-1111-111111111111', 'test-037-001')
on conflict (student_id, course_id) do nothing;

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
