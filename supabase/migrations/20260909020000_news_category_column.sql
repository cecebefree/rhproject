-- Migration: Add category column to school_desk.news
-- Categories: general, announcements, events, academic, sports, etc.

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- ADD CATEGORY COLUMN
-- ═══════════════════════════════════════════════════════════
ALTER TABLE school_desk.news
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general'
  CHECK (category IN ('general', 'school_desk', 'student_body', 'schoolboard', 'hub'));

COMMENT ON COLUMN school_desk.news.category IS 'News category: general, school_desk, student_body, schoolboard, hub';

-- Index for category-based queries
CREATE INDEX IF NOT EXISTS idx_news_category ON school_desk.news (tenant_id, category, published_at DESC);

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════
GRANT SELECT, INSERT, UPDATE ON school_desk.news TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════
COMMENT ON COLUMN school_desk.news.category IS 'News category: general, school_desk, student_body, schoolboard, hub';

COMMIT;
