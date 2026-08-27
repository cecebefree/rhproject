-- 036_notifications_test.sql (P2-017)
-- RLS: users read and mark-read ONLY their own notifications.
begin;
select plan(4);

-- Fixtures: tenant, auth.users, profiles, notifications
INSERT INTO public.tenant_lms (id, name, slug, is_active, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Tenant', 'test', true, now())
ON CONFLICT (id) DO NOTHING;

-- Insert users
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student1@036.test', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('bb000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student2@036.test', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Update profiles: set tenant_id
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
UPDATE public.profiles SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE id IN ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', 'bb000000-0000-0000-0000-0000000000b2');
SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- Notifications: student1 has 1, student2 has 1
INSERT INTO public.notifications (id, user_id, tenant_id, type, title, body)
VALUES ('aaaa0000-0000-0000-0000-0000000000a1', 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '00000000-0000-0000-0000-000000000001', 'system', 'Test 1', 'Body 1'),
       ('aaaa0000-0000-0000-0000-0000000000a2', 'bb000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000001', 'system', 'Test 2', 'Body 2')
ON CONFLICT (id) DO NOTHING;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","tenant_id":"00000000-0000-0000-0000-000000000001","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

-- 1. self-read: student1 sees exactly one notification (their own)
select is(
  (select count(*)::int from public.notifications),
  1,
  'student1 sees exactly one notification (their own)'
);

-- 2. cross-user read blocked
select is(
  (select count(*)::int from public.notifications
     where id = 'aaaa0000-0000-0000-0000-0000000000a2'),
  0,
  'student1 cannot see student2 notification'
);

-- 3. self mark-read works
update public.notifications
  set read_at = now()
  where id = 'aaaa0000-0000-0000-0000-0000000000a1';

select ok(
  (select read_at is not null from public.notifications
     where id = 'aaaa0000-0000-0000-0000-0000000000a1'),
  'student1 can mark own notification read'
);

-- 4. cross-user update blocked (RLS filters to 0 rows)
update public.notifications
  set read_at = now()
  where id = 'aaaa0000-0000-0000-0000-0000000000a2';

reset role;
select ok(
  (select read_at is null from public.notifications
     where id = 'aaaa0000-0000-0000-0000-0000000000a2'),
  'student1 cannot mark student2 notification read'
);

select * from finish();
rollback;
