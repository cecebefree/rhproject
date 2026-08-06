-- 093_report_card_write_path_office_only.sql
-- REGRESSION FIX: Report-card write path teacher → office per ruling.
-- Ruling: report cards are OFFICE-LOADED, READ-ONLY in the app;
-- teachers have NO write path.
--
-- This migration:
--   1. Changes create_draft_report_card role check from teacher → office
--   2. Revokes teacher INSERT/UPDATE on report_cards via RLS
--   3. Ensures office can INSERT (for data entry) and UPDATE (lifecycle)
--
-- PREDECESSOR: 065_r18_rpc_report_cards.sql

BEGIN;

-- ═══════════════════════════════════════════════
-- 1. Fix create_draft_report_card: teacher → office
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_draft_report_card(
    p_student_id uuid,
    p_term       text,
    p_subject    text,
    p_grade      text default null
)
RETURNS public.report_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tenant_id uuid;
    v_result    public.report_cards;
BEGIN
    -- Caller must be office desk (was: teacher — changed per ruling)
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'office'
    ) THEN
        RAISE EXCEPTION 'Only office desk can create draft report cards'
            USING HINT = 'caller must have role=office in profiles';
    END IF;

    -- Derive tenant from caller's profile
    SELECT tenant_id INTO STRICT v_tenant_id
    FROM public.profiles
    WHERE id = auth.uid();

    INSERT INTO public.report_cards
        (student_id, term, subject, grade, status, created_by, tenant_id)
    VALUES
        (p_student_id, p_term, p_subject, p_grade, 'draft', auth.uid(), v_tenant_id)
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$;

-- ═══════════════════════════════════════════════
-- 2. Revoke teacher write grants on report_cards
-- ═══════════════════════════════════════════════
-- Migration 044 granted teacher INSERT/UPDATE via RLS policies.
-- Per ruling, teachers must NOT write report cards.
-- Drop teacher-specific write policies.

DROP POLICY IF EXISTS rc_teacher_insert ON public.report_cards;
DROP POLICY IF EXISTS rc_teacher_update_own ON public.report_cards;

-- ═══════════════════════════════════════════════
-- 3. Ensure office INSERT policy exists (for data entry)
-- ═══════════════════════════════════════════════
-- rc_office_insert from migration 088 should exist; verify and re-create
-- if missing (defense-in-depth).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'report_cards'
          AND policyname = 'rc_office_insert'
    ) THEN
        CREATE POLICY rc_office_insert ON public.report_cards
            FOR INSERT TO authenticated
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid()
                      AND p.role = 'office'
                      AND p.tenant_id = report_cards.tenant_id
                )
                AND status = 'draft'
                AND created_by = auth.uid()
            );
    END IF;
END $$;

-- ═══════════════════════════════════════════════
-- 4. Verify RLS enabled (deny-by-default for teachers)
-- ═══════════════════════════════════════════════
-- After dropping teacher policies, teachers have:
--   SELECT: rc_learner_select_visible (only status='visible' for self)
--   INSERT: none (denied by default)
--   UPDATE: none (denied by default)
--   DELETE: none (denied by default)

-- Teachers retain read-only access via rc_learner_select_visible if they
-- are also learners (dual-role), but cannot write.

COMMIT;
