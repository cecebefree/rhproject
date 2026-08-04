-- seed_consoles.sql — Row 37/38 console seed data
-- Teacher with course + schedule slots, 2 learners enrolled, office users in both tenants.
-- Zero pre-made report cards (Row 38 must CREATE via rc_office_insert).
-- Idempotent: INSERT ... ON CONFLICT DO NOTHING.
-- Tenant 1 = Redhouse (00000000-0000-0000-0000-000000000001)
-- Tenant 2 = Second (00000000-0000-0000-0000-000000000002)

BEGIN;

-- ─────────────────────────────────────────────
-- 1. AUTH USERS (deterministic UUIDs)
-- ─────────────────────────────────────────────

-- Teacher in tenant 1
INSERT INTO auth.users (id, email, aud, role)
VALUES ('11111111-1111-1111-1111-111111111111', 'seed-teacher@redhouse.test', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Office user in tenant 1
INSERT INTO auth.users (id, email, aud, role)
VALUES ('33333333-3333-3333-3333-333333333331', 'seed-office@redhouse.test', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Office user in tenant 2
INSERT INTO auth.users (id, email, aud, role)
VALUES ('33333333-3333-3333-3333-333333333332', 'seed-office2@second.test', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Learner 1 in tenant 1 (uses existing student from booklist)
INSERT INTO auth.users (id, email, aud, role)
VALUES ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', 'seed-learner1@redhouse.test', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Learner 2 in tenant 1 (uses existing student from booklist)
INSERT INTO auth.users (id, email, aud, role)
VALUES ('bb000000-0000-0000-0000-0000000000b2', 'seed-learner2@redhouse.test', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 2. PROFILES
-- ─────────────────────────────────────────────

-- Teacher profile (tenant 1)
INSERT INTO public.profiles (id, name, role, registration_status, consent_given, tenant_id)
VALUES ('11111111-1111-1111-1111-111111111111', 'Seed Teacher', 'teacher', 'approved', true,
        '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE
  SET role = excluded.role,
      registration_status = excluded.registration_status,
      consent_given = excluded.consent_given;

-- Office profile (tenant 1)
INSERT INTO public.profiles (id, name, role, registration_status, consent_given, tenant_id)
VALUES ('33333333-3333-3333-3333-333333333331', 'Seed Office', 'office', 'approved', true,
        '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE
  SET role = excluded.role,
      registration_status = excluded.registration_status,
      consent_given = excluded.consent_given;

-- Office profile (tenant 2)
INSERT INTO public.profiles (id, name, role, registration_status, consent_given, tenant_id)
VALUES ('33333333-3333-3333-3333-333333333332', 'Seed Office 2', 'office', 'approved', true,
        '00000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO UPDATE
  SET role = excluded.role,
      registration_status = excluded.registration_status,
      consent_given = excluded.consent_given;

-- Learner 1 profile (tenant 1)
INSERT INTO public.profiles (id, name, role, registration_status, consent_given, tenant_id)
VALUES ('ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', 'Seed Learner 1', 'student', 'approved', true,
        '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE
  SET role = excluded.role,
      registration_status = excluded.registration_status,
      consent_given = excluded.consent_given;

-- Learner 2 profile (tenant 1)
INSERT INTO public.profiles (id, name, role, registration_status, consent_given, tenant_id)
VALUES ('bb000000-0000-0000-0000-0000000000b2', 'Seed Learner 2', 'student', 'approved', true,
        '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE
  SET role = excluded.role,
      registration_status = excluded.registration_status,
      consent_given = excluded.consent_given;

-- ─────────────────────────────────────────────
-- 3. COURSES (teacher-owned, tenant 1)
-- ─────────────────────────────────────────────

-- Course 1: Mathematics (published)
INSERT INTO public.courses (id, title, description, price, status, teacher_id)
VALUES ('55555555-5555-5555-5555-555555555551', 'Seed Mathematics', 'Test course for console evidence', 0.00, 'published',
        '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Course 2: Science (published)
INSERT INTO public.courses (id, title, description, price, status, teacher_id)
VALUES ('55555555-5555-5555-5555-555555555552', 'Seed Science', 'Test course for console evidence', 0.00, 'published',
        '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 4. SCHEDULE SLOTS (2 slots per course)
-- ─────────────────────────────────────────────

-- Course 1, Slot 1: Mon/Wed 9:00-10:00
INSERT INTO public.schedule_slot (id, tenant_id, course_id, term_id, label, start_time, end_time, days_of_week)
VALUES ('66666666-6666-6666-6666-666666666661',
        '00000000-0000-0000-0000-000000000001',
        '55555555-5555-5555-5555-555555555551',
        'cccc0000-0000-0000-0000-0000000000c1',
        'Section A',
        '09:00:00', '10:00:00',
        ARRAY[1, 3])
ON CONFLICT (id) DO NOTHING;

-- Course 1, Slot 2: Tue/Thu 10:00-11:00
INSERT INTO public.schedule_slot (id, tenant_id, course_id, term_id, label, start_time, end_time, days_of_week)
VALUES ('66666666-6666-6666-6666-666666666662',
        '00000000-0000-0000-0000-000000000001',
        '55555555-5555-5555-5555-555555555551',
        'cccc0000-0000-0000-0000-0000000000c1',
        'Section B',
        '10:00:00', '11:00:00',
        ARRAY[2, 4])
ON CONFLICT (id) DO NOTHING;

-- Course 2, Slot 1: Mon/Wed 11:00-12:00
INSERT INTO public.schedule_slot (id, tenant_id, course_id, term_id, label, start_time, end_time, days_of_week)
VALUES ('66666666-6666-6666-6666-666666666663',
        '00000000-0000-0000-0000-000000000001',
        '55555555-5555-5555-5555-555555555552',
        'cccc0000-0000-0000-0000-0000000000c1',
        'Lab Section',
        '11:00:00', '12:00:00',
        ARRAY[1, 3])
ON CONFLICT (id) DO NOTHING;

-- Course 2, Slot 2: Fri 14:00-15:00
INSERT INTO public.schedule_slot (id, tenant_id, course_id, term_id, label, start_time, end_time, days_of_week)
VALUES ('66666666-6666-6666-6666-666666666664',
        '00000000-0000-0000-0000-000000000001',
        '55555555-5555-5555-5555-555555555552',
        'cccc0000-0000-0000-0000-0000000000c1',
        'Friday Review',
        '14:00:00', '15:00:00',
        ARRAY[5])
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 5. STUDENT CLASS ENROLLMENTS
-- ─────────────────────────────────────────────

-- Learner 1 enrolled in Course 1
INSERT INTO public.student_class (id, student_id, class_id, tenant_id)
VALUES ('77777777-7777-7777-7777-777777777771',
        'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e',
        '55555555-5555-5555-5555-555555555551',
        '00000000-0000-0000-0000-000000000001')
ON CONFLICT (student_id, class_id) DO NOTHING;

-- Learner 2 enrolled in Course 1
INSERT INTO public.student_class (id, student_id, class_id, tenant_id)
VALUES ('77777777-7777-7777-7777-777777777772',
        'bb000000-0000-0000-0000-0000000000b2',
        '55555555-5555-5555-5555-555555555551',
        '00000000-0000-0000-0000-000000000001')
ON CONFLICT (student_id, class_id) DO NOTHING;

-- Learner 1 enrolled in Course 2
INSERT INTO public.student_class (id, student_id, class_id, tenant_id)
VALUES ('77777777-7777-7777-7777-777777777773',
        'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e',
        '55555555-5555-5555-5555-555555555552',
        '00000000-0000-0000-0000-000000000001')
ON CONFLICT (student_id, class_id) DO NOTHING;

-- Learner 2 enrolled in Course 2
INSERT INTO public.student_class (id, student_id, class_id, tenant_id)
VALUES ('77777777-7777-7777-7777-777777777774',
        'bb000000-0000-0000-0000-0000000000b2',
        '55555555-5555-5555-5555-555555555552',
        '00000000-0000-0000-0000-000000000001')
ON CONFLICT (student_id, class_id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 6. TENANT 2 CROSS-TERM CONTROL
-- ─────────────────────────────────────────────

-- Tenant 2 student (for cross-tenant isolation test)
INSERT INTO auth.users (id, email, aud, role)
VALUES ('22222222-2222-2222-2222-222222222222', 'seed-learner-tenant2@second.test', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Tenant 2 term (for cross-tenant isolation test)
INSERT INTO public.terms (id, tenant_id, name, start_date, end_date)
VALUES ('cccc0000-0000-0000-0000-0000000000c2',
        '00000000-0000-0000-0000-000000000002',
        '2024-25 Second Term',
        (now() - interval '1 day')::date,
        (now() + interval '300 days')::date)
ON CONFLICT (id) DO NOTHING;

-- Tenant 2 course (owned by tenant 2 office user)
INSERT INTO public.courses (id, title, description, price, status, teacher_id)
VALUES ('55555555-5555-5555-5555-555555555553', 'Tenant 2 Course', 'Cross-tenant isolation test', 0.00, 'published',
        '33333333-3333-3333-3333-333333333332')
ON CONFLICT (id) DO NOTHING;

-- Tenant 2 schedule slot
INSERT INTO public.schedule_slot (id, tenant_id, course_id, term_id, label, start_time, end_time, days_of_week)
VALUES ('66666666-6666-6666-6666-666666666665',
        '00000000-0000-0000-0000-000000000002',
        '55555555-5555-5555-5555-555555555553',
        'cccc0000-0000-0000-0000-0000000000c2',
        'Tenant 2 Slot',
        '09:00:00', '10:00:00',
        ARRAY[1, 2, 3, 4, 5])
ON CONFLICT (id) DO NOTHING;

-- Tenant 2 student enrolled in tenant 2 course
INSERT INTO public.student_class (id, student_id, class_id, tenant_id)
VALUES ('77777777-7777-7777-7777-777777777775',
        '22222222-2222-2222-2222-222222222222',
        '55555555-5555-5555-5555-555555555553',
        '00000000-0000-0000-0000-000000000002')
ON CONFLICT (student_id, class_id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 7. ZERO REPORT CARDS (Row 38 must CREATE)
-- ─────────────────────────────────────────────
-- No report_cards inserts. The Office Desk flow must create its own
-- via rc_office_insert (migration 088).

COMMIT;
