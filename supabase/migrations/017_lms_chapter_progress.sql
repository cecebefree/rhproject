-- LMS Core: Chapter progress table with RLS policies

CREATE TABLE public.chapter_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (student_id, chapter_id)
);

ALTER TABLE public.chapter_progress ENABLE ROW LEVEL SECURITY;

-- Students can view their own progress
CREATE POLICY "Students can view their own progress" ON public.chapter_progress
  FOR SELECT USING (auth.uid() = student_id);

-- Students can insert their own progress (mark chapter complete)
CREATE POLICY "Students can mark chapters complete" ON public.chapter_progress
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Students can delete their own progress
CREATE POLICY "Students can delete their own progress" ON public.chapter_progress
  FOR DELETE USING (auth.uid() = student_id);

-- Teachers can view progress for their courses
CREATE POLICY "Teachers can view progress for their courses" ON public.chapter_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.profiles p ON c.teacher_id = p.id
      JOIN public.chapters ch ON ch.course_id = c.id
      WHERE ch.id = chapter_id AND p.id = auth.uid() AND p.role IN ('teacher', 'admin')
    )
  );

-- Admins can view all progress
CREATE POLICY "Admins can view all progress" ON public.chapter_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Performance indexes
CREATE INDEX idx_chapter_progress_student ON public.chapter_progress(student_id);
CREATE INDEX idx_chapter_progress_chapter ON public.chapter_progress(chapter_id);