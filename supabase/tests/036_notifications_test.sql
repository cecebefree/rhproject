-- 036_notifications_test.sql (P2-017)
-- RLS: users read and mark-read ONLY their own notifications.
begin;
select plan(4);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

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
