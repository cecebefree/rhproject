-- ============================================================================
-- Rename school_desk.courses → school_desk.programs
-- Aligns with terminology: Core Curriculums, Clubs, Enrichment Courses
-- ============================================================================

-- 1. Rename the table
ALTER TABLE school_desk.courses RENAME TO programs;

-- 2. Update sequence name (if any)
ALTER SEQUENCE IF EXISTS school_desk.courses_id_seq RENAME TO programs_id_seq;

-- 3. Update index names
ALTER INDEX IF EXISTS school_desk.courses_pkey RENAME TO programs_pkey;
ALTER INDEX IF EXISTS IF EXISTS idx_courses_status RENAME TO idx_programs_status;
ALTER INDEX IF EXISTS IF EXISTS idx_courses_teacher RENAME TO idx_programs_teacher;

-- 4. Update constraint names
ALTER TABLE school_desk.programs DROP CONSTRAINT IF EXISTS courses_price_check;
ALTER TABLE school_desk.programs ADD CONSTRAINT programs_price_check CHECK (price >= 0);

ALTER TABLE school_desk.programs DROP CONSTRAINT IF EXISTS courses_status_check;
ALTER TABLE school_desk.programs ADD CONSTRAINT programs_status_check CHECK (status IN ('draft', 'published'));

ALTER TABLE school_desk.programs DROP CONSTRAINT IF EXISTS courses_type_check;
ALTER TABLE school_desk.programs ADD CONSTRAINT programs_type_check CHECK (type IN ('core', 'club', 'enrichment'));

ALTER TABLE school_desk.programs DROP CONSTRAINT IF EXISTS courses_open_to_outside_check;
ALTER TABLE school_desk.programs ADD CONSTRAINT programs_open_to_outside_check CHECK (
  open_to_outside = false OR (type IN ('club', 'enrichment'))
);

-- 5. Update foreign key constraints that reference school_desk.courses
ALTER TABLE school_desk.assignments DROP CONSTRAINT IF EXISTS assignments_course_id_fkey;
ALTER TABLE school_desk.assignments ADD CONSTRAINT assignments_program_id_fkey 
  FOREIGN KEY (course_id) REFERENCES school_desk.programs(id) ON DELETE CASCADE;

ALTER TABLE school_desk.attendance DROP CONSTRAINT IF EXISTS attendance_course_id_fkey;
ALTER TABLE school_desk.attendance ADD CONSTRAINT attendance_program_id_fkey 
  FOREIGN KEY (course_id) REFERENCES school_desk.programs(id) ON DELETE CASCADE;

ALTER TABLE school_desk.enrollments DROP CONSTRAINT IF EXISTS enrollments_course_id_fkey;
ALTER TABLE school_desk.enrollments ADD CONSTRAINT enrollments_program_id_fkey 
  FOREIGN KEY (course_id) REFERENCES school_desk.programs(id) ON DELETE CASCADE;

ALTER TABLE school_desk.gradebook DROP CONSTRAINT IF EXISTS gradebook_course_id_fkey;
ALTER TABLE school_desk.gradebook ADD CONSTRAINT gradebook_program_id_fkey 
  FOREIGN KEY (course_id) REFERENCES school_desk.programs(id) ON DELETE CASCADE;

ALTER TABLE public.chapters DROP CONSTRAINT IF EXISTS chapters_course_id_fkey;
ALTER TABLE public.chapters ADD CONSTRAINT chapters_program_id_fkey 
  FOREIGN KEY (course_id) REFERENCES school_desk.programs(id) ON DELETE CASCADE;

ALTER TABLE public.student_class DROP CONSTRAINT IF EXISTS student_class_class_id_fkey;
ALTER TABLE public.student_class ADD CONSTRAINT student_class_program_id_fkey 
  FOREIGN KEY (class_id) REFERENCES school_desk.programs(id);

ALTER TABLE public.schedule_slot DROP CONSTRAINT IF EXISTS schedule_slot_course_id_fkey;
ALTER TABLE public.schedule_slot ADD CONSTRAINT schedule_slot_program_id_fkey 
  FOREIGN KEY (course_id) REFERENCES school_desk.programs(id) ON DELETE CASCADE;

-- 6. Update RLS policy names
DROP POLICY IF EXISTS courses_admin_all ON school_desk.programs;
DROP POLICY IF EXISTS courses_published_read ON school_desk.programs;
DROP POLICY IF EXISTS courses_teacher_manage ON school_desk.programs;
DROP POLICY IF EXISTS courses_no_core_outside ON school_desk.programs;
DROP POLICY IF EXISTS c_adult_enrolled_read ON school_desk.programs;

CREATE POLICY programs_admin_all ON school_desk.programs
  FOR ALL TO authenticated
  USING ((tenant_id = jwt_tenant_id() OR tenant_id IS NULL) 
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK ((tenant_id = jwt_tenant_id() OR tenant_id IS NULL) 
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY programs_published_read ON school_desk.programs
  FOR SELECT TO authenticated
  USING (status = 'published' AND tenant_id = jwt_tenant_id());

CREATE POLICY programs_teacher_manage ON school_desk.programs
  FOR ALL TO authenticated
  USING (tenant_id = jwt_tenant_id() 
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin') AND p.id = teacher_id))
  WITH CHECK (tenant_id = jwt_tenant_id() 
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin') AND p.id = teacher_id));

CREATE POLICY programs_no_core_outside ON school_desk.programs
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'outside_student')
    OR (type <> 'core' AND open_to_outside = true));

CREATE POLICY programs_adult_enrolled_read ON school_desk.programs
  FOR SELECT TO authenticated
  USING (is_family_enrolled_in_course(id));

-- 7. Update function references
CREATE OR REPLACE FUNCTION is_family_enrolled_in_course(p_program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_class sc
    JOIN public.profiles pr ON pr.id = sc.student_id
    WHERE sc.class_id = p_program_id
      AND sc.student_id = auth.uid()
      AND pr.role = 'family'
  );
$$;

-- 8. Create backward-compatible view for existing code
CREATE OR REPLACE VIEW school_desk.courses AS
SELECT 
  id,
  title,
  description,
  price,
  status,
  teacher_id,
  created_at,
  updated_at,
  platform,
  type,
  open_to_outside,
  tenant_id
FROM school_desk.programs;

-- 9. Grant permissions on the view
GRANT SELECT ON school_desk.courses TO authenticated;
GRANT ALL ON school_desk.programs TO authenticated;
