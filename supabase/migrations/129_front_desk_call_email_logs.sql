-- Migration 129: Call logs + email logs for Front Desk (Row 65)
-- Zadarma PBX integration: call/email logging tables with RLS

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- CALL LOGS
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS front_desk.call_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenant_devotional(id),
  lead_id         uuid NOT NULL REFERENCES front_desk.leads(id),
  call_id         text,
  duration_seconds integer,
  direction       text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  outcome         text NOT NULL DEFAULT 'initiated' CHECK (outcome IN ('initiated', 'answered', 'missed', 'declined', 'voicemail', 'failed')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX idx_call_logs_tenant ON front_desk.call_logs (tenant_id);
CREATE INDEX idx_call_logs_lead ON front_desk.call_logs (lead_id);
CREATE INDEX idx_call_logs_feed ON front_desk.call_logs (tenant_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- EMAIL LOGS
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS front_desk.email_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenant_devotional(id),
  lead_id         uuid NOT NULL REFERENCES front_desk.leads(id),
  recipient_email text NOT NULL,
  subject         text NOT NULL,
  body            text NOT NULL,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'failed')),
  sent_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX idx_email_logs_tenant ON front_desk.email_logs (tenant_id);
CREATE INDEX idx_email_logs_lead ON front_desk.email_logs (lead_id);
CREATE INDEX idx_email_logs_feed ON front_desk.email_logs (tenant_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- RLS: CALL LOGS
-- ═══════════════════════════════════════════════════════════
ALTER TABLE front_desk.call_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS call_logs_admin_all ON front_desk.call_logs;
CREATE POLICY call_logs_admin_all ON front_desk.call_logs
  FOR ALL TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS call_logs_front_desk_select ON front_desk.call_logs;
CREATE POLICY call_logs_front_desk_select ON front_desk.call_logs
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'front_desk'
    )
  );

DROP POLICY IF EXISTS call_logs_front_desk_insert ON front_desk.call_logs;
CREATE POLICY call_logs_front_desk_insert ON front_desk.call_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'front_desk'
    )
  );

DROP POLICY IF EXISTS call_logs_front_desk_update ON front_desk.call_logs;
CREATE POLICY call_logs_front_desk_update ON front_desk.call_logs
  FOR UPDATE TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'front_desk'
    )
  );

-- ═══════════════════════════════════════════════════════════
-- RLS: EMAIL LOGS
-- ═══════════════════════════════════════════════════════════
ALTER TABLE front_desk.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_logs_admin_all ON front_desk.email_logs;
CREATE POLICY email_logs_admin_all ON front_desk.email_logs
  FOR ALL TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS email_logs_front_desk_select ON front_desk.email_logs;
CREATE POLICY email_logs_front_desk_select ON front_desk.email_logs
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'front_desk'
    )
  );

DROP POLICY IF EXISTS email_logs_front_desk_insert ON front_desk.email_logs;
CREATE POLICY email_logs_front_desk_insert ON front_desk.email_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'front_desk'
    )
  );

DROP POLICY IF EXISTS email_logs_front_desk_update ON front_desk.email_logs;
CREATE POLICY email_logs_front_desk_update ON front_desk.email_logs
  FOR UPDATE TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'front_desk'
    )
  );

-- ═══════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGERS
-- ═══════════════════════════════════════════════════════════
CREATE TRIGGER trg_call_logs_updated_at
  BEFORE UPDATE ON front_desk.call_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_email_logs_updated_at
  BEFORE UPDATE ON front_desk.email_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════
GRANT SELECT, INSERT, UPDATE ON front_desk.call_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON front_desk.email_logs TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════
COMMENT ON TABLE front_desk.call_logs IS 'Row 65: Call logs for Front Desk leads (Zadarma PBX integration)';
COMMENT ON TABLE front_desk.email_logs IS 'Row 65: Email logs for Front Desk leads (transactional email tracking)';
COMMENT ON COLUMN front_desk.call_logs.call_id IS 'Zadarma call identifier for webhook matching';
COMMENT ON COLUMN front_desk.call_logs.direction IS 'inbound or outbound call';
COMMENT ON COLUMN front_desk.call_logs.outcome IS 'Call result: initiated, answered, missed, declined, voicemail, failed';
COMMENT ON COLUMN front_desk.email_logs.status IS 'Email status: draft, sent, or failed';

COMMIT;
