-- Migration 120: Create school_desk.broadcasts table + RLS (Row 69)
-- Teacher-to-group broadcasts for School Front Desk
-- One-to-many: teacher sends broadcast to a group (conversation)

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- BROADCASTS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_desk.broadcasts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenant_lms(id),
  group_id        uuid NOT NULL REFERENCES school_desk.conversations(id),
  title           text NOT NULL,
  message         text NOT NULL,
  created_by      uuid NOT NULL REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz,
  deleted_at      timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_broadcasts_tenant ON school_desk.broadcasts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_group ON school_desk.broadcasts (group_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_feed ON school_desk.broadcasts (tenant_id, sent_at DESC);

-- ═══════════════════════════════════════════════════════════
-- ENABLE RLS
-- ═══════════════════════════════════════════════════════════
ALTER TABLE school_desk.broadcasts ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

-- 1. Admin: full access within tenant
CREATE POLICY school_desk_broadcasts_admin_all ON school_desk.broadcasts
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

-- 2. Teachers: read broadcasts in own tenant
CREATE POLICY school_desk_broadcasts_select ON school_desk.broadcasts
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'teacher'
    )
  );

-- 3. Teachers: insert broadcasts to groups in own tenant
CREATE POLICY school_desk_broadcasts_insert ON school_desk.broadcasts
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = jwt_tenant_id()
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'teacher'
    )
    AND EXISTS (
      SELECT 1 FROM school_desk.conversations c
      WHERE c.id = group_id AND c.tenant_id = jwt_tenant_id()
    )
  );

-- 4. Teachers: update own broadcasts
CREATE POLICY school_desk_broadcasts_update ON school_desk.broadcasts
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
CREATE TRIGGER trg_broadcasts_updated_at
  BEFORE UPDATE ON school_desk.broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════
GRANT SELECT, INSERT, UPDATE ON school_desk.broadcasts TO authenticated;

COMMENT ON TABLE school_desk.broadcasts IS 'Row 69: Teacher-to-group broadcasts for School Front Desk';
COMMENT ON POLICY school_desk_broadcasts_select ON school_desk.broadcasts IS 'Teachers read broadcasts in own tenant';
COMMENT ON POLICY school_desk_broadcasts_insert ON school_desk.broadcasts IS 'Teachers insert broadcasts to groups in own tenant';
COMMENT ON POLICY school_desk_broadcasts_update ON school_desk.broadcasts IS 'Teachers update own broadcasts';

COMMIT;
