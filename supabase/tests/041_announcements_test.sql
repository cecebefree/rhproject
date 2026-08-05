-- 041_announcements_test.sql (P2-025)
-- RLS: non-admin reads only published, non-expired, role-matched rows.
-- Admin reads all within tenant. Read model respects pinned ordering.
begin;
select plan(11);

-- 1. RLS enabled on announcement
select ok(
  (select relrowsecurity from pg_class where relname = 'announcement'),
  'announcement has RLS enabled'
);

-- 2. Student sees everyone + pinned (2 rows)
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select is(
  (select count(*)::int from public.announcement),
  2,
  'student sees 2 announcements (everyone + pinned)'
);

-- 3. Student does NOT see teacher-only announcement
select is(
  (select count(*)::int from public.announcement
   where audience_roles = '{teacher}'),
  0,
  'student cannot see teacher-only announcement'
);

-- 4. Teacher sees everyone + teacher-only + pinned (3 rows)
select set_config('request.jwt.claims',
  '{"sub":"cc000000-0000-0000-0000-0000000000c3","role":"authenticated","app_metadata":{"role":"teacher","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select is(
  (select count(*)::int from public.announcement),
  3,
  'teacher sees 3 announcements (everyone + teacher + pinned)'
);

-- 5. Future-dated row invisible to non-admin student
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select is(
  (select count(*)::int from public.announcement
   where id = 'a1000000-0000-0000-0000-000000000003'),
  0,
  'future-dated announcement invisible to student'
);

-- 6. Expired row invisible to non-admin student
select is(
  (select count(*)::int from public.announcement
   where id = 'a1000000-0000-0000-0000-000000000004'),
  0,
  'expired announcement invisible to student'
);

-- 7. Admin sees all 5 tenant-1 rows (including future and expired)
select set_config('request.jwt.claims',
  '{"sub":"dd000000-0000-0000-0000-0000000000d4","role":"authenticated","app_metadata":{"role":"admin","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select is(
  (select count(*)::int from public.announcement),
  5,
  'admin sees all 5 tenant-1 announcements'
);

-- 8. Cross-tenant leak: tenant 2 user sees only their 1 row
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000002"}}', true);

select is(
  (select count(*)::int from public.announcement),
  1,
  'tenant 2 user sees only own 1 announcement'
);

-- 9. Non-admin (student) insert rejected
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select throws_ok(
  $$insert into public.announcement (tenant_id, title, body, created_by)
    values ('00000000-0000-0000-0000-000000000001', 'Bad', 'test', 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e')$$,
  42501,
  null,
  'student insert into announcement rejected by RLS'
);

-- 10. Pinned ordering: pinned row returned first from read model (student context)
select is(
  (select pinned::text from public.get_announcements() limit 1),
  'true',
  'pinned announcement returned first from get_announcements()'
);

-- 11. CHECK constraint rejects expires_at <= publish_at (admin context)
select set_config('request.jwt.claims',
  '{"sub":"dd000000-0000-0000-0000-0000000000d4","role":"authenticated","app_metadata":{"role":"admin","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select throws_ok(
  $$insert into public.announcement (tenant_id, title, body, created_by, publish_at, expires_at)
    values ('00000000-0000-0000-0000-000000000001', 'Bad', 'test',
            'dd000000-0000-0000-0000-0000000000d4', now(), now())$$,
  23514,
  null,
  'expires_at <= publish_at rejected by check constraint'
);

select * from finish();
rollback;
