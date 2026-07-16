-- 040_booklist_test.sql (P2-022)
-- Booklist + booklist_item RLS, bookshelf read model, materialization idempotency,
-- book catalog enforcement, family_child RLS isolation.
begin;
select plan(23);

-- R20 fixture setup: the 058 seed rework left profile 22222222-... with a
-- NULL (pending) tenant_id and no booklist row. Promote it to tenant 2 and
-- seed exactly one booklist so test 10 ("tenant 2 user sees own 1 booklist
-- only") has the principal it presumes. Transaction-local; ROLLBACK discards.
-- PERMANENT POSTURE (Item 33 finish ruling): profile 22222222-... is intentionally
-- seeded with tenant_id = NULL (R20 'pending' state) and is NOT in seed.sql's 4-UUID
-- explicit-assignment list. This test assigns tenant 2 *locally* inside its own
-- begin;/rollback; envelope via the bypass GUC above. Do NOT move this assignment
-- into seed.sql — the NULL-tenant pending state for 22222222-... is the deliberate
-- R20 posture, and the test-local assignment keeps the suite deterministic.
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
UPDATE public.profiles
   SET tenant_id = '00000000-0000-0000-0000-000000000002'
 WHERE id = '22222222-2222-2222-2222-222222222222';
SELECT set_config('app.tenant_assignment_bypass', 'false', true);

INSERT INTO public.booklist (id, tenant_id, child_id, school_year, created_at)
VALUES (
  'b0000000-0000-0000-0000-0000000000b9',
  '00000000-0000-0000-0000-000000000002',
  '22222222-2222-2222-2222-222222222222',
  '2026-2027',
  now()
)
ON CONFLICT (tenant_id, child_id, school_year) DO NOTHING;


-- 1. RLS enabled on booklist
select ok(
  (select relrowsecurity from pg_class where relname = 'booklist'),
  'booklist has RLS enabled'
);

-- 2. RLS enabled on booklist_item
select ok(
  (select relrowsecurity from pg_class where relname = 'booklist_item'),
  'booklist_item has RLS enabled'
);

-- 3. Student1 reads own booklist
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

select is(
  (select count(*)::int from public.booklist),
  2,
  'student1 sees own 2 booklists (current + prior year)'
);

-- 4. Student2 reads own booklist (cross-child leak)
select set_config('request.jwt.claims',
  '{"sub":"bb000000-0000-0000-0000-0000000000b2","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

select is(
  (select count(*)::int from public.booklist),
  1,
  'student2 sees own 1 booklist only'
);

-- 5. Bookshelf: yearly item visible in its active year
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

select is(
  (select count(*)::int from public.get_bookshelf('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e')),
  2,
  'bookshelf: 2 items (yearly + permanent, no revoked, no prior-year)'
);

-- 6. Bookshelf: permanent item survives year roll-over
select is(
  (select count(*)::int from public.get_bookshelf('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e')
    where permanent = true),
  1,
  'bookshelf: permanent item present'
);

-- 7. Bookshelf: revoked permanent item excluded
select is(
  (select count(*)::int from public.get_bookshelf('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e')
    where title = 'Revoked Dictionary'),
  0,
  'bookshelf: revoked item excluded'
);

-- 8. Bookshelf: prior-year non-permanent item excluded (current year Cambridge Math remains)
select is(
  (select count(*)::int from public.get_bookshelf('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e')
    where title = 'Cambridge Math'),
  1,
  'bookshelf: prior-year excluded; Cambridge Math present via current year item'
);

-- 9. Bookshelf exposes curriculum_type from book join (before materialization changes year)
select is(
  (select curriculum_type::text from public.get_bookshelf('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e')
   where source_id = '11111111-1111-1111-1111-111111111111'),
  'cambridge',
  'bookshelf exposes curriculum_type from book join'
);

-- 10. Cross-tenant: student from tenant 2 sees own booklist only
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","tenant_id":"00000000-0000-0000-0000-000000000002"}', true);

select is(
  (select count(*)::int from public.booklist),
  1,
  'tenant 2 user sees own 1 booklist only'
);

-- 11. Cross-tenant: tenant 2 user cannot read tenant 1 specific child
select is(
  (select count(*)::int from public.get_bookshelf('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e')),
  0,
  'tenant 2 bookshelf for tenant 1 child returns 0 rows'
);

-- 12. Family reads children's booklists
select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-0000000000a1","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

select is(
  (select count(*)::int from public.booklist),
  3,
  'family sees own childrens 3 booklists total (stud1=2 + stud2=1)'
);

-- 13. Materialization idempotency (admin context)
select set_config('request.jwt.claims',
  '{"sub":"dd000000-0000-0000-0000-0000000000d4","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

do $$
begin
  perform public.materialize_booklist(
    'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e',
    '2027-2028',
    '00000000-0000-0000-0000-000000000001'
  );
end $$;

do $$
begin
  perform public.materialize_booklist(
    'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e',
    '2027-2028',
    '00000000-0000-0000-0000-000000000001'
  );
end $$;

select is(
  (select count(*)::int from public.booklist_item bi
     join public.booklist bl on bl.id = bi.booklist_id
     where bl.child_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'
       and bl.school_year = '2027-2028'),
  3,
  'materialization idempotent: 3 items after re-run (course + club + course)'
);

-- 14. Teacher reads booklists for children in their courses
select set_config('request.jwt.claims',
  '{"sub":"cc000000-0000-0000-0000-0000000000c3","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

select ok(
  (select count(*)::int >= 1 from public.booklist
     where child_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'),
  'teacher sees booklist for student in their course'
);

-- 15. RLS enabled on book
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

select ok(
  (select relrowsecurity from pg_class where relname = 'book'),
  'book has RLS enabled'
);

-- 16. Invalid curriculum_type rejected (admin context for INSERT permission)
select set_config('request.jwt.claims',
  '{"sub":"dd000000-0000-0000-0000-0000000000d4","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

select throws_ok(
  $$insert into public.book (tenant_id, title, curriculum_type) values ('00000000-0000-0000-0000-000000000001', 'Bad', 'invalid')$$,
  23514,
  null,
  'invalid curriculum_type rejected by check constraint'
);

-- 17. Malformed isbn rejected
select throws_ok(
  $$insert into public.book (tenant_id, title, curriculum_type, isbn_13) values ('00000000-0000-0000-0000-000000000001', 'Bad', 'library', '123')$$,
  'P0001',
  'isbn_13 format invalid',
  'malformed isbn_13 rejected by trigger'
);

-- 18. Cross-tenant leak on book (student context)
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","tenant_id":"00000000-0000-0000-0000-000000000002"}', true);

select is(
  (select count(*)::int from public.book),
  1,
  'tenant 2 user sees only own 1 book'
);

-- 19. Student cannot insert book
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

select throws_ok(
  $$insert into public.book (tenant_id, title, curriculum_type) values ('00000000-0000-0000-0000-000000000001', 'Should Fail', 'library')$$,
  42501,
  null,
  'student insert into book rejected by RLS'
);

-- 20. Admin can insert book
select set_config('request.jwt.claims',
  '{"sub":"dd000000-0000-0000-0000-0000000000d4","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

select lives_ok(
  $$insert into public.book (tenant_id, title, curriculum_type) values ('00000000-0000-0000-0000-000000000001', 'Admin Book', 'library')$$,
  'admin insert into book succeeds'
);

-- 21. RLS enabled on family_child
select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-0000000000a1","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

select ok(
  (select relrowsecurity from pg_class where relname = 'family_child'),
  'family_child has RLS enabled'
);

-- 22. Guardian A sees own 2 links
select is(
  (select count(*)::int from public.family_child),
  2,
  'guardian A sees own 2 family links'
);

-- 23. Guardian B (unlinked) sees 0 (leak test)
select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-0000000000a2","tenant_id":"00000000-0000-0000-0000-000000000001"}', true);

select is(
  (select count(*)::int from public.family_child),
  0,
  'guardian B (unlinked) sees 0 family links'
);

select * from finish();
rollback;
