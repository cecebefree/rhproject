begin;
select plan(2);

-- Student context: should see ONLY their own enrolment (3 rows for student1)
set local role authenticated;
set local request.jwt.claims to '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}';

select is(
  (select count(*)::int from student_class),
  3,
  'student sees only their own student_class rows'
);

reset role;

-- Admin context: should see ALL enrolments (7 rows)
set local role authenticated;
set local request.jwt.claims to '{"sub":"dd000000-0000-0000-0000-0000000000d4","role":"authenticated","app_metadata":{"role":"admin","tenant_id":"00000000-0000-0000-0000-000000000001"}}';

select is(
  (select count(*)::int from student_class),
  7,
  'admin sees all student_class rows'
);

select * from finish();
rollback;
