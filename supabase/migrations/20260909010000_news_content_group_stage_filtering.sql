-- Migration: Add content_group to school_desk.news for stage-based filtering
-- News can be: 'junior', 'senior', or 'general' (applies to all stages)
-- Also adds RLS policies for students/parents to read published news

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- ADD CONTENT_GROUP COLUMN
-- ═══════════════════════════════════════════════════════════
ALTER TABLE school_desk.news
  ADD COLUMN IF NOT EXISTS content_group text NOT NULL DEFAULT 'general'
  CHECK (content_group IN ('junior', 'senior', 'general'));

COMMENT ON COLUMN school_desk.news.content_group IS 'School stage scope: junior, senior, or general (all stages)';

-- Index for stage-based queries
CREATE INDEX IF NOT EXISTS idx_news_content_group ON school_desk.news (tenant_id, content_group, published_at DESC);

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES FOR STUDENTS/PARENTS
-- ═══════════════════════════════════════════════════════════

-- Students: read published news for their stage or general
CREATE POLICY school_desk_news_select_student ON school_desk.news
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND deleted_at IS NULL
    AND published_at IS NOT NULL
    AND (
      content_group = 'general'
      OR content_group = (
        SELECT stage FROM public.profiles
        WHERE id = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'student'
    )
  );

-- Parents (family): read published news for their children's stage or general
CREATE POLICY school_desk_news_select_parent ON school_desk.news
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND deleted_at IS NULL
    AND published_at IS NOT NULL
    AND (
      content_group = 'general'
      OR content_group IN (
        SELECT stage FROM public.profiles
        WHERE id = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'family'
    )
  );

-- ═══════════════════════════════════════════════════════════
-- UPDATE EXISTING NEWS TO 'general' (safe default)
-- ═══════════════════════════════════════════════════════════
-- Existing news articles apply to all stages by default
UPDATE school_desk.news
SET content_group = 'general'
WHERE content_group IS DISTINCT FROM 'general'
  AND content_group IS DISTINCT FROM 'junior'
  AND content_group IS DISTINCT FROM 'senior';

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════
GRANT SELECT, INSERT, UPDATE ON school_desk.news TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════
COMMENT ON POLICY school_desk_news_select_student ON school_desk.news IS 'Students read published news for their stage or general';
COMMENT ON POLICY school_desk_news_select_parent ON school_desk.news IS 'Parents read published news for their children stage or general';

COMMIT;
