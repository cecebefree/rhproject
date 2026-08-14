-- Migration 125: Create public.parent_student_link table (Row 75)
-- Consent-based parent-student relationships for read-only portal access

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- PARENT-STUDENT LINK — consent-based relationships
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.parent_student_link (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship  text NOT NULL CHECK (relationship IN ('mother', 'father', 'guardian', 'other')),
  verified      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

-- One link per parent-student pair
ALTER TABLE public.parent_student_link
  ADD CONSTRAINT uq_parent_student UNIQUE (parent_id, student_id);

-- Primary query path: parent looking up their children
CREATE INDEX IF NOT EXISTS idx_psl_parent_verified
  ON public.parent_student_link (parent_id, verified);

-- Reverse lookup: student seeing who linked them
CREATE INDEX IF NOT EXISTS idx_psl_student
  ON public.parent_student_link (student_id);

-- ═══════════════════════════════════════════════════════════
-- RLS: PARENT-STUDENT LINK
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.parent_student_link ENABLE ROW LEVEL SECURITY;

-- Parents read their own links (only verified)
DROP POLICY IF EXISTS psl_parent_read_own ON public.parent_student_link;
CREATE POLICY psl_parent_read_own
  ON public.parent_student_link FOR SELECT TO authenticated
  USING (
    parent_id = auth.uid()
    AND verified = true
    AND deleted_at IS NULL
  );

-- Admins full access
DROP POLICY IF EXISTS psl_admin_all ON public.parent_student_link;
CREATE POLICY psl_admin_all
  ON public.parent_student_link FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Students read their own parent links
DROP POLICY IF EXISTS psl_student_read_own ON public.parent_student_link;
CREATE POLICY psl_student_read_own
  ON public.parent_student_link FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    AND deleted_at IS NULL
  );

-- ═══════════════════════════════════════════════════════════
-- EXTEND RLS: GRADEBOOK (parent read through link)
-- ═══════════════════════════════════════════════════════════
-- Note: We cannot modify existing policies in-place, so we add new ones.
-- The new policy allows parents to read grades for their linked children.

DROP POLICY IF EXISTS gb_parent_read ON school_desk.gradebook;
CREATE POLICY gb_parent_read
  ON school_desk.gradebook FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_link psl
      WHERE psl.parent_id = auth.uid()
        AND psl.student_id = gradebook.student_id
        AND psl.verified = true
        AND psl.deleted_at IS NULL
    )
  );

-- ═══════════════════════════════════════════════════════════
-- EXTEND RLS: ATTENDANCE (parent read through link)
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS attendance_parent_read ON school_desk.attendance;
CREATE POLICY attendance_parent_read
  ON school_desk.attendance FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_link psl
      WHERE psl.parent_id = auth.uid()
        AND psl.student_id = attendance.student_id
        AND psl.verified = true
        AND psl.deleted_at IS NULL
    )
  );

-- ═══════════════════════════════════════════════════════════
-- EXTEND RLS: ASSIGNMENTS (parent read for linked students)
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS asgn_parent_read ON school_desk.assignments;
CREATE POLICY asgn_parent_read
  ON school_desk.assignments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_link psl
      WHERE psl.parent_id = auth.uid()
        AND psl.verified = true
        AND psl.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM school_desk.gradebook g
          WHERE g.assignment_id = assignments.id
            AND g.student_id = psl.student_id
        )
    )
  );

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════
GRANT ALL ON public.parent_student_link TO service_role;
GRANT SELECT ON public.parent_student_link TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════
COMMENT ON TABLE public.parent_student_link IS
  'Row 75: Consent-based parent-student relationships. verified=true required for portal access.';
COMMENT ON CONSTRAINT uq_parent_student ON public.parent_student_link IS
  'One link per parent-student pair';
COMMENT ON COLUMN public.parent_student_link.verified IS
  'Admin must verify before parent can access student data';

COMMIT;
