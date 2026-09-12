-- Migration: Update news categories to match school desk requirements
-- Categories: junior_news, senior_news, staff_news, adult_news, general_news
-- Replaces old categories: general, school_desk, student_body, schoolboard, hub

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- DROP OLD CHECK CONSTRAINT
-- ═══════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'news_category_check'
    AND conrelid = 'school_desk.news'::regclass
  ) THEN
    ALTER TABLE school_desk.news DROP CONSTRAINT news_category_check;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════
-- MIGRATE OLD DATA TO NEW CATEGORIES
-- ═══════════════════════════════════════════════════════════
UPDATE school_desk.news SET category = 'general_news' WHERE category = 'general';
UPDATE school_desk.news SET category = 'staff_news' WHERE category = 'school_desk';
UPDATE school_desk.news SET category = 'junior_news' WHERE category = 'student_body';
UPDATE school_desk.news SET category = 'senior_news' WHERE category = 'schoolboard';
UPDATE school_desk.news SET category = 'general_news' WHERE category = 'hub';

-- ═══════════════════════════════════════════════════════════
-- ADD NEW CHECK CONSTRAINT
-- ═══════════════════════════════════════════════════════════
ALTER TABLE school_desk.news
  ADD CONSTRAINT news_category_check
  CHECK (category IN ('junior_news', 'senior_news', 'staff_news', 'adult_news', 'general_news'));

-- ═══════════════════════════════════════════════════════════
-- UPDATE DEFAULT
-- ═══════════════════════════════════════════════════════════
ALTER TABLE school_desk.news ALTER COLUMN category SET DEFAULT 'general_news';

-- ═══════════════════════════════════════════════════════════
-- UPDATE COMMENT
-- ═══════════════════════════════════════════════════════════
COMMENT ON COLUMN school_desk.news.category IS 'News category: junior_news, senior_news, staff_news, adult_news, general_news';

-- ═══════════════════════════════════════════════════════════
-- ADD audience靶fields FOR TARGETING
-- ═══════════════════════════════════════════════════════════
ALTER TABLE school_desk.news
  ADD COLUMN IF NOT EXISTS target_audience text[] DEFAULT ARRAY['all'];

COMMENT ON COLUMN school_desk.news.target_audience IS 'Target audience array: students, parents, teachers, staff, all';

-- ═══════════════════════════════════════════════════════════
-- REBUILD INDEX
-- ═══════════════════════════════════════════════════════════
DROP INDEX IF EXISTS idx_news_category;
CREATE INDEX idx_news_category ON school_desk.news (tenant_id, category, published_at DESC);

COMMIT;
