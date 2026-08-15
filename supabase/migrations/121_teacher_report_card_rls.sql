-- Migration 121: Add teacher RLS policies for report_cards (Row 71)
-- Move report card write access from office-only to teacher-owned model
-- Teachers can INSERT/UPDATE report cards for students in their courses

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- 1. Teacher INSERT: report cards for students in their courses
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS rc_teacher_insert ON school_desk.report_cards;
CREATE POLICY rc_teacher_insert ON school_desk.report_cards
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND status = 'draft'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'teacher'
    )
    AND EXISTS (
      SELECT 1 FROM public.student_class sc
      JOIN school_desk.courses c ON c.id = sc.class_id
      WHERE sc.student_id = report_cards.student_id
        AND c.teacher_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════
-- 2. Teacher UPDATE: own draft report cards only
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS rc_teacher_update_own ON school_desk.report_cards;
CREATE POLICY rc_teacher_update_own ON school_desk.report_cards
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    AND status = 'draft'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'teacher'
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'teacher'
    )
  );

-- ═══════════════════════════════════════════════════════════
-- 3. Teacher SELECT: own report cards
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS rc_teacher_select_own ON school_desk.report_cards;
CREATE POLICY rc_teacher_select_own ON school_desk.report_cards
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'teacher'
    )
  );

-- ═══════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════
COMMENT ON POLICY rc_teacher_insert ON school_desk.report_cards IS
  'Row 71: Teachers INSERT report cards for students in their courses';
COMMENT ON POLICY rc_teacher_update_own ON school_desk.report_cards IS
  'Row 71: Teachers UPDATE own draft report cards only';
COMMENT ON POLICY rc_teacher_select_own ON school_desk.report_cards IS
  'Row 71: Teachers SELECT own report cards';

COMMIT;
