-- 059_chat_tables_test.sql
-- Chat tables (059): structure, RLS enabled, R20 auth-first behavior.
begin;
select plan(18);

-- Seed fixtures: two tenants, profiles, one conversation
INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A', 'tenant-a', true, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B', 'tenant-b', true, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member-b@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now()),
       ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, name, role, tenant_id, created_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'Member A', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now()),
       ('22222222-2222-2222-2222-222222222222', 'Member B', 'student', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', now()),
       ('33333333-3333-3333-3333-333333333333', 'Other A', 'student', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now())
ON CONFLICT (id) DO NOTHING;

-- Conversation in tenant A, created by member A
INSERT INTO public.conversations (id, tenant_id, created_by)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111');
INSERT INTO public.conversation_members (conversation_id, profile_id)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111');

-- 1-5. Structure: tables exist
SELECT ok( EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='conversations'), 't1 conversations exists');
SELECT ok( EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='conversation_members'), 't2 conversation_members exists');
SELECT ok( EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='messages'), 't3 messages exists');
SELECT ok( EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='message_reactions'), 't4 message_reactions exists');
SELECT ok( EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chat_preferences'), 't5 chat_preferences exists');

-- 6-10. RLS enabled on all five
SELECT ok(relrowsecurity, 't6 conversations RLS enabled') FROM pg_class WHERE relname='conversations';
SELECT ok(relrowsecurity, 't7 conversation_members RLS enabled') FROM pg_class WHERE relname='conversation_members';
SELECT ok(relrowsecurity, 't8 messages RLS enabled') FROM pg_class WHERE relname='messages';
SELECT ok(relrowsecurity, 't9 message_reactions RLS enabled') FROM pg_class WHERE relname='message_reactions';
SELECT ok(relrowsecurity, 't10 chat_preferences RLS enabled') FROM pg_class WHERE relname='chat_preferences';

-- 11. tenant_id NOT NULL enforced (insert without tenant fails)
SELECT throws_ok(
  $$INSERT INTO public.conversations (id, tenant_id, created_by) VALUES ('aeaeaeae-aeae-aeae-aeae-aeaeaeaeaeae', NULL, '11111111-1111-1111-1111-111111111111')$$,
  '23502' );

-- 12. Auth-first: member A (tenant A) reads own conversation
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","app_metadata":{"role":"student","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}}', true);
SELECT is( (SELECT count(*)::int FROM public.conversations WHERE id='cccccccc-cccc-cccc-cccc-cccccccccccc'), 1, 't12 member A reads own conversation');

-- 13. Cross-tenant: member B (tenant B) sees 0 rows from tenant A conversation
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","app_metadata":{"role":"student","tenant_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}}', true);
SELECT is( (SELECT count(*)::int FROM public.conversations WHERE id='cccccccc-cccc-cccc-cccc-cccccccccccc'), 0, 't13 cross-tenant read returns 0 rows');

-- 14. Non-member (other A, same tenant but not in conversation) cannot read it
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","app_metadata":{"role":"student","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}}', true);
SELECT is( (SELECT count(*)::int FROM public.conversations WHERE id='cccccccc-cccc-cccc-cccc-cccccccccccc'), 0, 't14 non-member same-tenant read returns 0 rows');

-- 15. Member write path: member A inserts a message
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","app_metadata":{"role":"student","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}}', true);
SELECT lives_ok(
  $$INSERT INTO public.messages (id, conversation_id, sender_id, body) VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'hello')$$,
  't15 member A inserts a message');

-- 16. Soft-delete visibility: sender soft-deletes, row still present with deleted_at set
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","app_metadata":{"role":"student","tenant_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}}', true);
SELECT lives_ok(
  $$UPDATE public.messages SET deleted_at = now() WHERE id='eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'$$,
  't16 sender soft-deletes message (no hard delete)');
SELECT is( (SELECT count(*)::int FROM public.messages WHERE id='eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' AND deleted_at IS NOT NULL), 1, 't16b soft-deleted row remains with deleted_at set');

SELECT * FROM finish();
rollback;
