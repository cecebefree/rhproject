INSERT INTO public.chapters (id, course_id, title, sequence_number, content_type)
VALUES 
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Chapter 1: Algebra Basics', 1, 'text'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Chapter 2: Linear Equations', 2, 'text')
ON CONFLICT (id) DO NOTHING;
