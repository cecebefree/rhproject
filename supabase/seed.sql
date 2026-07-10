-- seed.sql — Redhouse = Tenant #1 across all 3 registries
-- Source: spec.md §11 (Seed Strategy)
-- CTO verdict: Option A — same UUID across all registries
-- Idempotent: INSERT ... ON CONFLICT DO NOTHING
-- FK order: devotional BEFORE mobile (mobile FKs to devotional)

BEGIN;

-- ─────────────────────────────────────────────
-- 1. TENANT DEVOTIONAL (standalone — no FK deps)
-- ─────────────────────────────────────────────
INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Redhouse Devotional',
    'redhouse-devotional',
    true,
    now(),
    now()
)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- 2. TENANT LMS (grouped LMS + Mobile)
-- ─────────────────────────────────────────────
INSERT INTO public.tenant_lms (id, name, slug, schedule_view_mode, is_active, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Redhouse',
    'redhouse',
    'combined',
    true,
    now(),
    now()
)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- 3. TENANT MOBILE (has devotional pointer)
-- ─────────────────────────────────────────────
INSERT INTO public.tenant_mobile (id, name, slug, devotional_enabled, devotional_tenant_id, is_active, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Redhouse',
    'redhouse',
    true,
    '00000000-0000-0000-0000-000000000001'::uuid,
    true,
    now(),
    now()
)
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- ── 028 test fixtures: students + admin + teacher + courses + enrolments ──
insert into auth.users (id, email, aud, role)
values
  ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', 'stud1@test.local',   'authenticated', 'authenticated'),
  ('bb000000-0000-0000-0000-0000000000b2', 'stud2@test.local',   'authenticated', 'authenticated'),
  ('cc000000-0000-0000-0000-0000000000c3', 'teacher1@test.local','authenticated', 'authenticated'),
  ('dd000000-0000-0000-0000-0000000000d4', 'admin@test.local',   'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.profiles (id, name, role, registration_status, consent_given)
values
  ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', 'Test Student One', 'student', 'approved', true),
  ('bb000000-0000-0000-0000-0000000000b2', 'Test Student Two', 'student', 'approved', true),
  ('cc000000-0000-0000-0000-0000000000c3', 'Test Teacher One', 'teacher', 'approved', true),
  ('dd000000-0000-0000-0000-0000000000d4', 'Test Admin',       'admin',   'approved', true)
on conflict (id) do update
  set role = excluded.role,
      registration_status = excluded.registration_status,
      consent_given = excluded.consent_given;

insert into public.courses (id, title, price, status, teacher_id)
values
  ('11111111-1111-1111-1111-111111111111', 'Test Course One', 0, 'published', 'cc000000-0000-0000-0000-0000000000c3'),
  ('22222222-2222-2222-2222-222222222222', 'Test Course Two', 0, 'published', 'cc000000-0000-0000-0000-0000000000c3')
on conflict (id) do nothing;

insert into public.student_class (student_id, class_id, tenant_id)
values
  ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001'),
  ('bb000000-0000-0000-0000-0000000000b2', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001'),
  ('bb000000-0000-0000-0000-0000000000b2', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001')
on conflict (student_id, class_id) do nothing;

-- 032 access-window fixtures: Core flag + yearly window + paid enrolments
update public.profiles
  set has_core = true,
      access_starts_at = now() - interval '1 day',
      access_ends_at   = now() + interval '365 days'
where id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e';

update public.profiles
  set has_core = false,
      access_starts_at = now() - interval '1 day',
      access_ends_at   = now() + interval '365 days'
where id = 'bb000000-0000-0000-0000-0000000000b2';

insert into public.enrollments (student_id, course_id, payment_reference)
values
  ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '11111111-1111-1111-1111-111111111111', 'seed-paid-001'),
  ('bb000000-0000-0000-0000-0000000000b2', '22222222-2222-2222-2222-222222222222', 'seed-paid-002')
on conflict (student_id, course_id) do nothing;

-- platform_access fixtures for P2-023
-- student1 = core + enrichment open; student2 = enrichment only
insert into public.platform_access
  (user_id, tenant_id, platform, access_starts_at, access_ends_at)
values
  ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e',
   (select tenant_id from public.profiles where id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'),
   'core', now() - interval '1 day', now() + interval '300 days'),
  ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e',
   (select tenant_id from public.profiles where id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'),
   'enrichment', now() - interval '1 day', now() + interval '300 days'),
  ('bb000000-0000-0000-0000-0000000000b2',
   (select tenant_id from public.profiles where id = 'bb000000-0000-0000-0000-0000000000b2'),
   'enrichment', now() - interval '1 day', now() + interval '300 days');

-- 036 notifications fixtures (P2-017)
-- read_at is deliberately left null (unread) -- test 4 depends on it.
insert into public.notifications (id, user_id, tenant_id, type, title, body)
values
  ('aaaa0000-0000-0000-0000-0000000000a1',
   'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e',
   (select tenant_id from public.profiles
      where id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'),
   'announcement', 'Welcome stud1', 'Seed notification for student1'),
  ('aaaa0000-0000-0000-0000-0000000000a2',
   'bb000000-0000-0000-0000-0000000000b2',
   (select tenant_id from public.profiles
      where id = 'bb000000-0000-0000-0000-0000000000b2'),
   'system', 'Welcome stud2', 'Seed notification for student2')
on conflict (id) do nothing;


-- 037 schedule fixtures (P2-012)
-- Term aligned with 032 access-window fixtures (student access: now()-1d to now()+365d)
insert into public.terms (id, tenant_id, name, start_date, end_date)
values
  ('cccc0000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-000000000001',
   '2024-25 Academic Year',
   (now() - interval '1 day')::date,
   (now() + interval '300 days')::date)
on conflict (id) do nothing;

insert into public.schedule_slot
  (id, tenant_id, course_id, term_id, label, start_time, end_time, days_of_week)
values
  ('bbbb0000-0000-0000-0000-0000000000b1',
   '00000000-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'cccc0000-0000-0000-0000-0000000000c1',
   'Section A',
   '09:00', '10:00',
   ARRAY[1,3,5]),
  ('bbbb0000-0000-0000-0000-0000000000b2',
   '00000000-0000-0000-0000-000000000001',
   '22222222-2222-2222-2222-222222222222',
   'cccc0000-0000-0000-0000-0000000000c1',
   'Section B',
   '10:30', '11:30',
   ARRAY[2,4])
on conflict (id) do nothing;

-- teacher2 with no courses (for test 5)
insert into auth.users (id, email, aud, role)
values ('eeee0000-0000-0000-0000-0000000000e5', 'teacher2@test.local', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.profiles (id, name, role, registration_status, consent_given, tenant_id)
values ('eeee0000-0000-0000-0000-0000000000e5', 'Test Teacher Two', 'teacher', 'approved', true,
        '00000000-0000-0000-0000-000000000001')
on conflict (id) do update
  set role = excluded.role,
      registration_status = excluded.registration_status,
      consent_given = excluded.consent_given;

