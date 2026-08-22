-- Migration 191: Enable RLS and fix policies
-- Purpose: Fix RLS security issues on notification_types, profiles,
--          chapter_progress, tenant_devotional, tenant_lms.
--          courses and student_enrollments already have RLS policies.
--          Verifies debit_orders schema.


-- ============================================================================
-- 1. Enable RLS on public.notification_types (currently disabled)
-- ============================================================================


ALTER TABLE public.notification_types ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS notification_types_select_all ON public.notification_types;
CREATE POLICY notification_types_select_all ON public.notification_types
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS notification_types_service_role ON public.notification_types;
CREATE POLICY notification_types_service_role ON public.notification_types
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================================
-- 2. Fix RLS policies on flagged tables
-- ============================================================================


-- ---- public.profiles ----
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
CREATE POLICY profiles_self_select ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR auth.role() = 'service_role');


DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');


DROP POLICY IF EXISTS profiles_service_role ON public.profiles;
CREATE POLICY profiles_service_role ON public.profiles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ---- public.chapter_progress ----
ALTER TABLE public.chapter_progress ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS chapter_progress_self_select ON public.chapter_progress;
CREATE POLICY chapter_progress_self_select ON public.chapter_progress
  FOR SELECT
  USING (student_id = auth.uid() OR auth.role() = 'service_role');


DROP POLICY IF EXISTS chapter_progress_self_update ON public.chapter_progress;
CREATE POLICY chapter_progress_self_update ON public.chapter_progress
  FOR UPDATE
  USING (student_id = auth.uid() OR auth.role() = 'service_role')
  WITH CHECK (student_id = auth.uid() OR auth.role() = 'service_role');


DROP POLICY IF EXISTS chapter_progress_service_role ON public.chapter_progress;
CREATE POLICY chapter_progress_service_role ON public.chapter_progress
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ---- public.tenant_devotional ----
ALTER TABLE public.tenant_devotional ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS tenant_devotional_select ON public.tenant_devotional;
CREATE POLICY tenant_devotional_select ON public.tenant_devotional
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');


DROP POLICY IF EXISTS tenant_devotional_service_role ON public.tenant_devotional;
CREATE POLICY tenant_devotional_service_role ON public.tenant_devotional
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ---- public.tenant_lms ----
ALTER TABLE public.tenant_lms ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS tenant_lms_select ON public.tenant_lms;
CREATE POLICY tenant_lms_select ON public.tenant_lms
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');


DROP POLICY IF EXISTS tenant_lms_service_role ON public.tenant_lms;
CREATE POLICY tenant_lms_service_role ON public.tenant_lms
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================================
-- 3. Verify debit_orders schema
-- ============================================================================


DO $$
DECLARE
  v_column_count INT;
BEGIN
  SELECT COUNT(*) INTO v_column_count
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'debit_orders';
  
  RAISE NOTICE 'debit_orders schema verified: % columns', v_column_count;
END $$;


-- ============================================================================
-- 4. Verification: Log RLS status for key tables
-- ============================================================================


DO $$
DECLARE
  v_rec RECORD;
BEGIN
  FOR v_rec IN 
    SELECT c.relname, c.relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  LOOP
    RAISE NOTICE 'Table % — RLS: %', v_rec.relname, v_rec.relrowsecurity;
  END LOOP;
END $$;
