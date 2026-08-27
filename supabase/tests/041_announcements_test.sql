-- 041_announcements_test.sql (P2-025)
-- RLS: non-admin reads only published, non-expired, role-matched rows.
-- Admin reads all within tenant. Read model respects pinned ordering.
begin;
select plan(11);

-- Fixtures: tenants, auth.users, profiles, announcements
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
VALUES ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student@041.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('cc000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher@041.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('dd000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@041.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tenant2@041.test', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Update profiles: set roles and tenant_id
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
UPDATE public.profiles SET role = 'teacher', tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'cc000000-0000-0000-0000-0000000000c3';
UPDATE public.profiles SET role = 'admin', tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'dd000000-0000-0000-0000-0000000000d4';
UPDATE public.profiles SET role = 'student', tenant_id = '00000000-0000-0000-0000-000000000002'
WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE public.profiles SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e';
SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- Announcements for tenant 1: 5 rows
-- a1: everyone (published, active, not pinned)
-- a2: teacher-only (published, active, audience_roles = '{teacher}')
-- a3: pinned (published, active, pinned = true)
-- a4: future-dated (publish_at in the future)
-- a5: expired (expires_at in the past)
INSERT INTO school_desk.announcement (id, tenant_id, title, body, audience_roles, publish_at, expires_at, pinned, created_by)
VALUES
  ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Everyone', 'body', '{}', now() - interval '1 day', NULL, false,
   'dd000000-0000-0000-0000-0000000000d4'),
  ('a1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'Teacher Only', 'body', '{teacher}', now() - interval '1 day', NULL, false,
   'dd000000-0000-0000-0000-0000000000d4'),
  ('a1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
   'Pinned', 'body', '{}', now() - interval '1 day', NULL, true,
   'dd000000-0000-0000-0000-0000000000d4'),
  ('a1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Future', 'body', '{}', now() + interval '7 days', NULL, false,
   'dd000000-0000-0000-0000-0000000000d4'),
  ('a1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
   'Expired', 'body', '{}', now() - interval '7 days', now() - interval '1 day', false,
   'dd000000-0000-0000-0000-0000000000d4')
ON CONFLICT (id) DO NOTHING;

-- Announcement for tenant 2: 1 row
INSERT INTO school_desk.announcement (id, tenant_id, title, body, audience_roles, publish_at, expires_at, pinned, created_by)
VALUES ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'Tenant 2', 'body', '{}', now() - interval '1 day', NULL, false,
   '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- 1. RLS enabled on announcement
select ok(
  (select relrowsecurity from pg_class where relname = 'announcement'),
  'announcement has RLS enabled'
);

-- 2. Student sees everyone + pinned (2 rows)
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","tenant_id":"00000000-0000-0000-0000-000000000001","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select is(
  (select count(*)::int from school_desk.announcement),
  2,
  'student sees 2 announcements (everyone + pinned)'
);

-- 3. Student does NOT see teacher-only announcement
select is(
  (select count(*)::int from school_desk.announcement
   where audience_roles = '{teacher}'),
  0,
  'student cannot see teacher-only announcement'
);

-- 4. Teacher sees everyone + teacher-only + pinned (3 rows)
select set_config('request.jwt.claims',
  '{"sub":"cc000000-0000-0000-0000-0000000000c3","role":"authenticated","tenant_id":"00000000-0000-0000-0000-000000000001","app_metadata":{"role":"teacher","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select is(
  (select count(*)::int from school_desk.announcement),
  3,
  'teacher sees 3 announcements (everyone + teacher + pinned)'
);

-- 5. Future-dated row invisible to non-admin student
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","tenant_id":"00000000-0000-0000-0000-000000000001","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select is(
  (select count(*)::int from school_desk.announcement
   where id = 'a1000000-0000-0000-0000-000000000003'),
  0,
  'future-dated announcement invisible to student'
);

-- 6. Expired row invisible to non-admin student
select is(
  (select count(*)::int from school_desk.announcement
   where id = 'a1000000-0000-0000-0000-000000000004'),
  0,
  'expired announcement invisible to student'
);

-- 7. Admin sees all 5 tenant-1 rows (including future and expired)
select set_config('request.jwt.claims',
  '{"sub":"dd000000-0000-0000-0000-0000000000d4","role":"authenticated","tenant_id":"00000000-0000-0000-0000-000000000001","app_metadata":{"role":"admin","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select is(
  (select count(*)::int from school_desk.announcement),
  5,
  'admin sees all 5 tenant-1 announcements'
);

-- 8. Cross-tenant leak: tenant 2 user sees only their 1 row
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","tenant_id":"00000000-0000-0000-0000-000000000002","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000002"}}', true);

select is(
  (select count(*)::int from school_desk.announcement),
  1,
  'tenant 2 user sees only own 1 announcement'
);

-- 9. Non-admin (student) insert rejected
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","tenant_id":"00000000-0000-0000-0000-000000000001","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select throws_ok(
  $$insert into school_desk.announcement (tenant_id, title, body, created_by)
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
  '{"sub":"dd000000-0000-0000-0000-0000000000d4","role":"authenticated","tenant_id":"00000000-0000-0000-0000-000000000001","app_metadata":{"role":"admin","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select throws_ok(
  $$insert into school_desk.announcement (tenant_id, title, body, created_by, publish_at, expires_at)
    values ('00000000-0000-0000-0000-000000000001', 'Bad', 'test',
            'dd000000-0000-0000-0000-0000000000d4', now(), now())$$,
  23514,
  null,
  'expires_at <= publish_at rejected by check constraint'
);

select * from finish();
rollback;
