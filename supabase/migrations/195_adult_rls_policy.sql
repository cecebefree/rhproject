-- 195_adult_rls_policy.sql
-- Adults (parents/guardians) can see ONLY their own children's enrollment records.
--
-- RULE: auth.uid() must be in family_child.guardian_id for the child
-- linked to the student_class.student_id row.
--
-- IMPORTANT: Uses SECURITY DEFINER helper to avoid RLS recursion:
--   sc_adult_read -> family_child -> fc_admin_all -> profiles -> p_adult_child_read -> family_child (CYCLE)
--   The helper fn_is_guardian_of_child() bypasses RLS on family_child.
--
-- Depends on: family_child (040), student_class (027), profiles role 'adult' (194)

BEGIN;

-- 0. SECURITY DEFINER helper — checks guardian→child link without triggering RLS
CREATE OR REPLACE FUNCTION public.fn_is_guardian_of_child(p_guardian uuid, p_child uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_child fc
    WHERE fc.guardian_id = p_guardian
      AND fc.child_id = p_child
  );
$$;

-- 1. Adult SELECT policy on student_class
-- Adults see enrollments for children linked via family_child
DROP POLICY IF EXISTS sc_adult_read ON public.student_class;

CREATE POLICY sc_adult_read ON public.student_class
  FOR SELECT TO authenticated
  USING (
    public.fn_is_guardian_of_child(auth.uid(), student_class.student_id)
  );

-- 2. Adult SELECT policy on profiles (for viewing child profiles)
-- Adults see profiles of their linked children only
DROP POLICY IF EXISTS p_adult_child_read ON public.profiles;

CREATE POLICY p_adult_child_read ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.fn_is_guardian_of_child(auth.uid(), profiles.id)
  );

-- 3. Adult SELECT policy on courses (for courses their children are enrolled in)
-- Adults see courses where their linked children have an active enrollment
DROP POLICY IF EXISTS c_adult_enrolled_read ON school_desk.courses;

CREATE POLICY c_adult_enrolled_read ON school_desk.courses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_child fc
      JOIN public.student_class sc
        ON sc.student_id = fc.child_id
        AND sc.is_active
      WHERE fc.guardian_id = auth.uid()
        AND sc.class_id = courses.id
    )
  );

-- 4. Adult SELECT policy on schedule_slot (courses their children are enrolled in)
-- Already exists from 194_adult_schedule_access.sql as ss_adult_read
-- No duplicate needed.

COMMIT;
