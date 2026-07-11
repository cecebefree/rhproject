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


-- 039 enrichment/clubs fixtures (P2-018)
-- Club course (teacher1 owns)
insert into public.courses (id, title, price, status, teacher_id, type, open_to_outside)
values ('33333333-3333-3333-3333-333333333333', 'Culinary Club', 0, 'published',
        'cc000000-0000-0000-0000-0000000000c3', 'club', false)
on conflict (id) do nothing;

-- Enrichment course (teacher1 owns, open to outside students)
insert into public.courses (id, title, price, status, teacher_id, type, open_to_outside)
values ('44444444-4444-4444-4444-444444444444', 'Finance 101', 0, 'published',
        'cc000000-0000-0000-0000-0000000000c3', 'enrichment', true)
on conflict (id) do nothing;

-- Golden student enrolled in club + enrichment
insert into public.student_class (student_id, class_id, tenant_id)
values
  ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001'),
  ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001')
on conflict (student_id, class_id) do nothing;

-- Enrichment meta for golden student
insert into public.enrichment_meta
  (tenant_id, student_class_id, pace, completed, total, note)
values
  ('00000000-0000-0000-0000-000000000001',
   (select id from public.student_class where student_id = 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e' and class_id = '44444444-4444-4444-4444-444444444444'),
   'self-paced', 3, 7, 'Starting Term 2')
on conflict (student_class_id) do nothing;

-- outside_student user
insert into auth.users (id, email, aud, role)
values ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'outside@test.local', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.profiles (id, name, role, registration_status, consent_given, tenant_id)
values ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Outside Student', 'outside_student', 'approved', true,
        '00000000-0000-0000-0000-000000000001')
on conflict (id) do update
  set role = excluded.role,
      registration_status = excluded.registration_status,
      consent_given = excluded.consent_given;

-- student2 enrolled in club + enrichment (for CHECK constraint tests)
insert into public.student_class (student_id, class_id, tenant_id)
values
  ('bb000000-0000-0000-0000-0000000000b2', '33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001'),
  ('bb000000-0000-0000-0000-0000000000b2', '44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001')
on conflict (student_id, class_id) do nothing;

-- 040 booklist fixtures (P2-022)
-- Two tenants for cross-tenant leak tests.
-- Two children in tenant 1 (student1, student2), one child in tenant 2.
-- Book catalog: one per curriculum_type, one ebook, one null isbn (in-house material).
-- Fixtures: yearly item, permanent item, revoked permanent, prior-year item.

-- Second tenant (cross-tenant isolation tests)
insert into public.tenant_devotional (id, name, slug, is_active)
values ('00000000-0000-0000-0000-000000000002', 'Second Devotional', 'second-devotional', true)
on conflict (id) do nothing;

insert into public.tenant_lms (id, name, slug, is_active)
values ('00000000-0000-0000-0000-000000000002', 'Second Tenant', 'second', true)
on conflict (id) do nothing;

insert into public.tenant_mobile (id, name, slug, devotional_enabled, devotional_tenant_id, is_active)
values ('00000000-0000-0000-0000-000000000002', 'Second Tenant', 'second', true,
        '00000000-0000-0000-0000-000000000002', true)
on conflict (id) do nothing;

-- Second tenant user + profile
insert into auth.users (id, email, aud, role)
values ('22222222-2222-2222-2222-222222222222', 'other@test.local', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.profiles (id, name, role, registration_status, consent_given, tenant_id)
values ('22222222-2222-2222-2222-222222222222', 'Other Tenant Student', 'student', 'approved', true,
        '00000000-0000-0000-0000-000000000002')
on conflict (id) do update
  set role = excluded.role,
      registration_status = excluded.registration_status,
      consent_given = excluded.consent_given;

-- Book catalog fixtures (tenant 1)
insert into public.book (id, tenant_id, title, curriculum_type, isbn_13)
values
  ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Cambridge Math', 'cambridge', '9781107641114'),
  ('d0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'Reference Bible', 'library', null),
  ('d0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Revoked Dictionary', 'library', '9780198739520'),
  ('d0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
   'Science E-Book', 'ib', '9781108712345')
on conflict (id) do nothing;

insert into public.book (id, tenant_id, title, curriculum_type, isbn_13, ebook_available)
values
  ('d0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
   'Home School Reader', 'home_school', '9781234567890', true)
on conflict (id) do nothing;

-- Book fixtures (tenant 2)
insert into public.book (id, tenant_id, title, curriculum_type, isbn_13)
values
  ('d0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002',
   'Tenant 2 Book', 'library', '9780000000001')
on conflict (id) do nothing;

-- Booklist fixtures for tenant 1, child 1 (student1)
insert into public.booklist (id, tenant_id, child_id, school_year)
values
  ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '2026-2027'),
  ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '2025-2026')
on conflict (tenant_id, child_id, school_year) do nothing;

-- Yearly item (only in 2026-2027)
insert into public.booklist_item (id, tenant_id, booklist_id, book_id, title, source_type, source_id)
values ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
        'Cambridge Math', 'course', '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

-- Permanent item (survives year roll-over)
insert into public.booklist_item (id, tenant_id, booklist_id, book_id, title, source_type, permanent)
values ('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002',
        'Reference Bible', 'course', true)
on conflict (id) do nothing;

-- Revoked permanent item (excluded from bookshelf)
insert into public.booklist_item (id, tenant_id, booklist_id, book_id, title, source_type, permanent, revoked_at)
values ('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
        'Revoked Dictionary', 'course', true, now())
on conflict (id) do nothing;

-- Prior-year yearly item (2025-2026, not permanent)
insert into public.booklist_item (id, tenant_id, booklist_id, book_id, title, source_type, source_id)
values ('c0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001',
        'Cambridge Math', 'course', '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

-- Booklist for child 2 (student2) — cross-child leak test
insert into public.booklist (id, tenant_id, child_id, school_year)
values ('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
        'bb000000-0000-0000-0000-0000000000b2', '2026-2027')
on conflict (tenant_id, child_id, school_year) do nothing;

insert into public.booklist_item (id, tenant_id, booklist_id, book_id, title, source_type)
values ('c0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000004',
        'Science E-Book', 'course')
on conflict (id) do nothing;

-- Tenant 2 booklist (cross-tenant leak test)
insert into public.booklist (id, tenant_id, child_id, school_year)
values ('b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002',
        '22222222-2222-2222-2222-222222222222', '2026-2027')
on conflict (tenant_id, child_id, school_year) do nothing;

insert into public.booklist_item (id, tenant_id, booklist_id, book_id, title, source_type)
values ('c0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000006',
        'Tenant 2 Book', 'course')
on conflict (id) do nothing;

-- Family member (guardian for student1 and student2)
insert into auth.users (id, email, aud, role)
values ('a0000000-0000-0000-0000-0000000000a1', 'guardian@test.local', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.profiles (id, name, role, registration_status, consent_given, tenant_id)
values ('a0000000-0000-0000-0000-0000000000a1', 'Test Guardian', 'family', 'approved', true,
        '00000000-0000-0000-0000-000000000001')
on conflict (id) do update
  set role = excluded.role,
      registration_status = excluded.registration_status,
      consent_given = excluded.consent_given;

-- Link guardian to both children
insert into public.family_child (guardian_id, child_id)
values
  ('a0000000-0000-0000-0000-0000000000a1', 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'),
  ('a0000000-0000-0000-0000-0000000000a1', 'bb000000-0000-0000-0000-0000000000b2')
on conflict (guardian_id, child_id) do nothing;

-- Second family member (guardian with no links, for family_child leak test)
insert into auth.users (id, email, aud, role)
values ('a0000000-0000-0000-0000-0000000000a2', 'guardian2@test.local', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.profiles (id, name, role, registration_status, consent_given, tenant_id)
values ('a0000000-0000-0000-0000-0000000000a2', 'Unlinked Guardian', 'family', 'approved', true,
        '00000000-0000-0000-0000-000000000001')
on conflict (id) do update
  set role = excluded.role,
      registration_status = excluded.registration_status,
      consent_given = excluded.consent_given;

-- 041 announcement fixtures (P2-025)

-- Tenant 1 announcements (5 total)
-- Everyone-announcement (live, no audience restriction)
insert into public.announcement (id, tenant_id, title, body, audience_roles, publish_at, expires_at, pinned, created_by)
values ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
        'School Reopening', 'School reopens on Monday.', '{}',
        now() - interval '2 days', null, false,
        'dd000000-0000-0000-0000-0000000000d4')
on conflict (id) do nothing;

-- Teacher-only (live, restricted to teacher role)
insert into public.announcement (id, tenant_id, title, body, audience_roles, publish_at, expires_at, pinned, created_by)
values ('a1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
        'Staff Meeting', 'Staff meeting Friday.', '{teacher}',
        now() - interval '1 day', null, false,
        'dd000000-0000-0000-0000-0000000000d4')
on conflict (id) do nothing;

-- Future-dated (invisible to non-admin until publish date)
insert into public.announcement (id, tenant_id, title, body, audience_roles, publish_at, expires_at, pinned, created_by)
values ('a1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
        'Upcoming Event', 'Save the date!', '{}',
        now() + interval '30 days', null, false,
        'dd000000-0000-0000-0000-0000000000d4')
on conflict (id) do nothing;

-- Expired (invisible to non-admin after expiry)
insert into public.announcement (id, tenant_id, title, body, audience_roles, publish_at, expires_at, pinned, created_by)
values ('a1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
        'Expired Notice', 'This notice has expired.', '{}',
        now() - interval '10 days', now() - interval '1 day', false,
        'dd000000-0000-0000-0000-0000000000d4')
on conflict (id) do nothing;

-- Pinned (live, pinned)
insert into public.announcement (id, tenant_id, title, body, audience_roles, publish_at, expires_at, pinned, created_by)
values ('a1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
        'Important Announcement', 'Please read this pinned notice.', '{}',
        now() - interval '3 days', null, true,
        'dd000000-0000-0000-0000-0000000000d4')
on conflict (id) do nothing;

-- Tenant 2 announcement (1 live)
insert into public.announcement (id, tenant_id, title, body, audience_roles, publish_at, expires_at, pinned, created_by)
values ('a1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002',
        'Tenant 2 Welcome', 'Welcome to the second tenant.', '{}',
        now() - interval '1 day', null, false,
        '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;
