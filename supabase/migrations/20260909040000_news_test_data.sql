-- Migration: Insert test news articles for stage + category filtering
-- These are demo articles to verify the filtering works on mobile
-- Skips if no profiles exist (created_by is NOT NULL)

DO $$
DECLARE
  v_creator uuid;
BEGIN
  SELECT id INTO v_creator FROM public.profiles WHERE tenant_id = 'e97e5c3a-1234-4321-abcd-000000000001' LIMIT 1;
  IF v_creator IS NULL THEN
    RAISE NOTICE 'No profiles found — skipping test news data';
    RETURN;
  END IF;

  INSERT INTO school_desk.news (tenant_id, title, content, content_group, category, created_by, published_at)
  SELECT
    'e97e5c3a-1234-4321-abcd-000000000001',
    title,
    content,
    content_group,
    category,
    v_creator,
    now()
  FROM (VALUES
    ('Welcome Back to Term 2', 'We are excited to welcome all students back for Term 2. Please check the updated schedule and bring your supplies.', 'general', 'general'),
    ('School Holiday Notice', 'School will be closed next Monday for the public holiday. Classes resume Tuesday.', 'general', 'school_desk'),
    ('Junior School Sports Day', 'Junior School Sports Day is this Friday! Students should wear their PE kits and bring water bottles.', 'junior', 'student_body'),
    ('Junior School Art Exhibition', 'Come see the amazing artwork from our Junior School students at the annual art exhibition in the main hall.', 'junior', 'general'),
    ('Senior School Exam Schedule', 'The exam schedule for Senior School students has been published. Please check your student portal for details.', 'senior', 'school_desk'),
    ('Senior School Career Fair', 'Senior School students are invited to the annual career fair next Wednesday. Bring your questions!', 'senior', 'hub'),
    ('Schoolboard Meeting Minutes', 'The latest schoolboard meeting minutes are now available. Key topics include budget review and new initiatives.', 'general', 'schoolboard')
  ) AS v(title, content, content_group, category)
  WHERE NOT EXISTS (
    SELECT 1 FROM school_desk.news
    WHERE tenant_id = 'e97e5c3a-1234-4321-abcd-000000000001'
  );
END $$;
