-- Cleanup duplicate/conflicting policies

DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can manage their courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can view all courses" ON public.courses;
DROP POLICY IF EXISTS courses_admin_all ON public.courses;
DROP POLICY IF EXISTS courses_published_read ON public.courses;
DROP POLICY IF EXISTS courses_teacher_manage ON public.courses;
DROP POLICY IF EXISTS courses_no_core_outside ON public.courses;
DROP POLICY IF EXISTS "courses_tenant_isolation" ON public.courses;
DROP POLICY IF EXISTS c_adult_enrolled_read ON school_desk.courses;
DROP POLICY IF EXISTS sc_adult_read ON public.student_class;
DROP POLICY IF EXISTS "c_adult_enrolled_read" ON school_desk.courses;

CREATE POLICY courses_org_read ON public.courses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (p.role = ANY (ARRAY['teacher', 'admin', 'student']))
    )
  );

CREATE POLICY courses_teacher_insert ON public.courses
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (p.role = ANY (ARRAY['teacher', 'admin']))
    )
  );

CREATE POLICY courses_teacher_update ON public.courses
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (p.role = ANY (ARRAY['teacher', 'admin']))
    )
  );

CREATE POLICY courses_teacher_delete ON public.courses
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (p.role = ANY (ARRAY['teacher', 'admin']))
    )
  );

CREATE POLICY student_class_read ON public.student_class
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.fn_is_guardian_of_child(auth.uid(), student_class.student_id)
  );
