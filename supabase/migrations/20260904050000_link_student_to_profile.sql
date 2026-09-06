-- Link student to auth profile
-- 1. Add user_id + email to public.students
-- 2. Update handle_new_user() to auto-link existing students

-- 1. Add columns to students
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email) WHERE email IS NOT NULL;

-- 2. Update create_student_from_registration to set email from registration
CREATE OR REPLACE FUNCTION public.create_student_from_registration(p_registration_id UUID)
RETURNS TABLE(student_id UUID, enrollment_id UUID, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reg RECORD;
  v_student_id UUID;
  v_enrollment_id UUID;
  v_course_id UUID;
  v_first_name TEXT;
  v_last_name TEXT;
  v_name_parts TEXT[];
  v_academic_group_id UUID;
BEGIN
  SELECT * INTO v_reg
    FROM office_desk.registrations
    WHERE id = p_registration_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration % not found', p_registration_id;
  END IF;

  IF v_reg.status NOT IN ('active', 'approved') THEN
    RAISE EXCEPTION 'Registration % is not active (status: %)', p_registration_id, v_reg.status;
  END IF;

  SELECT s.id INTO v_student_id
    FROM public.students s
    WHERE s.registration_id = p_registration_id
    LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT v_student_id, NULL::UUID, 'already_exists'::TEXT;
    RETURN;
  END IF;

  v_name_parts := string_to_array(trim(v_reg.student_name), ' ');
  v_first_name := v_name_parts[1];
  v_last_name := COALESCE(v_name_parts[2], '');

  SELECT id INTO v_academic_group_id
    FROM supabase.organizations
    ORDER BY created_at
    LIMIT 1;

  IF v_academic_group_id IS NULL THEN
    RAISE EXCEPTION 'No organizations found - cannot create student without academic_group_id';
  END IF;

  INSERT INTO public.students (
    first_name, last_name, grade,
    academic_group_id, enrollment_status, enrollment_date,
    registration_id, email
  ) VALUES (
    v_first_name, v_last_name, 'unassigned',
    v_academic_group_id, 'pending', now(),
    p_registration_id, v_reg.student_email
  )
  RETURNING students.id INTO v_student_id;

  -- Try to find matching auth user by email and link
  IF v_reg.student_email IS NOT NULL AND v_reg.student_email != '' THEN
    UPDATE public.students
      SET user_id = (
        SELECT au.id FROM auth.users au
        WHERE lower(au.email) = lower(v_reg.student_email)
        LIMIT 1
      )
      WHERE id = v_student_id
        AND user_id IS NULL;
  END IF;

  IF v_reg.course_name IS NOT NULL AND v_reg.course_name != '' THEN
    SELECT c.id INTO v_course_id
      FROM school_desk.courses c
      WHERE c.tenant_id = v_reg.tenant_id
        AND lower(c.title) = lower(v_reg.course_name)
        AND c.status = 'published'
      LIMIT 1;

    IF v_course_id IS NOT NULL THEN
      INSERT INTO school_desk.enrollments (
        student_id, course_id, purchased_at,
        payment_reference, tenant_id, registration_id
      ) VALUES (
        v_student_id, v_course_id, now(),
        'auto-enrolled from registration', v_reg.tenant_id, p_registration_id
      )
      RETURNING enrollments.id INTO v_enrollment_id;

      INSERT INTO public.student_class (
        student_id, class_id, tenant_id, enrolled_at, is_active
      ) VALUES (
        v_student_id, v_course_id, v_reg.tenant_id, now(), true
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN QUERY SELECT v_student_id, v_enrollment_id,
    CASE WHEN v_enrollment_id IS NOT NULL THEN 'enrolled' ELSE 'created_no_course' END::TEXT;
END;
$$;

-- 3. Update handle_new_user to auto-link existing student by email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, tenant_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    'student',
    NULL
  );

  -- Auto-link to existing student record by email
  UPDATE public.students
    SET user_id = NEW.id
    WHERE lower(email) = lower(NEW.email)
      AND user_id IS NULL;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_student_from_registration(UUID) TO service_role;
