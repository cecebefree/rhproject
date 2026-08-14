-- Migration 119: Create school_desk.news table + RLS (Row 68)
-- Teacher-authored news/updates for School Front Desk
-- Separate from school_desk.announcement (admin-only broadcasts)

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- NEWS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_desk.news (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenant_lms(id),
  title           text NOT NULL,
  content         text NOT NULL,
  created_by      uuid NOT NULL REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  published_at    timestamptz,
  deleted_at      timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_news_tenant ON school_desk.news (tenant_id);
CREATE INDEX IF NOT EXISTS idx_news_feed ON school_desk.news (tenant_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_created_by ON school_desk.news (created_by);

-- ═══════════════════════════════════════════════════════════
-- ENABLE RLS
-- ═══════════════════════════════════════════════════════════
ALTER TABLE school_desk.news ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

-- 1. Admin: full access within tenant
CREATE POLICY school_desk_news_admin_all ON school_desk.news
  FOR ALL TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 2. Teachers: read published news OR own drafts
CREATE POLICY school_desk_news_select ON school_desk.news
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND deleted_at IS NULL
    AND (
      published_at IS NOT NULL
      OR created_by = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'teacher'
    )
  );

-- 3. Teachers: insert news in own tenant
CREATE POLICY school_desk_news_insert ON school_desk.news
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = jwt_tenant_id()
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'teacher'
    )
  );

-- 4. Teachers: update own news
CREATE POLICY school_desk_news_update ON school_desk.news
  FOR UPDATE TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND created_by = auth.uid()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'teacher'
    )
  )
  WITH CHECK (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'teacher'
    )
  );

-- ═══════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER
-- ═══════════════════════════════════════════════════════════
CREATE TRIGGER trg_news_updated_at
  BEFORE UPDATE ON school_desk.news
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════
GRANT SELECT, INSERT, UPDATE ON school_desk.news TO authenticated;

COMMENT ON TABLE school_desk.news IS 'Row 68: Teacher-authored news/updates for School Front Desk';
COMMENT ON POLICY school_desk_news_select ON school_desk.news IS 'Teachers read published news or own drafts';
COMMENT ON POLICY school_desk_news_insert ON school_desk.news IS 'Teachers insert news in own tenant';
COMMENT ON POLICY school_desk_news_update ON school_desk.news IS 'Teachers update own news';

COMMIT;
