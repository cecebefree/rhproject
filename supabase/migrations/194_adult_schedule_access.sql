-- 194_adult_schedule_access.sql
-- Adults (parents/guardians) need to see schedule slots for their children's enrolled classes.
--
-- ROLE MODEL (from leadership-review-phase1.md):
--   - Family Account = billing entity (admin-managed, NOT a login role)
--   - Adult = person who logs in (mother, father, guardian) — profiles.role = 'adult'
--   - Student = child who logs in — profiles.role = 'student'
--   - Staff = teacher, admin, expert, etc. — profiles.role IN ('teacher','admin','staff')
--
-- LINKAGE: family_child table (migration 040) links guardian_id → child_id
-- CHAIN: adult (auth.uid()) → family_child.guardian_id → family_child.child_id → student_class.class_id → schedule_slot.course_id

BEGIN;

-- 1. Add 'adult' and 'staff' to profiles role CHECK constraint
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

-- 2. Adult read policy on schedule_slot
-- Adults see slots for courses where their linked children are enrolled
DROP POLICY IF EXISTS ss_adult_read ON public.schedule_slot;

CREATE POLICY ss_adult_read ON public.schedule_slot
  FOR SELECT TO authenticated
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND EXISTS (
      -- Current user has role = 'adult'
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'adult'
    )
    AND EXISTS (
      -- The course has an active student_class enrollment
      -- for a child linked via family_child
      SELECT 1
      FROM public.family_child fc
      JOIN public.student_class sc
        ON sc.student_id = fc.child_id
        AND sc.class_id = schedule_slot.course_id
        AND sc.is_active
      WHERE fc.guardian_id = auth.uid()
    )
  );

COMMIT;
