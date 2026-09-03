-- Create family_child linking table
CREATE TABLE IF NOT EXISTS public.family_child (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship text DEFAULT 'parent',
  created_at timestamptz DEFAULT now(),
  UNIQUE(guardian_id, child_id)
);

-- Create student_class linking table
CREATE TABLE IF NOT EXISTS public.student_class (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES school_desk.courses(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, class_id)
);

ALTER TABLE public.family_child ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_class ENABLE ROW LEVEL SECURITY;
