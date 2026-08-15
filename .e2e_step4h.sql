-- Create test course and chapters for chapters_read test
INSERT INTO school_desk.courses (id, tenant_id, title, subject, grade_level, teacher_id, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'e97e5c3a-1234-4321-abcd-000000000001',
  'E2E Test Course',
  'Mathematics',
  'Grade 10',
  '00000000-0000-0000-0000-000000000000',
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.chapters (id, course_id, title, sequence_number, content_type)
VALUES 
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Chapter 1: Algebra Basics', 1, 'text'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Chapter 2: Linear Equations', 2, 'text')
ON CONFLICT (id) DO NOTHING;

SELECT 'Course and chapters created' AS result;
