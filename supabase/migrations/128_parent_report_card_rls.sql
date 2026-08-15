-- Migration 128: Add parent SELECT RLS on school_desk.report_cards (Row 71)
-- Mirrors migration 125 pattern: parents read report cards for verified linked students

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- EXTEND RLS: REPORT CARDS (parent read through link)
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS rc_parent_select ON school_desk.report_cards;
CREATE POLICY rc_parent_select
  ON school_desk.report_cards FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_link psl
      WHERE psl.parent_id = auth.uid()
        AND psl.student_id = report_cards.student_id
        AND psl.verified = true
        AND psl.deleted_at IS NULL
    )
  );

-- ═══════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════
COMMENT ON POLICY rc_parent_select ON school_desk.report_cards IS
  'Row 71: Parents read report cards for verified linked students via parent_student_link';

COMMIT;
