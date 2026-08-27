-- Migration 138: Webhooks & Automation
-- Creates webhooks, webhook_events tables with RLS policies

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══════════════════════════════════════════════════════════
-- WEBHOOKS TABLE
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_desk.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant_lms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret_key TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  events TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  headers JSONB DEFAULT '{}',
  retry_count INTEGER NOT NULL DEFAULT 3,
  timeout_ms INTEGER NOT NULL DEFAULT 5000,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Index for tenant isolation
CREATE INDEX idx_webhooks_tenant_id ON office_desk.webhooks(tenant_id);
CREATE INDEX idx_webhooks_active ON office_desk.webhooks(tenant_id, active) WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════
-- WEBHOOK EVENTS LOG TABLE
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_desk.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES office_desk.webhooks(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenant_lms(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
  error_message TEXT,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for webhook_events
CREATE INDEX idx_webhook_events_webhook_id ON office_desk.webhook_events(webhook_id);
CREATE INDEX idx_webhook_events_tenant_id ON office_desk.webhook_events(tenant_id);
CREATE INDEX idx_webhook_events_status ON office_desk.webhook_events(status);
CREATE INDEX idx_webhook_events_created_at ON office_desk.webhook_events(created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- WEBHOOK EVENT TYPES ENUM
-- ═══════════════════════════════════════════════════════════

-- Event types are stored as TEXT with CHECK constraints for flexibility
-- Common events: CONTACT_CREATED, CONTACT_UPDATED, CONTACT_DELETED,
-- LEAD_CREATED, LEAD_CONVERTED, INVOICE_CREATED, INVOICE_PAID

-- ═══════════════════════════════════════════════════════════
-- WEBHOOK NOTIFICATION PREFERENCES TABLE
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_desk.webhook_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant_lms(id) ON DELETE CASCADE UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  email_recipients TEXT[] DEFAULT '{}',
  notify_on_failure BOOLEAN NOT NULL DEFAULT true,
  notify_on_success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for tenant isolation
CREATE INDEX idx_webhook_notification_prefs_tenant ON office_desk.webhook_notification_preferences(tenant_id);

-- ═══════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION office_desk.update_webhook_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_webhook_updated_at
  BEFORE UPDATE ON office_desk.webhooks
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.update_webhook_timestamp();

CREATE TRIGGER set_webhook_event_updated_at
  BEFORE UPDATE ON office_desk.webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.update_webhook_timestamp();

CREATE TRIGGER set_webhook_notification_prefs_updated_at
  BEFORE UPDATE ON office_desk.webhook_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.update_webhook_timestamp();

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

ALTER TABLE office_desk.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.webhook_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY webhooks_admin_all ON office_desk.webhooks
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'admin'
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Office desk role can manage webhooks
CREATE POLICY webhooks_office_desk_manage ON office_desk.webhooks
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'office_desk'
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Service role can manage webhooks (for backend operations)
CREATE POLICY webhooks_service_role ON office_desk.webhooks
  FOR ALL
  USING (true);

-- Admin can view webhook events
CREATE POLICY webhook_events_admin_select ON office_desk.webhook_events
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'admin'
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Office desk role can view webhook events
CREATE POLICY webhook_events_office_desk_select ON office_desk.webhook_events
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'office_desk'
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Service role can manage webhook events (for backend operations)
CREATE POLICY webhook_events_service_role ON office_desk.webhook_events
  FOR ALL
  USING (true);

-- Admin can manage notification preferences
CREATE POLICY webhook_notification_prefs_admin_all ON office_desk.webhook_notification_preferences
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'admin'
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Office desk role can manage notification preferences
CREATE POLICY webhook_notification_prefs_office_desk_manage ON office_desk.webhook_notification_preferences
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'office_desk'
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Service role can manage notification preferences
CREATE POLICY webhook_notification_prefs_service_role ON office_desk.webhook_notification_preferences
  FOR ALL
  USING (true);

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════

-- Grant usage on schema
GRANT USAGE ON SCHEMA office_desk TO authenticated;
GRANT USAGE ON SCHEMA office_desk TO service_role;

-- Grant table access
GRANT ALL ON office_desk.webhooks TO authenticated;
GRANT ALL ON office_desk.webhook_events TO authenticated;
GRANT ALL ON office_desk.webhook_notification_preferences TO authenticated;
GRANT ALL ON office_desk.webhooks TO service_role;
GRANT ALL ON office_desk.webhook_events TO service_role;
GRANT ALL ON office_desk.webhook_notification_preferences TO service_role;

-- Grant sequence access
GRANT USAGE ON ALL SEQUENCES IN SCHEMA office_desk TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA office_desk TO service_role;

-- ═══════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════

-- Function to fire webhook event
CREATE OR REPLACE FUNCTION office_desk.fire_webhook_event(
  p_tenant_id UUID,
  p_event_type TEXT,
  p_payload JSONB
)
RETURNS UUID AS $$
DECLARE
  v_webhook RECORD;
  v_event_id UUID;
BEGIN
  -- Find active webhooks that subscribe to this event type
  FOR v_webhook IN
    SELECT id, url, secret_key, retry_count, timeout_ms
    FROM office_desk.webhooks
    WHERE tenant_id = p_tenant_id
      AND active = true
      AND deleted_at IS NULL
      AND p_event_type = ANY(events)
  LOOP
    -- Create webhook event record
    INSERT INTO office_desk.webhook_events (
      webhook_id,
      tenant_id,
      event_type,
      payload,
      max_attempts,
      status
    ) VALUES (
      v_webhook.id,
      p_tenant_id,
      p_event_type,
      p_payload,
      v_webhook.retry_count,
      'pending'
    ) RETURNING id INTO v_event_id;
    
    -- Log to audit trail (optional)
    RAISE NOTICE 'Webhook event % created for webhook %', v_event_type, v_webhook.id;
  END LOOP;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to retry failed webhook events
CREATE OR REPLACE FUNCTION office_desk.retry_webhook_events(
  p_max_retries INTEGER DEFAULT 10
)
RETURNS INTEGER AS $$
DECLARE
  v_event RECORD;
  v_retried INTEGER := 0;
BEGIN
  FOR v_event IN
    SELECT we.id, we.webhook_id, we.event_type, we.payload, we.attempts, we.max_attempts,
           w.url, w.secret_key, w.timeout_ms
    FROM office_desk.webhook_events we
    JOIN office_desk.webhooks w ON w.id = we.webhook_id
    WHERE we.status IN ('pending', 'retrying')
      AND we.attempts < we.max_attempts
      AND (we.next_retry_at IS NULL OR we.next_retry_at <= now())
    ORDER BY we.created_at ASC
    LIMIT p_max_retries
  LOOP
    -- Mark as retrying
    UPDATE office_desk.webhook_events
    SET status = 'retrying',
        attempts = attempts + 1,
        updated_at = now()
    WHERE id = v_event.id;
    
    v_retried := v_retried + 1;
  END LOOP;
  
  RETURN v_retried;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify webhook signature
CREATE OR REPLACE FUNCTION office_desk.verify_webhook_signature(
  p_secret TEXT,
  p_signature TEXT,
  p_payload TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_expected TEXT;
BEGIN
  -- HMAC-SHA256 signature verification
  v_expected := encode(
    hmac(p_payload::bytea, p_secret::bytea, 'sha256'),
    'hex'
  );
  RETURN v_expected = p_signature;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
