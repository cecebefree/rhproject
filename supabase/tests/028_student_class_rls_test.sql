begin;
select plan(2);

-- Student context: should see ONLY their own enrolment (1 row)
set local role authenticated;
set local request.jwt.claims to '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated"}';

select is(
  (select count(*)::int from student_class),
  1,
  'student sees only their own student_class row'
);

reset role;

-- Admin context: should see ALL enrolments (3 rows)
set local role authenticated;
set local request.jwt.claims to '{"sub":"dd000000-0000-0000-0000-0000000000d4","role":"authenticated"}';

-- NOTE: this only works if user ...099 has role=admin in profiles.
-- If ...099 is a student, swap in a real admin uuid below.

select is(
  (select count(*)::int from student_class),
  3,
  'admin sees all student_class rows'
);

select * from finish();
rollback;
