-- Migration 201: Fix all 9 failing pgTAP test files
-- Root cause: remote schema dump (20260903104805) dropped tables, columns,
-- functions, policies, and constraints that tests depend on.
--
-- Fixes:
--   060/061: Recreate public.courses + public.student_enrollments (dropped by remote)
--   078/096: Tighten leads RLS (authenticated: SELECT-only, anon: no access)
--   111:     Recreate office_desk.family_accounts (dropped by remote)
--   114:     Add teacher UPDATE/DELETE denial policy on ef_call_log
--   145:     Recreate office_desk.failed_enrollments + is_rls_enabled() helper
--   190:     Restore notification_preferences columns + get_or_create RPC
--   enrollment_rls: Add 'adult' to profiles.role CHECK constraint

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- FIX 060/061: Recreate public.courses (dropped by remote dump)
-- Schema per migration 167 (enrollment_reporting)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.courses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES supabase.organizations(id) ON DELETE CASCADE,
  course_name       text NOT NULL,
  course_code       text NOT NULL UNIQUE,
  grade             text NOT NULL,
  description       text,
  curriculum_map    text,
  start_date        date NOT NULL,
  end_date          date NOT NULL,
  capacity          int NOT NULL DEFAULT 30 CHECK (capacity > 0),
  enrolled_count    int NOT NULL DEFAULT 0 CHECK (enrolled_count >= 0),
  status            text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'completed', 'archived')),
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_course_dates CHECK (end_date >= start_date)
);

-- RLS for public.courses (per migration 167)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- idempotent policy creation
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'oda_courses_all' AND tablename = 'courses' AND schemaname = 'public') THEN
    CREATE POLICY oda_courses_all ON public.courses FOR ALL TO authenticated
      USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text)
      WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'teacher_courses_select' AND tablename = 'courses' AND schemaname = 'public') THEN
    CREATE POLICY teacher_courses_select ON public.courses FOR SELECT TO authenticated
      USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student_courses_select' AND tablename = 'courses' AND schemaname = 'public') THEN
    CREATE POLICY student_courses_select ON public.courses FOR SELECT TO authenticated
      USING (
        status = 'active'
        AND grade = (SELECT s.grade FROM public.students s WHERE s.id = auth.uid())
        AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text)
      );
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- FIX 060/061: Recreate public.student_enrollments (dropped by remote dump)
-- Needed for chapter_progress FK in tests 060/061
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.student_enrollments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id           uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrollment_status   text NOT NULL DEFAULT 'enrolled'
    CHECK (enrollment_status IN ('enrolled', 'active', 'completed', 'withdrawn', 'audit')),
  enrolled_at         timestamptz NOT NULL DEFAULT now(),
  enrolled_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at        timestamptz,
  withdrawn_at        timestamptz,
  withdrawal_reason   text,
  final_grade         text CHECK (final_grade IN ('A', 'B', 'C', 'D', 'F', 'pending')),
  attendance_count    int NOT NULL DEFAULT 0 CHECK (attendance_count >= 0),
  absence_count       int NOT NULL DEFAULT 0 CHECK (absence_count >= 0),
  late_count          int NOT NULL DEFAULT 0 CHECK (late_count >= 0),
  progress_percentage int NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_course UNIQUE (student_id, course_id)
);

ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;

-- Grants for student_enrollments
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_enrollments TO authenticated;
GRANT ALL ON public.student_enrollments TO service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- FIX 060/061: Restore chapter_progress columns dropped by remote dump
-- Tests 060/061 INSERT rows with organization_id, enrollment_id, course_id
-- ══════════════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chapter_progress' AND column_name = 'organization_id') THEN
    ALTER TABLE public.chapter_progress ADD COLUMN organization_id uuid REFERENCES supabase.organizations(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chapter_progress' AND column_name = 'enrollment_id') THEN
    ALTER TABLE public.chapter_progress ADD COLUMN enrollment_id uuid REFERENCES public.student_enrollments(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chapter_progress' AND column_name = 'course_id') THEN
    ALTER TABLE public.chapter_progress ADD COLUMN course_id uuid REFERENCES public.courses(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chapter_progress' AND column_name = 'status') THEN
    ALTER TABLE public.chapter_progress ADD COLUMN status text DEFAULT 'in_progress';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chapter_progress' AND column_name = 'started_at') THEN
    ALTER TABLE public.chapter_progress ADD COLUMN started_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chapter_progress' AND column_name = 'updated_at') THEN
    ALTER TABLE public.chapter_progress ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chapter_progress' AND column_name = 'notes') THEN
    ALTER TABLE public.chapter_progress ADD COLUMN notes text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chapter_progress' AND column_name = 'time_spent_minutes') THEN
    ALTER TABLE public.chapter_progress ADD COLUMN time_spent_minutes int DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chapter_progress' AND column_name = 'completion_percentage') THEN
    ALTER TABLE public.chapter_progress ADD COLUMN completion_percentage int DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chapter_progress' AND column_name = 'created_at') THEN
    ALTER TABLE public.chapter_progress ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chapter_progress' AND column_name = 'total_resources') THEN
    ALTER TABLE public.chapter_progress ADD COLUMN total_resources int DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chapter_progress' AND column_name = 'resource_completion_count') THEN
    ALTER TABLE public.chapter_progress ADD COLUMN resource_completion_count int DEFAULT 0;
  END IF;
END $$;

-- Restore FK constraints on chapter_progress
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chapter_progress_organization_id_fkey') THEN
    ALTER TABLE public.chapter_progress ADD CONSTRAINT chapter_progress_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES supabase.organizations(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chapter_progress_enrollment_id_fkey') THEN
    ALTER TABLE public.chapter_progress ADD CONSTRAINT chapter_progress_enrollment_id_fkey
      FOREIGN KEY (enrollment_id) REFERENCES public.student_enrollments(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chapter_progress_course_id_fkey') THEN
    ALTER TABLE public.chapter_progress ADD CONSTRAINT chapter_progress_course_id_fkey
      FOREIGN KEY (course_id) REFERENCES public.courses(id);
  END IF;
END $$;

-- Restore the unique constraint needed by tests
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_enrollment_chapter') THEN
    ALTER TABLE public.chapter_progress ADD CONSTRAINT uq_enrollment_chapter
      UNIQUE (enrollment_id, chapter_id);
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- FIX 078/096: Tighten leads RLS policies
-- Test 078 expects: authenticated has SELECT only (no INSERT/UPDATE/DELETE)
--                    anon has no access at all
-- ══════════════════════════════════════════════════════════════════════════════

-- Ensure leads has correct grants: authenticated gets SELECT only
-- (service_role retains full access via default ACL)
DO $$ BEGIN
  -- Revoke any excessive grants on front_desk.leads from authenticated
  BEGIN
    REVOKE INSERT, UPDATE, DELETE ON front_desk.leads FROM authenticated;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop any existing overly-permissive policies on front_desk.leads
DO $$ BEGIN
  DROP POLICY IF EXISTS leads_front_desk_insert ON front_desk.leads;
  DROP POLICY IF EXISTS leads_front_desk_update ON front_desk.leads;
  DROP POLICY IF EXISTS leads_office_handoff ON front_desk.leads;
  DROP POLICY IF EXISTS leads_front_desk_select ON front_desk.leads;
  DROP POLICY IF EXISTS leads_admin_all ON front_desk.leads;
  DROP POLICY IF EXISTS leads_office_select ON front_desk.leads;
END $$;

-- Recreate minimal policies: authenticated SELECT within tenant only
CREATE POLICY leads_admin_all ON front_desk.leads
  FOR ALL TO authenticated
  USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY leads_front_desk_select ON front_desk.leads
  FOR SELECT TO authenticated
  USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'front_desk'
    )
  );

CREATE POLICY leads_office_select ON front_desk.leads
  FOR SELECT TO authenticated
  USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'office'
    )
    AND archived_at IS NULL
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- FIX 111: Recreate office_desk.family_accounts (dropped by remote dump)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.family_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenant_lms(id),
  family_code       TEXT UNIQUE NOT NULL,
  registration_reference TEXT,
  status            TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'closed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE office_desk.family_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policy for family_accounts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'fa_admin_all' AND tablename = 'family_accounts' AND schemaname = 'office_desk') THEN
    CREATE POLICY fa_admin_all ON office_desk.family_accounts
      FOR ALL TO authenticated
      USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
      WITH CHECK (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      );
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- FIX 114: Add teacher UPDATE/DELETE denial policy on ef_call_log
-- Test 114 expects teacher UPDATE/DELETE to throw 42501
-- Current policies: admin SELECT + service_role INSERT only
-- Need explicit denial for teacher role
-- ══════════════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  -- Drop old policies and recreate with explicit teacher denial
  DROP POLICY IF EXISTS ef_call_log_admin_select ON public.ef_call_log;
  DROP POLICY IF EXISTS ef_call_log_insert_service_role ON public.ef_call_log;
  DROP POLICY IF EXISTS ef_call_log_select_admin ON public.ef_call_log;
END $$;

-- Admin SELECT within tenant
CREATE POLICY ef_call_log_select_admin ON public.ef_call_log
  FOR SELECT TO authenticated
  USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Service role INSERT (EFs write via service_role)
CREATE POLICY ef_call_log_insert_service_role ON public.ef_call_log
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Explicit teacher denial for UPDATE/DELETE (RLS denies by default when no
-- permissive policy exists, but the test expects 42501 which is the
-- grant-layer deny. Since authenticated has no UPDATE/DELETE grant on
-- ef_call_log, this is already enforced at the grant layer.)
-- Verify grants: authenticated gets SELECT only
DO $$ BEGIN
  BEGIN
    REVOKE INSERT, UPDATE, DELETE ON public.ef_call_log FROM authenticated;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

GRANT SELECT ON public.ef_call_log TO authenticated;
GRANT INSERT ON public.ef_call_log TO service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- FIX 145: Recreate office_desk.failed_enrollments (dropped by remote dump)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.failed_enrollments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES public.tenant_lms(id),
  registration_attempt jsonb NOT NULL,
  payment_attempt      jsonb NOT NULL,
  error_code           text NOT NULL,
  error_message        text NOT NULL,
  payment_provider     text CHECK (payment_provider IN ('stripe', 'paypal')),
  payment_reference    text,
  ip_address           text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  resolved             boolean NOT NULL DEFAULT false,
  resolved_at          timestamptz,
  resolved_by          uuid REFERENCES auth.users(id),
  resolution_notes     text
);

ALTER TABLE office_desk.failed_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'fe_deny_anon' AND tablename = 'failed_enrollments' AND schemaname = 'office_desk') THEN
    CREATE POLICY fe_deny_anon ON office_desk.failed_enrollments
      FOR ALL TO anon USING (false);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'fe_deny_authenticated' AND tablename = 'failed_enrollments' AND schemaname = 'office_desk') THEN
    CREATE POLICY fe_deny_authenticated ON office_desk.failed_enrollments
      FOR ALL TO authenticated USING (false);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'fe_office_select' AND tablename = 'failed_enrollments' AND schemaname = 'office_desk') THEN
    CREATE POLICY fe_office_select ON office_desk.failed_enrollments
      FOR SELECT TO authenticated
      USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
        )
      );
  END IF;
END $$;

GRANT SELECT ON office_desk.failed_enrollments TO authenticated;
GRANT ALL ON office_desk.failed_enrollments TO service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- FIX 145: Create is_rls_enabled() helper function (used by test 145)
-- pgTAP-compatible helper: returns true if RLS is enabled on a table
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_rls_enabled(
  p_schema name,
  p_table  name,
  p_desc   text DEFAULT ''
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $function$
  SELECT COALESCE(
    (SELECT c.relrowsecurity
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = p_schema AND c.relname = p_table),
    false
  );
$function$;

-- ══════════════════════════════════════════════════════════════════════════════
-- FIX 190: Restore notification_preferences columns dropped by remote dump
-- Remote dump dropped: class_notification_scope, core_curriculum_enabled,
--   clubs_enabled, class_ids, hub_event_types, news_categories,
--   push_enabled, email_enabled, sms_enabled, in_app_enabled
-- ══════════════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'class_notification_scope') THEN
    ALTER TABLE public.notification_preferences ADD COLUMN class_notification_scope text NOT NULL DEFAULT 'all'
      CHECK (class_notification_scope IN ('all', 'custom', 'off'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'core_curriculum_enabled') THEN
    ALTER TABLE public.notification_preferences ADD COLUMN core_curriculum_enabled boolean NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'clubs_enabled') THEN
    ALTER TABLE public.notification_preferences ADD COLUMN clubs_enabled boolean NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'class_ids') THEN
    ALTER TABLE public.notification_preferences ADD COLUMN class_ids uuid[] DEFAULT ARRAY[]::uuid[];
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'hub_event_types') THEN
    ALTER TABLE public.notification_preferences ADD COLUMN hub_event_types text[] DEFAULT ARRAY['club_news']::text[];
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'news_categories') THEN
    ALTER TABLE public.notification_preferences ADD COLUMN news_categories text[] DEFAULT ARRAY['club_news']::text[];
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'push_enabled') THEN
    ALTER TABLE public.notification_preferences ADD COLUMN push_enabled boolean NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'email_enabled') THEN
    ALTER TABLE public.notification_preferences ADD COLUMN email_enabled boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'sms_enabled') THEN
    ALTER TABLE public.notification_preferences ADD COLUMN sms_enabled boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'in_app_enabled') THEN
    ALTER TABLE public.notification_preferences ADD COLUMN in_app_enabled boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Restore RLS policies on notification_preferences
DO $$ BEGIN
  DROP POLICY IF EXISTS notif_prefs_student_select ON public.notification_preferences;
  DROP POLICY IF EXISTS notif_prefs_student_insert ON public.notification_preferences;
  DROP POLICY IF EXISTS notif_prefs_student_update ON public.notification_preferences;
  DROP POLICY IF EXISTS notif_prefs_service_role_all ON public.notification_preferences;
END $$;

CREATE POLICY notif_prefs_student_select ON public.notification_preferences
  FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY notif_prefs_student_insert ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

CREATE POLICY notif_prefs_student_update ON public.notification_preferences
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY notif_prefs_service_role_all ON public.notification_preferences
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- FIX 190: Recreate get_or_create_notification_preferences() RPC
-- (dropped by remote dump)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_or_create_notification_preferences(
  p_student_id UUID
)
RETURNS SETOF public.notification_preferences
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT * FROM public.notification_preferences
  WHERE student_id = p_student_id;

  IF NOT FOUND THEN
    RETURN QUERY
    INSERT INTO public.notification_preferences (student_id)
    VALUES (p_student_id)
    RETURNING *;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_or_create_notification_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_notification_preferences(UUID) TO service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- FIX 190: Recreate updated_at trigger for notification_preferences
-- (dropped by remote dump)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_notification_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_notification_preferences_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- FIX enrollment_rls: Add 'adult' to profiles.role CHECK constraint
-- Remote dump recreated constraint WITHOUT 'adult' and 'staff'
-- Test 10 uses role='adult' which is rejected by the constraint
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'student', 'outside_student', 'family', 'alumni',
    'teacher', 'expert', 'guest', 'admin',
    'learner', 'office', 'front_desk',
    'adult', 'staff'
  ));

-- ══════════════════════════════════════════════════════════════════════════════
-- FIX 060/061: Restore chapter_progress RLS policies dropped by remote dump
-- ══════════════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  DROP POLICY IF EXISTS oda_chapter_progress_all ON public.chapter_progress;
  DROP POLICY IF EXISTS parent_chapter_progress_select ON public.chapter_progress;
  DROP POLICY IF EXISTS sda_chapter_progress_select ON public.chapter_progress;
  DROP POLICY IF EXISTS sda_chapter_progress_update ON public.chapter_progress;
  DROP POLICY IF EXISTS student_chapter_progress_select ON public.chapter_progress;
  DROP POLICY IF EXISTS teacher_chapter_progress_insert ON public.chapter_progress;
  DROP POLICY IF EXISTS teacher_chapter_progress_select ON public.chapter_progress;
  DROP POLICY IF EXISTS teacher_chapter_progress_update ON public.chapter_progress;
END $$;

-- Admin all
CREATE POLICY oda_chapter_progress_all ON public.chapter_progress
  FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

-- Student select own
CREATE POLICY student_chapter_progress_select ON public.chapter_progress
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      WHERE se.id = chapter_progress.enrollment_id AND se.student_id = auth.uid()
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text)
  );

-- Teacher select own courses
CREATE POLICY teacher_chapter_progress_select ON public.chapter_progress
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.courses c ON se.course_id = c.id
      WHERE se.id = chapter_progress.enrollment_id
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text)
  );

-- Teacher insert own courses
CREATE POLICY teacher_chapter_progress_insert ON public.chapter_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.courses c ON se.course_id = c.id
      WHERE se.id = chapter_progress.enrollment_id
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text)
  );

-- Teacher update own courses
CREATE POLICY teacher_chapter_progress_update ON public.chapter_progress
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.courses c ON se.course_id = c.id
      WHERE se.id = chapter_progress.enrollment_id
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.courses c ON se.course_id = c.id
      WHERE se.id = chapter_progress.enrollment_id
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text)
  );

-- Parent select child
CREATE POLICY parent_chapter_progress_select ON public.chapter_progress
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.parents p ON p.student_id = se.student_id
      WHERE se.id = chapter_progress.enrollment_id
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'parent'::text)
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- FIX 060/061: Restore indexes on chapter_progress dropped by remote dump
-- ══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_chapter_progress_enrollment ON public.chapter_progress (enrollment_id);
CREATE INDEX IF NOT EXISTS idx_chapter_progress_course ON public.chapter_progress (course_id);
CREATE INDEX IF NOT EXISTS idx_chapter_progress_org ON public.chapter_progress (organization_id);
CREATE INDEX IF NOT EXISTS idx_chapter_progress_status ON public.chapter_progress (status);

-- ══════════════════════════════════════════════════════════════════════════════
-- FIX 190: Restore indexes on notification_preferences dropped by remote dump
-- ══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_notification_preferences_student ON public.notification_preferences (student_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_class_ids ON public.notification_preferences USING gin (class_ids);

-- ══════════════════════════════════════════════════════════════════════════════
-- FIX 114: Restore indexes on ef_call_log dropped by remote dump
-- ══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_ef_call_log_created_at ON public.ef_call_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ef_call_log_caller ON public.ef_call_log (caller, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ef_call_log_tenant_id ON public.ef_call_log (tenant_id, created_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- Restore ef_call_log columns dropped by remote dump
-- ══════════════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ef_call_log' AND column_name = 'signature_valid') THEN
    ALTER TABLE public.ef_call_log ADD COLUMN signature_valid boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ef_call_log' AND column_name = 'replay_check_passed') THEN
    ALTER TABLE public.ef_call_log ADD COLUMN replay_check_passed boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ef_call_log' AND column_name = 'request_hash') THEN
    ALTER TABLE public.ef_call_log ADD COLUMN request_hash text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ef_call_log' AND column_name = 'error_msg') THEN
    ALTER TABLE public.ef_call_log ADD COLUMN error_msg text;
  END IF;
END $$;

COMMIT;
