-- Migration 20260904: Fix all failing pgTAP tests
-- Root cause: remote schema dump (20260903104805) re-granted ALL privileges
-- to authenticated on multiple tables, dropped critical tables, and broke policies.
--
-- Failing tests and fixes:
--   027:  student_class has extra policy (student_class_read) + missing sc_admin_all
--   062:  profiles UPDATE grant allows authenticated direct UPDATE (E17/E18)
--   062a: profiles UPDATE grant (T15/T17)
--   063:  report_cards missing rc_family_select policy
--   065:  report_cards anon UPDATE grant + other issues
--   078:  leads over-broad grants (authenticated has INSERT/UPDATE/DELETE)
--   096:  leads over-broad grants (same as 078)
--   111:  office_desk.family_accounts dropped
--   112:  profiles UPDATE grant (test 6)
--   114:  ef_call_log over-broad grants (teacher UPDATE/DELETE allowed)
--   145:  failed_enrollments dropped + is_rls_enabled() uses non-existent function
--   190:  notification_preferences wrong schema + missing RPC

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. REVOKE over-broad grants restored by the remote dump
--    Tests: 078, 096, 112, 114, 062, 062a, 065
-- ══════════════════════════════════════════════════════════════════════════════

-- front_desk.leads: authenticated should have SELECT only (078/096), anon nothing
REVOKE INSERT, UPDATE, DELETE ON front_desk.leads FROM authenticated;
REVOKE INSERT, SELECT, UPDATE, DELETE ON front_desk.leads FROM anon;

-- public.profiles: authenticated should have SELECT only (062/062a/112)
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM authenticated;

-- public.ef_call_log: authenticated should have SELECT only (114)
REVOKE INSERT, UPDATE, DELETE ON public.ef_call_log FROM authenticated;

-- public.handle_changes: authenticated should have SELECT only (062a T16)
REVOKE INSERT, UPDATE ON public.handle_changes FROM authenticated;

-- school_desk.report_cards: authenticated should not have INSERT, anon should not have UPDATE (065)
REVOKE INSERT ON school_desk.report_cards FROM authenticated;
REVOKE UPDATE, INSERT ON school_desk.report_cards FROM anon;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. FIX student_class policies (test 027)
--    Has: sc_student_read, sc_teacher_read, student_class_read
--    Needs: sc_student_read, sc_admin_all, sc_teacher_read
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS student_class_read ON public.student_class;
DROP POLICY IF EXISTS sc_adult_read ON public.student_class;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sc_admin_all' AND tablename = 'student_class' AND schemaname = 'public') THEN
    CREATE POLICY sc_admin_all ON public.student_class
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
            AND p.tenant_id = public.student_class.tenant_id
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
            AND p.tenant_id = public.student_class.tenant_id
        )
      );
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. ADD rc_family_select policy on school_desk.report_cards (test 063)
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS rc_family_select ON school_desk.report_cards;

CREATE POLICY rc_family_select ON school_desk.report_cards
  FOR SELECT TO authenticated
  USING (
    status = 'visible'
    AND EXISTS (
      SELECT 1 FROM public.family_child fc
      JOIN public.profiles p ON p.id = fc.guardian_id
      WHERE fc.child_id = school_desk.report_cards.student_id
        AND fc.guardian_id = auth.uid()
        AND p.role = 'family'
        AND school_desk.report_cards.tenant_id = p.tenant_id
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. FIX ef_call_log policies (test 114)
--    Need: admin SELECT, service_role INSERT, teacher DENIED for UPDATE/DELETE
-- ══════════════════════════════════════════════════════════════════════════════

-- Ensure authenticated only has SELECT (already revoked above)
GRANT SELECT ON public.ef_call_log TO authenticated;
GRANT INSERT ON public.ef_call_log TO service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. RECREATE office_desk.family_accounts (test 111)
--    Dropped by remote schema dump
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

GRANT ALL ON office_desk.family_accounts TO service_role;
GRANT SELECT ON office_desk.family_accounts TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. RECREATE office_desk.failed_enrollments (test 145)
--    Dropped by remote schema dump
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
-- 7. FIX is_rls_enabled() function (test 145)
--    Current uses row_security_enabled() which doesn't exist in PG 17
-- ══════════════════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.is_rls_enabled(name, name, text);

CREATE FUNCTION public.is_rls_enabled(
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
-- 8. FIX notification_preferences table (test 190)
--    Remote dump created wrong schema with notification_type_id NOT NULL
--    and missing columns our tests expect
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop the wrong version if it exists with notification_type_id NOT NULL
DO $$ BEGIN
  -- Remove the NOT NULL constraint on notification_type_id if it exists
  ALTER TABLE public.notification_preferences ALTER COLUMN notification_type_id DROP NOT NULL;
EXCEPTION WHEN undefined_column OR undefined_object THEN NULL;
END $$;

-- Add missing columns
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

-- Fix RLS policies on notification_preferences
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

GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- 9. CREATE get_or_create_notification_preferences() RPC (test 190)
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
-- 10. Restore updated_at trigger for notification_preferences
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

COMMIT;
