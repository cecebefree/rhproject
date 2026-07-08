begin;
select plan(4);

select has_table('student_class');
select col_is_pk('student_class', 'id');
select ok(
  (select relrowsecurity from pg_class where relname = 'student_class'),
  'RLS is enabled on student_class'
);
select policies_are('student_class',
  ARRAY['sc_student_read', 'sc_admin_all', 'sc_teacher_read'],
  'all three policies exist');

select * from finish();
rollback;