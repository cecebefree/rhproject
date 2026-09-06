-- Migration 20260904010000: Fix remaining 3 failing tests (063, 065, 111)
--
-- 063: Two issues:
--   a) rc_family_select policy missing JWT tenant check (test 4: cross-tenant isolation)
--   b) Circular RLS dependency: c_adult_enrolled_read (courses→student_class) ↔
--      sc_teacher_read (student_class→courses) causes infinite recursion (42P17)
--      when rc_teacher_insert on report_cards triggers the chain.
--      Fix: SECURITY DEFINER helper breaks the cycle.
-- 065: release_report_card function issues:
--   - Returns SETOF text but test expects TABLE(status text)
--   - Doesn't set released_at or released_by
--   - Silently returns 'visible' for non-draft cards instead of raising
--   - Inconsistent error message for nonexistent vs cross-tenant cards
-- 111: office_desk.invoices/payments missing family_account_id column
--       office_desk.payments missing payment_date column
--       school_desk_registrations_select policy allows teachers (test 5)

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. FIX rc_family_select policy (test 063, test 4)
--    Add JWT tenant check to prevent cross-tenant access
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS rc_family_select ON school_desk.report_cards;

CREATE POLICY rc_family_select ON school_desk.report_cards
  FOR SELECT TO authenticated
  USING (
    status = 'visible'
    AND tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
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
-- 2. BREAK circular RLS dependency (test 063, test 5)
--    c_adult_enrolled_read on courses queries student_class
--    sc_teacher_read on student_class queries courses
--    → infinite recursion (42P17) when any INSERT/SELECT chain crosses both
--    Fix: SECURITY DEFINER helper bypasses RLS on intermediate tables
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_family_enrolled_in_course(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.family_child fc
    JOIN public.student_class sc ON sc.student_id = fc.child_id AND sc.is_active
    WHERE fc.guardian_id = auth.uid()
      AND sc.class_id = p_course_id
  );
$function$;

GRANT EXECUTE ON FUNCTION public.is_family_enrolled_in_course(uuid) TO authenticated;

DROP POLICY IF EXISTS c_adult_enrolled_read ON school_desk.courses;

CREATE POLICY c_adult_enrolled_read ON school_desk.courses
  FOR SELECT TO authenticated
  USING (public.is_family_enrolled_in_course(id));

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. FIX release_report_card function (test 065)
--    - Return TABLE(status text) instead of SETOF text
--    - Set released_at and released_by on release
--    - Raise exception for non-draft cards
--    - Use consistent error messages
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.release_report_card(p_card_id uuid)
RETURNS TABLE(status text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_caller_role       text;
    v_caller_tenant_id  uuid;
    v_card_tenant_id    uuid;
    v_card_status       text;
BEGIN
    -- Get caller identity
    SELECT role, tenant_id
    INTO v_caller_role, v_caller_tenant_id
    FROM public.profiles
    WHERE id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Caller profile not found';
    END IF;

    IF v_caller_role <> 'office' THEN
        RAISE EXCEPTION 'Only Office Desk can release report cards';
    END IF;

    -- Get card and verify ownership (use qualified column names)
    SELECT rc.tenant_id, rc.status
    INTO v_card_tenant_id, v_card_status
    FROM school_desk.report_cards rc
    WHERE rc.id = p_card_id;

    IF v_card_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Report card not found or not accessible';
    END IF;

    IF v_caller_tenant_id IS DISTINCT FROM v_card_tenant_id THEN
        RAISE EXCEPTION 'Report card not found or not accessible';
    END IF;

    -- Must be in draft status to release
    IF v_card_status <> 'draft' THEN
        RAISE EXCEPTION 'Report card not in draft status';
    END IF;

    -- Release: draft -> released -> visible, stamp released_at and released_by
    UPDATE school_desk.report_cards
    SET status = 'released',
        released_at = now(),
        released_by = auth.uid()
    WHERE id = p_card_id;

    UPDATE school_desk.report_cards
    SET status = 'visible'
    WHERE id = p_card_id;

    RETURN QUERY SELECT 'visible'::text;
END;
$function$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. RESTORE dropped columns on invoices and payments (test 111)
--    Remote schema dump dropped these columns
-- ══════════════════════════════════════════════════════════════════════════════
-- Restore registration_id on invoices (needed by get_lead_pipeline)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'office_desk' AND table_name = 'invoices'
      AND column_name = 'registration_id'
  ) THEN
    ALTER TABLE office_desk.invoices
      ADD COLUMN registration_id UUID
        REFERENCES office_desk.registrations(id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'office_desk' AND table_name = 'invoices'
      AND column_name = 'family_account_id'
  ) THEN
    ALTER TABLE office_desk.invoices
      ADD COLUMN family_account_id UUID
        REFERENCES office_desk.family_accounts(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'office_desk' AND table_name = 'payments'
      AND column_name = 'family_account_id'
  ) THEN
    ALTER TABLE office_desk.payments
      ADD COLUMN family_account_id UUID
        REFERENCES office_desk.family_accounts(id);
  END IF;
END $$;

-- Add payment_date column to payments (test 111 uses this instead of paid_at)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'office_desk' AND table_name = 'payments'
      AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE office_desk.payments
      ADD COLUMN payment_date TIMESTAMPTZ;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. DROP teacher registrations policy (test 111, test 5)
--    school_desk_registrations_select allows teachers to read registrations
--    but test expects teacher access denied
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS school_desk_registrations_select ON office_desk.registrations;

COMMIT;
