-- Remove policies referencing non-existent tables
DROP POLICY IF EXISTS c_adult_enrolled_read ON school_desk.courses;
DROP POLICY IF EXISTS sc_adult_read ON public.student_class;
DROP POLICY IF EXISTS p_adult_child_read ON public.profiles;
DROP FUNCTION IF EXISTS public.fn_is_guardian_of_child(uuid, uuid);
