-- Manual enrollment function for admin use
-- Allows admin to enroll a student in a course manually

CREATE OR REPLACE FUNCTION public.enroll_student_manual(
  p_student_id UUID,
  p_course_id UUID,
  p_tenant_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(enrollment_id UUID, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enrollment_id UUID;
  v_already_enrolled BOOLEAN;
BEGIN
  -- Check if already enrolled
  SELECT EXISTS(
    SELECT 1 FROM school_desk.enrollments
    WHERE student_id = p_student_id AND course_id = p_course_id
  ) INTO v_already_enrolled;

  IF v_already_enrolled THEN
    RETURN QUERY SELECT NULL::UUID, 'already_enrolled'::TEXT;
    RETURN;
  END IF;

  -- Create enrollment
  INSERT INTO school_desk.enrollments (
    student_id, course_id, purchased_at,
    payment_reference, tenant_id
  ) VALUES (
    p_student_id, p_course_id, now(),
    COALESCE(p_notes, 'manual enrollment by admin'), p_tenant_id
  )
  RETURNING enrollments.id INTO v_enrollment_id;

  -- Create student_class entry for mobile app visibility
  INSERT INTO public.student_class (
    student_id, class_id, tenant_id, enrolled_at, is_active
  ) VALUES (
    p_student_id, p_course_id, p_tenant_id, now(), true
  )
  ON CONFLICT DO NOTHING;

  -- Update student enrollment status
  UPDATE public.students
  SET enrollment_status = 'active'
  WHERE id = p_student_id AND enrollment_status != 'active';

  RETURN QUERY SELECT v_enrollment_id, 'enrolled'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.enroll_student_manual(UUID, UUID, UUID, TEXT)
  IS 'Manually enroll a student in a course. Creates enrollment + student_class entry.';

GRANT EXECUTE ON FUNCTION public.enroll_student_manual(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_student_manual(UUID, UUID, UUID, TEXT) TO service_role;
