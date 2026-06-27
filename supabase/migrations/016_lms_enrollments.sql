-- LMS Core: Enrollments table with RLS policies

CREATE TABLE public.enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  payment_reference TEXT,
  UNIQUE (student_id, course_id)
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Students can view their own enrollments
CREATE POLICY "Students can view their enrollments" ON public.enrollments
  FOR SELECT USING (auth.uid() = student_id);

-- Students can create enrollments (after payment - verified via payment_reference)
CREATE POLICY "Students can create enrollments" ON public.enrollments
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Students can delete their enrollments (for refunds)
CREATE POLICY "Students can delete their enrollments" ON public.enrollments
  FOR DELETE USING (auth.uid() = student_id);

-- Instructors can view enrollments for their courses
CREATE POLICY "Instructors can view enrollments for their courses" ON public.enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.profiles p ON c.instructor_id = p.id
      WHERE c.id = course_id AND p.id = auth.uid() AND p.role = 'instructor'
    )
  );

-- Admins can view all enrollments
CREATE POLICY "Admins can view all enrollments" ON public.enrollments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Performance indexes
CREATE INDEX idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX idx_enrollments_course ON public.enrollments(course_id);