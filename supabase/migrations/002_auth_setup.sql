-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 002: Auth Setup — Users Table, Auth Hook, JWT Claims, Test Users
-- ══════════════════════════════════════════════════════════════════════════════
--
-- ARCHITECTURE OVERVIEW:
-- ─────────────────────
-- 1. public.users — Application-level user table with role + FK to students/parents
-- 2. Auth Hook — Trigger on auth.users INSERT creates public.users row
--    Role assigned by email domain: +admin@, +school@, +student@, +parent@
-- 3. JWT Claims — custom_access_token_hook extended to emit role, student_id,
--    parent_id into app_metadata so RLS policies can read them
-- 4. RLS — 4 roles (office_desk_admin, school_desk_admin, student, parent)
--    scoped via auth.jwt()->'app_metadata'->>'role' and auth.uid()
-- 5. Test Users — 4 pre-created users for RLS validation tests
--
-- RELATIONSHIP TO EXISTING SCHEMA:
-- ────────────────────────────────
-- - public.profiles (013) remains for LMS/legacy roles (student, teacher, admin)
-- - public.users is the NEW enrollment system role source (office_desk_admin, etc.)
-- - custom_access_token_hook (092) is EXTENDED (not replaced) to also emit
--   office_desk claims from public.users alongside existing profiles claims
-- - Existing RLS policies on students/payments/invoices/etc. continue to work
--   via profiles.role; NEW policies for public.users table use users.role
--
-- ROLE ASSIGNMENT LOGIC (email domain):
-- ─────────────────────────────────────
-- email LIKE '%+admin@%'  → office_desk_admin  (full CRUD on all tables)
-- email LIKE '%+school@%' → school_desk_admin   (read-only on most tables)
-- email LIKE '%+student@%'→ student             (own records only)
-- email LIKE '%+parent@%' → parent              (own + children's records)
-- Default (no match)      → student
--
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. TABLE: public.users
-- ══════════════════════════════════════════════════════════════════════════════
-- Application-level user record. Created automatically via trigger on auth.users.
-- Links auth identity → role → student/parent FK → organization.
--
-- FK targets:
--   id             → auth.users(id)          (Supabase auth identity)
--   student_id     → public.students(id)     (optional, for student role)
--   parent_id      → public.parents(id)      (optional, for parent role)
--   organization_id→ supabase.organizations(id) (tenant/org scoping)
--   created_by     → auth.users(id)          (audit: who created this record)
--   updated_by     → auth.users(id)          (audit: who last modified)

DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text UNIQUE NOT NULL,
  role            text NOT NULL
    CHECK (role IN ('office_desk_admin', 'school_desk_admin', 'student', 'parent')),
  student_id      uuid REFERENCES public.students(id) ON DELETE SET NULL,
  parent_id       uuid REFERENCES public.parents(id) ON DELETE SET NULL,
  organization_id uuid NOT NULL REFERENCES supabase.organizations(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.users IS
  'Application-level user records for enrollment system. Role assigned via email domain on signup.';
COMMENT ON COLUMN public.users.role IS
  'office_desk_admin | school_desk_admin | student | parent — assigned by email domain';
COMMENT ON COLUMN public.users.student_id IS
  'FK to students(id) — populated for student role users';
COMMENT ON COLUMN public.users.parent_id IS
  'FK to parents(id) — populated for parent role users';
COMMENT ON COLUMN public.users.organization_id IS
  'FK to supabase.organizations — tenant/org scoping';

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. INDEXES
-- ══════════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_users_email ON public.users (email);
CREATE INDEX idx_users_role ON public.users (role);
CREATE INDEX idx_users_organization_id ON public.users (organization_id);
CREATE INDEX idx_users_student_id ON public.users (student_id)
  WHERE student_id IS NOT NULL;
CREATE INDEX idx_users_parent_id ON public.users (parent_id)
  WHERE parent_id IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. TRIGGER FUNCTION: handle_auth_user_created()
-- ══════════════════════════════════════════════════════════════════════════════
-- Fires AFTER INSERT on auth.users.
-- Creates a public.users row with role derived from email domain.
--
-- ROLE DERIVATION:
--   email LIKE '%+admin@%'  → 'office_desk_admin'
--   email LIKE '%+school@%' → 'school_desk_admin'
--   email LIKE '%+student@%'→ 'student'
--   email LIKE '%+parent@%' → 'parent'
--   default                 → 'student'
--
-- FK LOOKUP:
--   For +student@: looks up public.students by email (if match found)
--   For +parent@:  looks up public.parents by email (if match found)
--   organization_id: uses first org from supabase.organizations (or hardcode)

CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _role text;
  _org_id uuid;
  _student_id uuid;
  _parent_id uuid;
  _user_email text;
BEGIN
  _user_email := NEW.email;

  -- ── Role derivation from email domain ──
  IF _user_email LIKE '%+admin@%' THEN
    _role := 'office_desk_admin';
  ELSIF _user_email LIKE '%+school@%' THEN
    _role := 'school_desk_admin';
  ELSIF _user_email LIKE '%+student@%' THEN
    _role := 'student';
  ELSIF _user_email LIKE '%+parent@%' THEN
    _role := 'parent';
  ELSE
    _role := 'student';
  END IF;

  -- ── Organization: use first org or hardcode test UUID ──
  SELECT id INTO _org_id
    FROM supabase.organizations
   ORDER BY created_at ASC
   LIMIT 1;

  IF _org_id IS NULL THEN
    _org_id := '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;

  -- ── Student FK lookup (for +student@ emails) ──
  _student_id := NULL;
  IF _role = 'student' THEN
    SELECT s.id INTO _student_id
      FROM public.students s
     WHERE s.first_name || '.' || s.last_name || '@%' LIKE _user_email
        OR s.id::text = (NEW.raw_user_meta_data->>'student_id')
     LIMIT 1;
  END IF;

  -- ── Parent FK lookup (for +parent@ emails) ──
  _parent_id := NULL;
  IF _role = 'parent' THEN
    SELECT p.id INTO _parent_id
      FROM public.parents p
     WHERE p.email = _user_email
     LIMIT 1;
  END IF;

  -- ── Insert into public.users ──
  INSERT INTO public.users (
    id, email, role, student_id, parent_id,
    organization_id, created_by, updated_by
  ) VALUES (
    NEW.id,
    _user_email,
    _role,
    _student_id,
    _parent_id,
    _org_id,
    NEW.id,
    NEW.id
  );

  -- ── Notify realtime channel ──
  PERFORM pg_notify(
    'auth_user_created',
    json_build_object(
      'user_id', NEW.id,
      'role', _role,
      'email', _user_email
    )::text
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_auth_user_created() IS
  'AFTER INSERT on auth.users: creates public.users row with role from email domain.';

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. TRIGGER: on_auth_user_created
-- ══════════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_created();

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. TRIGGER FUNCTION: handle_users_updated_at()
-- ══════════════════════════════════════════════════════════════════════════════
-- Auto-update updated_at on any row modification.

CREATE OR REPLACE FUNCTION public.handle_users_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_users_updated ON public.users;
CREATE TRIGGER on_users_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_users_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. JWT CLAIMS HOOK: Extend custom_access_token_hook()
-- ══════════════════════════════════════════════════════════════════════════════
-- Extends existing hook (migration 092) to ALSO emit enrollment system claims:
--   app_metadata.role         → from public.users (enrollment role)
--   app_metadata.student_id   → from public.users.student_id (for student role)
--   app_metadata.parent_id    → from public.users.parent_id (for parent role)
--
-- The existing profiles.role → app_metadata.role emission from 092 remains.
-- If a user exists in BOTH profiles AND users, the users table wins (enrollment
-- system takes precedence for enrollment RLS policies).
--
-- JWT claim paths consumed by RLS:
--   auth.jwt() -> 'app_metadata' ->> 'role'        → office_desk_admin etc.
--   auth.jwt() -> 'app_metadata' ->> 'student_id'   → UUID string
--   auth.jwt() -> 'app_metadata' ->> 'parent_id'    → UUID string

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
  _tenant_id uuid;
  _profile_role text;
  _users_role text;
  _student_id uuid;
  _parent_id uuid;
BEGIN
  _user_id := (event->'claims'->>'sub')::uuid;

  -- ── Read from profiles (existing 092 behavior) ──
  SELECT p.tenant_id, p.role
    INTO _tenant_id, _profile_role
    FROM public.profiles p
   WHERE p.id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'custom_access_token_hook: no profile row for user %', _user_id;
  END IF;

  -- ── Read from users (enrollment system — new in 002) ──
  SELECT u.role, u.student_id, u.parent_id
    INTO _users_role, _student_id, _parent_id
    FROM public.users u
   WHERE u.id = _user_id;

  -- users row is optional; if not found, fall back to profile role only
  IF NOT FOUND THEN
    _users_role := NULL;
    _student_id := NULL;
    _parent_id := NULL;
  END IF;

  -- ── Emit claims ──
  -- Root level: tenant_id (fixes 58 RLS policies per 085)
  event := jsonb_set(event, '{claims,tenant_id}', to_jsonb(_tenant_id));

  -- app_metadata: merge profile + enrollment claims
  -- Enrollment role overrides profile role when present
  event := jsonb_set(
    event,
    '{claims,app_metadata}',
    COALESCE(event->'claims'->'app_metadata', '{}'::jsonb)
      || jsonb_build_object(
           'tenant_id', _tenant_id,
           'role', COALESCE(_users_role, _profile_role),
           'student_id', _student_id,
           'parent_id', _parent_id
         )
  );

  RETURN event;
END;
$function$;

-- Re-grant execute (may already exist from 092, safe to re-grant)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. ROW-LEVEL SECURITY: public.users
-- ══════════════════════════════════════════════════════════════════════════════
-- 4 roles × CRUD permissions:
--
-- office_desk_admin:  SELECT, INSERT, UPDATE, DELETE all rows (no WHERE filter)
-- school_desk_admin:  SELECT all rows (read-only, no write policies)
-- student:            SELECT own row only (WHERE id = auth.uid())
-- parent:             SELECT own row only (WHERE id = auth.uid())

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ── office_desk_admin: full CRUD ──

CREATE POLICY users_oda_select
  ON public.users FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'office_desk_admin'
  );

CREATE POLICY users_oda_insert
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'office_desk_admin'
  );

CREATE POLICY users_oda_update
  ON public.users FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'office_desk_admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'office_desk_admin'
  );

CREATE POLICY users_oda_delete
  ON public.users FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'office_desk_admin'
  );

-- ── school_desk_admin: read-only ──

CREATE POLICY users_sda_select
  ON public.users FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'school_desk_admin'
  );

-- ── student: own row only ──

CREATE POLICY users_student_select
  ON public.users FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'student'
  );

-- ── parent: own row only ──

CREATE POLICY users_parent_select
  ON public.users FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'parent'
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. RLS POLICIES: students, payments, audit_log (confirm/extend 001)
-- ══════════════════════════════════════════════════════════════════════════════
-- These policies already exist in 001_init_schema.sql. Listed here for
-- documentation and to confirm they use the correct JWT claim path.
--
-- IMPORTANT: The existing 001 policies use auth.jwt() -> 'app_metadata' ->> 'role'
-- which is the canonical path set by custom_access_token_hook.
--
-- STUDENTS table policies (from 001):
--   oda_students_all:      office_desk_admin → FOR ALL (full CRUD)
--   sda_students_select:   school_desk_admin → SELECT only
--   student_select_own:    student → SELECT WHERE id = auth.uid()
--   parent_students_select: parent → SELECT via parents table JOIN
--
-- PAYMENTS table policies (from 001):
--   oda_payments_all:      office_desk_admin → FOR ALL
--   sda_payments_select:   school_desk_admin → SELECT only
--   student_payments_select: student → SELECT WHERE student_id = auth.uid()
--   parent_payments_select:  parent → SELECT via parents table JOIN
--
-- AUDIT_LOG table policies (from 001):
--   oda_audit_select:      office_desk_admin → SELECT only
--   (no other roles have access — audit_log is admin-only)

-- ══════════════════════════════════════════════════════════════════════════════
-- 9. REALTIME: auth_events channel
-- ══════════════════════════════════════════════════════════════════════════════
-- Enables realtime on the users table for live auth event tracking.

ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- ══════════════════════════════════════════════════════════════════════════════
-- 10. TRIGGER FUNCTION: handle_role_change_notify()
-- ══════════════════════════════════════════════════════════════════════════════
-- Publishes role changes to pg_notify channel 'auth_events' for realtime
-- subscription clients.

CREATE OR REPLACE FUNCTION public.handle_role_change_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    PERFORM pg_notify(
      'auth_events',
      json_build_object(
        'event', 'role_changed',
        'user_id', NEW.id,
        'old_role', OLD.role,
        'new_role', NEW.role,
        'timestamp', now()
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_role_change_notify ON public.users;
CREATE TRIGGER on_role_change_notify
  AFTER UPDATE ON public.users
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.handle_role_change_notify();

-- ══════════════════════════════════════════════════════════════════════════════
-- 11. GRANTS
-- ══════════════════════════════════════════════════════════════════════════════

GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- 12. TEST ORGANIZATION
-- ══════════════════════════════════════════════════════════════════════════════
-- Create a test organization for test users. Uses ON CONFLICT to be idempotent.

INSERT INTO supabase.organizations (id, name, slug)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Redhouse Test Org',
  'redhouse-test'
)
ON CONFLICT (slug) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- 13. TEST STUDENT AND PARENT (FK targets for test users)
-- ══════════════════════════════════════════════════════════════════════════════
-- Create test student record that Alice's auth user will link to.

INSERT INTO public.students (
  id, first_name, last_name, grade,
  academic_group_id, enrollment_status, enrollment_date
) VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Alice', 'Student', '10',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'active', now()
)
ON CONFLICT (id) DO NOTHING;

-- Create test parent record that Bob's auth user will link to.

INSERT INTO public.parents (
  id, student_id, email, first_name, last_name,
  primary_contact
) VALUES (
  '22222222-2222-2222-2222-222222222222'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'bob+parent@redhouse.local',
  'Bob', 'Parent', true
)
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- 14. TEST USERS — 4 role variants via raw auth.users INSERT
-- ══════════════════════════════════════════════════════════════════════════════
-- Passwords are hashed with bcrypt (Supabase default).
-- These users are created via service_role INSERT into auth.users,
-- which bypasses RLS and triggers the on_auth_user_created trigger.
--
-- IMPORTANT: In production, users sign up via Supabase Auth API.
-- These test users are created directly for RLS test validation.
--
-- PASSWORD REFERENCE (plaintext for tests):
--   admin:   TestAdmin123!
--   school:  TestSchool123!
--   student: TestStudent123!
--   parent:  TestParent123!

-- ────────────────────────────────────────────────────────────────────────────
-- USER 1: office_desk_admin
-- Email: admin+admin@redhouse.local
-- Trigger derivation: +admin@ → office_desk_admin
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, role, instance_id, aud, confirmation_token
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'admin+admin@redhouse.local',
  crypt('TestAdmin123!', gen_salt('bf')),
  now(),
  '{"name": "Admin User"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  now(), now(),
  'authenticated',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  encode(gen_random_bytes(32), 'hex')
)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- USER 2: school_desk_admin
-- Email: school+school@redhouse.local
-- Trigger derivation: +school@ → school_desk_admin
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, role, instance_id, aud, confirmation_token
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'school+school@redhouse.local',
  crypt('TestSchool123!', gen_salt('bf')),
  now(),
  '{"name": "School Admin User"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  now(), now(),
  'authenticated',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  encode(gen_random_bytes(32), 'hex')
)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- USER 3: student
-- Email: alice+student@redhouse.local
-- Trigger derivation: +student@ → student, student_id → Alice's student record
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, role, instance_id, aud, confirmation_token
) VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  'alice+student@redhouse.local',
  crypt('TestStudent123!', gen_salt('bf')),
  now(),
  '{"name": "Alice Student", "student_id": "11111111-1111-1111-1111-111111111111"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  now(), now(),
  'authenticated',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  encode(gen_random_bytes(32), 'hex')
)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- USER 4: parent
-- Email: bob+parent@redhouse.local
-- Trigger derivation: +parent@ → parent, parent_id → Bob's parent record
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, role, instance_id, aud, confirmation_token
) VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  'bob+parent@redhouse.local',
  crypt('TestParent123!', gen_salt('bf')),
  now(),
  '{"name": "Bob Parent"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  now(), now(),
  'authenticated',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  encode(gen_random_bytes(32), 'hex')
)
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- 15. SEED PROFILES for test users (required by custom_access_token_hook 092)
-- ══════════════════════════════════════════════════════════════════════════════
-- The hook (092) RAISEs EXCEPTION if no profiles row exists.
-- We must create profiles rows so JWT generation succeeds.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    INSERT INTO public.profiles (id, name, role, tenant_id)
    VALUES
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Admin User', 'admin',
       '00000000-0000-0000-0000-000000000001'::uuid),
      ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'School Admin User', 'admin',
       '00000000-0000-0000-0000-000000000001'::uuid),
      ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'Alice Student', 'student',
       '00000000-0000-0000-0000-000000000001'::uuid),
      ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'Bob Parent', 'student',
       '00000000-0000-0000-0000-000000000001'::uuid)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 16. VALIDATION NOTES
-- ══════════════════════════════════════════════════════════════════════════════
--
-- HOW ROLE IS ASSIGNED (email domain):
-- ────────────────────────────────────
-- The on_auth_user_created trigger fires on every auth.users INSERT.
-- It reads NEW.email and pattern-matches:
--   '%+admin@%'  → office_desk_admin  (e.g., admin+admin@redhouse.local)
--   '%+school@%' → school_desk_admin  (e.g., school+school@redhouse.local)
--   '%+student@%'→ student            (e.g., alice+student@redhouse.local)
--   '%+parent@%' → parent             (e.g., bob+parent@redhouse.local)
--   default      → student
--
-- HOW JWT CLAIMS ARE EMBEDDED:
-- ────────────────────────────
-- custom_access_token_hook (extended in this migration) reads both:
--   1. public.profiles → tenant_id, role (existing 092 behavior)
--   2. public.users    → role, student_id, parent_id (new in 002)
-- It writes all claims into app_metadata:
--   app_metadata.role       = COALESCE(users.role, profiles.role)
--   app_metadata.tenant_id  = profiles.tenant_id
--   app_metadata.student_id = users.student_id (NULL for non-students)
--   app_metadata.parent_id  = users.parent_id  (NULL for non-parents)
--
-- HOW RLS POLICIES USE JWT CLAIMS:
-- ────────────────────────────────
-- Every RLS policy reads role via:
--   (auth.jwt() -> 'app_metadata' ->> 'role')
--
-- Role scoping patterns:
--   office_desk_admin:  FOR ALL (no WHERE clause → all rows)
--   school_desk_admin:  FOR SELECT only (read-only)
--   student:            WHERE id = auth.uid() (own row only)
--   parent:             WHERE id = auth.uid() (own row)
--                       + EXISTS (SELECT 1 FROM parents WHERE ...) for children
--
-- HOW AUDIT_LOG CAPTURES COMPLIANCE:
-- ──────────────────────────────────
-- Trigger fn_audit_financial (001) fires on INSERT/UPDATE/DELETE on
-- payments, debit_orders, invoices. It writes:
--   table_name  → TG_TABLE_NAME
--   operation   → TG_OP (INSERT/UPDATE/DELETE)
--   old_values  → to_jsonb(OLD) (NULL for INSERT)
--   new_values  → to_jsonb(NEW) (NULL for DELETE)
--   user_id     → auth.uid()
--   created_at  → now()
-- This provides full audit trail with user attribution.

COMMIT;
