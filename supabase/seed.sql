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
