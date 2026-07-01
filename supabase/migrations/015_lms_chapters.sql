-- LMS Core: Chapters table with RLS policies

CREATE TABLE public.chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  order_index INTEGER NOT NULL CHECK (order_index >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (course_id, order_index)
);

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- Anyone can view chapters of published courses
CREATE POLICY "Anyone can view chapters of published courses" ON public.chapters
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND status = 'published')
  );

-- Instructors can manage chapters of their courses
CREATE POLICY "Instructors can manage chapters of their courses" ON public.chapters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.profiles p ON c.instructor_id = p.id
      WHERE c.id = course_id AND p.id = auth.uid() AND p.role IN ('teacher', 'instructor', 'admin')
    )
  );

-- Admins can view all chapters
CREATE POLICY "Admins can view all chapters" ON public.chapters
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Performance indexes
CREATE INDEX idx_chapters_course ON public.chapters(course_id);
CREATE INDEX idx_chapters_order ON public.chapters(course_id, order_index);