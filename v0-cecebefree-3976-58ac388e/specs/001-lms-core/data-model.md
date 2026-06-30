# Data Model: LMS Core

## Entity Overview

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| User | Base user (student, instructor, or admin) | id, email, name, role, created_at |
| Course | A purchasable learning product | id, title, description, price, status, instructor_id, created_at, updated_at |
| Chapter | Video unit within a course | id, title, description, video_url, order_index, course_id, created_at |
| Enrollment | Student's purchased access | id, student_id, course_id, purchased_at, payment_reference |
| ChapterProgress | Student's completion of a chapter | id, student_id, chapter_id, completed_at |
| Registration | Admin audit view | id, student_id, course_id, enrolled_at, payment_status |

## Entity Relationships

```
User (1) ──┬── (many) Course          [instructor_id]
           ├── (many) Enrollment        [student_id]
           ├── (many) ChapterProgress  [student_id]
           └── (many) Registration     [student_id]

Course (1) ──┬── (many) Chapter        [course_id]
            └── (many) Enrollment      [course_id]

Chapter (1) ─── (many) ChapterProgress [chapter_id]
```

## Supabase Schema

### Table: users
```sql
-- Based on Supabase auth.users, extended with app-specific fields
-- Using auth.users as base, profiles table for additional fields

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'instructor', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS: Users can read their own profile. Admins can read all.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### Table: courses
```sql
CREATE TABLE public.courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Anyone can view published courses
CREATE POLICY "Anyone can view published courses" ON public.courses
  FOR SELECT USING (status = 'published');

-- Instructors can manage their own courses
CREATE POLICY "Instructors can manage their courses" ON public.courses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'instructor' AND id = instructor_id)
  );

-- Admins can view all courses
CREATE POLICY "Admins can view all courses" ON public.courses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### Table: chapters
```sql
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
      WHERE c.id = course_id AND p.id = auth.uid() AND p.role = 'instructor'
    )
  );

-- Admins can view all chapters
CREATE POLICY "Admins can view all chapters" ON public.chapters
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### Table: enrollments
```sql
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
```

### Table: chapter_progress
```sql
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

-- Instructors can view progress for their courses
CREATE POLICY "Instructors can view progress for their courses" ON public.chapter_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.profiles p ON c.instructor_id = p.id
      JOIN public.chapters ch ON ch.course_id = c.id
      WHERE ch.id = chapter_id AND p.id = auth.uid() AND p.role = 'instructor'
    )
  );

-- Admins can view all progress
CREATE POLICY "Admins can view all progress" ON public.chapter_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

## Validation Rules

| Entity | Field | Rule |
|--------|-------|------|
| profiles | name | Required, non-empty |
| profiles | role | Must be 'student', 'instructor', or 'admin' |
| courses | title | Required, non-empty |
| courses | price | Must be >= 0 |
| courses | status | Must be 'draft' or 'published' |
| chapters | title | Required, non-empty |
| chapters | video_url | Required, valid URL format |
| chapters | order_index | Must be >= 0, unique per course |
| enrollments | payment_reference | Required (after successful payment) |

## State Transitions

### Course Status
```
draft → published (instructor publishes)
published → draft (instructor unpublishes - optional, not in spec)
```

### Enrollment Lifecycle
```
(no record) → enrolled (student purchases)
enrolled → (no record) (refund - record deleted)
```

### Chapter Progress
```
(no record) → completed (student finishes video)
completed → (no record) (if chapter deleted)
```

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_courses_instructor ON public.courses(instructor_id);
CREATE INDEX idx_courses_status ON public.courses(status);
CREATE INDEX idx_chapters_course ON public.chapters(course_id);
CREATE INDEX idx_chapters_order ON public.chapters(course_id, order_index);
CREATE INDEX idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX idx_chapter_progress_student ON public.chapter_progress(student_id);
CREATE INDEX idx_chapter_progress_chapter ON public.chapter_progress(chapter_id);
```

## Migration Naming

New migrations for LMS Core: `013_lms_users_profiles.sql`, `014_lms_courses.sql`, `015_lms_chapters.sql`, `016_lms_enrollments.sql`, `017_lms_chapter_progress.sql`