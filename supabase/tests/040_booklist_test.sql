-- 040_booklist_test.sql (P2-022)
-- Booklist + booklist_item RLS, bookshelf read model, materialization idempotency,
-- book catalog enforcement, family_child RLS isolation.
begin;
select plan(23);

-- Fixtures: tenants, auth.users, profiles
INSERT INTO public.tenant_lms (id, name, slug, is_active, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Tenant 1', 't1', true, now()),
       ('00000000-0000-0000-0000-000000000002', 'Tenant 2', 't2', true, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Tenant 1', 't1', true, now()),
       ('00000000-0000-0000-0000-000000000002', 'Tenant 2', 't2', true, now())
ON CONFLICT (id) DO NOTHING;

-- Insert users
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student1@040.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('bb000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student2@040.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('cc000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher@040.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('dd000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@040.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tenant2@040.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('a0000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'family1@040.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('a0000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'family2@040.test', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Update profiles: set roles and tenant_id
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
UPDATE public.profiles SET role = 'teacher', tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'cc000000-0000-0000-0000-0000000000c3';
UPDATE public.profiles SET role = 'admin', tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'dd000000-0000-0000-0000-0000000000d4';
UPDATE public.profiles SET role = 'student', tenant_id = '00000000-0000-0000-0000-000000000002'
WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE public.profiles SET role = 'family', tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id IN ('a0000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-0000000000a2');
UPDATE public.profiles SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id IN ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', 'bb000000-0000-0000-0000-0000000000b2');
SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- Books for both tenants
INSERT INTO public.book (id, tenant_id, title, curriculum_type, isbn_13)
VALUES ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Cambridge Math', 'cambridge', '9781234567890'),
       ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'English Grammar', 'home_school', NULL),
       ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'Revoked Dictionary', 'library', NULL),
       ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', 'Permanent Art', 'home_school', NULL),
       ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Tenant 2 Book', 'ib', NULL)
ON CONFLICT (id) DO NOTHING;

-- Courses for teacher (needed for materialize_booklist and teacher RLS)
INSERT INTO public.courses (id, title, price, teacher_id, status, type, tenant_id)
VALUES ('c1000000-0000-0000-0000-000000000001', 'Math 101', 0, 'cc000000-0000-0000-0000-0000000000c3', 'published', 'core', '00000000-0000-0000-0000-000000000001'),
       ('c1000000-0000-0000-0000-000000000002', 'Art Club', 0, 'cc000000-0000-0000-0000-0000000000c3', 'published', 'club', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Student_class: student1 in both courses
INSERT INTO public.student_class (student_id, class_id, tenant_id)
VALUES ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', 'c1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
       ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', 'c1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (student_id, class_id) DO NOTHING;

-- Enrollments for student1 and student2
INSERT INTO public.enrollments (student_id, course_id)
VALUES ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', 'c1000000-0000-0000-0000-000000000001'),
       ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', 'c1000000-0000-0000-0000-000000000002'),
       ('bb000000-0000-0000-0000-0000000000b2', 'c1000000-0000-0000-0000-000000000001')
ON CONFLICT (student_id, course_id) DO NOTHING;

-- Family_child links: guardian a1 linked to student1 and student2
INSERT INTO public.family_child (guardian_id, child_id)
VALUES ('a0000000-0000-0000-0000-0000000000a1', 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'),
       ('a0000000-0000-0000-0000-0000000000a1', 'bb000000-0000-0000-0000-0000000000b2')
ON CONFLICT (guardian_id, child_id) DO NOTHING;

-- Booklists for student1 (current + prior year) and student2 (current year)
INSERT INTO public.booklist (id, tenant_id, child_id, school_year, created_at)
VALUES ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '2025-2026', now()),
       ('b1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '2026-2027', now()),
       ('b1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-0000000000b2', '2026-2027', now())
ON CONFLICT (tenant_id, child_id, school_year) DO NOTHING;

-- Booklist_items: yearly + permanent + revoked for student1 current year
INSERT INTO public.booklist_item (id, tenant_id, booklist_id, book_id, title, source_type, source_id, permanent, revoked_at)
VALUES ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Cambridge Math', 'package', '11111111-1111-1111-1111-111111111111', false, NULL),
       ('a1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'English Grammar', 'package', '22222222-2222-2222-2222-222222222222', true, NULL),
       ('a1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Revoked Dictionary', 'package', '33333333-3333-3333-3333-333333333333', true, now()),
       ('a1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Cambridge Math', 'package', '11111111-1111-1111-1111-111111111111', false, NULL)
ON CONFLICT (booklist_id, source_type, source_id) DO NOTHING;

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
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select is(
  (select count(*)::int from public.booklist),
  2,
  'student1 sees own 2 booklists (current + prior year)'
);

-- 4. Student2 reads own booklist (cross-child leak)
select set_config('request.jwt.claims',
  '{"sub":"bb000000-0000-0000-0000-0000000000b2","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select is(
  (select count(*)::int from public.booklist),
  1,
  'student2 sees own 1 booklist only'
);

-- 5. Bookshelf: yearly item visible in its active year
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

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
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000002"}}', true);

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
  '{"sub":"a0000000-0000-0000-0000-0000000000a1","role":"authenticated","app_metadata":{"role":"family","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select is(
  (select count(*)::int from public.booklist),
  3,
  'family sees own childrens 3 booklists total (stud1=2 + stud2=1)'
);

-- 13. Materialization idempotency (admin context)
select set_config('request.jwt.claims',
  '{"sub":"dd000000-0000-0000-0000-0000000000d4","role":"authenticated","app_metadata":{"role":"admin","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

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
  '{"sub":"cc000000-0000-0000-0000-0000000000c3","role":"authenticated","app_metadata":{"role":"teacher","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select ok(
  (select count(*)::int >= 1 from public.booklist
     where child_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'),
  'teacher sees booklist for student in their course'
);

-- 15. RLS enabled on book
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select ok(
  (select relrowsecurity from pg_class where relname = 'book'),
  'book has RLS enabled'
);

-- 16. Invalid curriculum_type rejected (admin context for INSERT permission)
select set_config('request.jwt.claims',
  '{"sub":"dd000000-0000-0000-0000-0000000000d4","role":"authenticated","app_metadata":{"role":"admin","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

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
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000002"}}', true);

select is(
  (select count(*)::int from public.book),
  1,
  'tenant 2 user sees only own 1 book'
);

-- 19. Student cannot insert book
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select throws_ok(
  $$insert into public.book (tenant_id, title, curriculum_type) values ('00000000-0000-0000-0000-000000000001', 'Should Fail', 'library')$$,
  42501,
  null,
  'student insert into book rejected by RLS'
);

-- 20. Admin can insert book
select set_config('request.jwt.claims',
  '{"sub":"dd000000-0000-0000-0000-0000000000d4","role":"authenticated","app_metadata":{"role":"admin","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select lives_ok(
  $$insert into public.book (tenant_id, title, curriculum_type) values ('00000000-0000-0000-0000-000000000001', 'Admin Book', 'library')$$,
  'admin insert into book succeeds'
);

-- 21. RLS enabled on family_child
select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-0000000000a1","role":"authenticated","app_metadata":{"role":"family","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

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
  '{"sub":"a0000000-0000-0000-0000-0000000000a2","role":"authenticated","app_metadata":{"role":"family","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select is(
  (select count(*)::int from public.family_child),
  0,
  'guardian B (unlinked) sees 0 family links'
);

select * from finish();
rollback;
