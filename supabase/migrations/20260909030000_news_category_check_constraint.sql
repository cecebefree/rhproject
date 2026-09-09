-- Migration: Add CHECK constraint for news category values
-- Categories: general, school_desk, student_body, schoolboard, hub

-- ═══════════════════════════════════════════════════════════
-- ADD CHECK CONSTRAINT (idempotent)
-- ═══════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'news_category_check'
    AND conrelid = 'school_desk.news'::regclass
  ) THEN
    ALTER TABLE school_desk.news
      ADD CONSTRAINT news_category_check
      CHECK (category IN ('general', 'school_desk', 'student_body', 'schoolboard', 'hub'));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════
-- UPDATE COMMENT
-- ═══════════════════════════════════════════════════════════
COMMENT ON COLUMN school_desk.news.category IS 'News category: general, school_desk, student_body, schoolboard, hub';
