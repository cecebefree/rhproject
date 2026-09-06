-- Contracts table + generate_contract function

-- 1. Contracts table
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant_devotional(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  enrollment_id UUID,
  registration_id UUID REFERENCES office_desk.registrations(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_signature', 'active', 'expired', 'terminated')),
  title TEXT NOT NULL DEFAULT 'Student Enrollment Agreement',
  terms JSONB DEFAULT '{}'::jsonb,
  start_date DATE,
  end_date DATE,
  signed_at TIMESTAMPTZ,
  signed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contracts_student_id ON public.contracts(student_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON public.contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_registration_id ON public.contracts(registration_id) WHERE registration_id IS NOT NULL;

COMMENT ON TABLE public.contracts IS 'Student enrollment agreements linking students to terms and payment schedules';

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contracts_admin_all ON public.contracts
  FOR ALL USING (
    (jwt_tenant_id() = tenant_id OR tenant_id IS NULL)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY contracts_student_select ON public.contracts
  FOR SELECT USING (
    auth.uid() = signed_by
    OR auth.uid() = (SELECT user_id FROM public.students WHERE id = student_id)
  );

CREATE POLICY contracts_service_role_all ON public.contracts
  FOR ALL USING (auth.role() = 'service_role');

GRANT ALL ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;

-- 2. Function: generate contract from enrollment
CREATE OR REPLACE FUNCTION public.generate_contract_from_enrollment(
  p_student_id UUID,
  p_enrollment_id UUID DEFAULT NULL,
  p_registration_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract_id UUID;
  v_student RECORD;
  v_tenant_id UUID;
  v_terms JSONB;
BEGIN
  SELECT * INTO v_student FROM public.students WHERE id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student % not found', p_student_id;
  END IF;

  -- Get tenant from student's registration or default
  IF p_registration_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant_id
      FROM office_desk.registrations WHERE id = p_registration_id;
  END IF;

  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id
      FROM public.tenant_devotional WHERE is_active = true LIMIT 1;
  END IF;

  -- Build terms
  v_terms := jsonb_build_object(
    'student_name', v_student.first_name || ' ' || v_student.last_name,
    'student_email', v_student.email,
    'grade', v_student.grade,
    'enrollment_status', v_student.enrollment_status,
    'payment_terms', 'Annual fees due before start of term',
    'cancellation_policy', '30 days written notice required',
    'liability_waiver', 'Student participates at own risk',
    'generated_at', now()::text
  );

  INSERT INTO public.contracts (
    tenant_id, student_id, enrollment_id, registration_id,
    title, terms, start_date, end_date, status
  ) VALUES (
    v_tenant_id, p_student_id, p_enrollment_id, p_registration_id,
    'Student Enrollment Agreement', v_terms,
    CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'draft'
  )
  RETURNING id INTO v_contract_id;

  RETURN v_contract_id;
END;
$$;

COMMENT ON FUNCTION public.generate_contract_from_enrollment(UUID, UUID, UUID)
  IS 'Generates a draft contract for a student enrollment. SECURITY DEFINER to bypass RLS.';

GRANT EXECUTE ON FUNCTION public.generate_contract_from_enrollment(UUID, UUID, UUID) TO service_role;

-- 3. Update create_student_from_registration to also generate contract
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
  v_contract_id UUID;
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

  -- Generate draft contract
  SELECT public.generate_contract_from_enrollment(
    v_student_id, v_enrollment_id, p_registration_id
  ) INTO v_contract_id;

  RETURN QUERY SELECT v_student_id, v_enrollment_id,
    CASE
      WHEN v_enrollment_id IS NOT NULL THEN 'enrolled'
      ELSE 'created_no_course'
    END::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_student_from_registration(UUID) TO service_role;
