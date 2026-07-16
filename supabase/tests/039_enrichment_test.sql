-- 039_enrichment_test.sql (P2-018)
-- Enrichment + clubs: RLS, CHECK constraints, type discriminator, open_to_outside.
begin;
select plan(17);

-- R20 fixture: promote ffffffff profile to outside_student role so the
-- courses_no_core_outside RESTRICTIVE policy (which reads profiles.role)
-- correctly blocks core/closed-club access. Transaction-local; ROLLBACK discards.
UPDATE public.profiles SET role = 'outside_student'
WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';


-- RLS tests

-- 1. Golden student reads own enrichment_meta
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

select is(
  (select count(*)::int from public.enrichment_meta),
  1,
  'golden student reads own enrichment_meta'
);

-- 2. Student cannot read other students enrichment_meta
select set_config('request.jwt.claims',
  '{"sub":"bb000000-0000-0000-0000-0000000000b2","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

select is(
  (select count(*)::int from public.enrichment_meta),
  0,
  'student2 cannot read student1 enrichment_meta'
);

-- 3. Teacher reads enrolled students enrichment_meta
select set_config('request.jwt.claims',
  '{"sub":"cc000000-0000-0000-0000-0000000000c3","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

select is(
  (select count(*)::int from public.enrichment_meta),
  1,
  'teacher1 reads enrolled student enrichment_meta'
);

-- 4. Teacher cannot read non-enrolled students enrichment_meta
select set_config('request.jwt.claims',
  '{"sub":"eeee0000-0000-0000-0000-0000000000e5","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

select is(
  (select count(*)::int from public.enrichment_meta),
  0,
  'teacher2 reads 0 enrichment_meta (owns no enrichment courses)'
);

-- 5. Teacher cannot write another teachers course enrichment_meta
select set_config('request.jwt.claims',
  '{"sub":"eeee0000-0000-0000-0000-0000000000e5","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

update public.enrichment_meta set pace = 'structured'
  where student_class_id = (select id from public.student_class
    where student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
    and class_id = '44444444-4444-4444-4444-444444444444');

select set_config('request.jwt.claims',
  '{"sub":"dd000000-0000-0000-0000-0000000000d4","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

select is(
  (select pace from public.enrichment_meta
     where student_class_id = (select id from public.student_class
       where student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
       and class_id = '44444444-4444-4444-4444-444444444444')),
  'self-paced',
  'teacher2 cannot write teacher1 course meta (pace unchanged)'
);

-- 6. Admin reads all enrichment_meta
select is(
  (select count(*)::int from public.enrichment_meta),
  1,
  'admin reads all enrichment_meta'
);

-- 7. Student UPDATE blocked (RLS: no teacher_write policy for students)
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

update public.enrichment_meta set pace = 'structured'
  where student_class_id = (select id from public.student_class
    where student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
    and class_id = '44444444-4444-4444-4444-444444444444');

select set_config('request.jwt.claims',
  '{"sub":"dd000000-0000-0000-0000-0000000000d4","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

select is(
  (select pace from public.enrichment_meta
     where student_class_id = (select id from public.student_class
       where student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
       and class_id = '44444444-4444-4444-4444-444444444444')),
  'self-paced',
  'student UPDATE blocked by RLS (pace unchanged)'
);

-- Type discriminator + open_to_outside tests

-- 8. outside_student blocked from core course
-- LATENT TENANT MISMATCH (Item 33 finish, documented): the JWT claims above set
-- tenant_id = 00000000-0000-0000-0000-000000000001 for profile fffffffff-..., but
-- that profile's DB row (profiles.tenant_id) is 11111111-1111-1111-1111-111111111111.
-- This is harmless under the current RESTRICTIVE policy courses_no_core_outside,
-- which scopes on profiles.role, NOT on the claims tenant_id. If that policy (or a
-- sibling) is ever switched to claims-tenant scoping, this mismatch would wrongly
-- block/allow access and must be reconciled. Flag only — do not 'fix' by editing the
-- claims, as the role-based gating is intentional and verified by tests 8-10.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"ffffffff-ffff-ffff-ffff-ffffffffffff","tenant_id":"00000000-0000-0000-0000-000000000001","app_metadata":{"role":"outside_student"}}', true);

select is(
  (select count(*)::int from public.courses where type = 'core'),
  0,
  'outside_student sees 0 core courses'
);

-- 9. outside_student blocked from closed club (open_to_outside=false)
select is(
  (select count(*)::int from public.courses
     where id = '33333333-3333-3333-3333-333333333333'),
  0,
  'outside_student blocked from closed club (open_to_outside=false)'
);

-- 10. outside_student allowed where open_to_outside=true
select is(
  (select count(*)::int from public.courses
     where type in ('club', 'enrichment') and open_to_outside = true),
  1,
  'outside_student sees 1 open club/enrichment course'
);

-- CHECK constraint tests (admin context)
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"dd000000-0000-0000-0000-0000000000d4","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

-- 11. CHECK pace rejects invalid value
select throws_ok(
  $$insert into public.enrichment_meta (tenant_id, student_class_id, pace)
    values ('00000000-0000-0000-0000-000000000001',
            (select id from public.student_class where student_id = 'bb000000-0000-0000-0000-0000000000b2' and class_id = '44444444-4444-4444-4444-444444444444'),
            'invalid_pace')$$,
  '23514',
  null,
  'CHECK pace rejects invalid value'
);

-- 12. CHECK completed <= total enforced
select throws_ok(
  $$insert into public.enrichment_meta (tenant_id, student_class_id, completed, total)
    values ('00000000-0000-0000-0000-000000000001',
            (select id from public.student_class where student_id = 'bb000000-0000-0000-0000-0000000000b2' and class_id = '44444444-4444-4444-4444-444444444444'),
            5, 3)$$,
  '23514',
  null,
  'CHECK completed <= total enforced'
);

-- 13. CHECK total = 0 allows completed = 0
select lives_ok(
  $$insert into public.enrichment_meta (tenant_id, student_class_id, completed, total)
    values ('00000000-0000-0000-0000-000000000001',
            (select id from public.student_class where student_id = 'bb000000-0000-0000-0000-0000000000b2' and class_id = '44444444-4444-4444-4444-444444444444'),
            0, 0)$$,
  'CHECK total=0 allows completed=0'
);

-- 14. enrichment_meta has tenant_id column
select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'enrichment_meta'
      and column_name = 'tenant_id'
  ),
  'enrichment_meta has tenant_id column'
);

-- 15. updated_at trigger fires on update
reset role;
update public.enrichment_meta
  set pace = 'structured'
  where student_class_id = (select id from public.student_class
    where student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
    and class_id = '44444444-4444-4444-4444-444444444444');

select ok(
  (select updated_at > created_at from public.enrichment_meta
     where student_class_id = (select id from public.student_class
       where student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
       and class_id = '44444444-4444-4444-4444-444444444444')),
  'updated_at trigger fires on update'
);

-- 16. Regression: student course visibility unchanged by restrictive policy
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

select is(
  (select count(*)::int from public.courses where type = 'core'),
  2,
  'regression: student still sees all core courses'
);

-- 17. Regression: teacher course visibility unchanged by restrictive policy
select set_config('request.jwt.claims',
  '{"sub":"cc000000-0000-0000-0000-0000000000c3","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

select is(
  (select count(*)::int from public.courses),
  4,
  'regression: teacher still sees all courses'
);

select * from finish();
rollback;
