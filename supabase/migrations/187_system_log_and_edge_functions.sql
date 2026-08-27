-- Migration 186: system_log table for Edge Function execution logs
-- Also adds increment_invoice_retry RPC for nightly-reconciliation

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- SYSTEM_LOG — Edge Function execution audit trail
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS system_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('success', 'error', 'warning')),
  details       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_log_function ON system_log(function_name);
CREATE INDEX idx_system_log_created ON system_log(created_at);
CREATE INDEX idx_system_log_status ON system_log(status);

-- ═══════════════════════════════════════════════════════════
-- RLS: SYSTEM_LOG
-- ═══════════════════════════════════════════════════════════
ALTER TABLE system_log ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/write (internal use only)
CREATE POLICY "service_role_manage_system_log" ON system_log
  FOR ALL USING (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════
GRANT SELECT, INSERT ON system_log TO service_role;

-- ═══════════════════════════════════════════════════════════
-- RPC: increment_invoice_retry (for nightly-reconciliation)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_invoice_retry(p_invoice_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE invoices
  SET retry_count = COALESCE(retry_count, 0) + 1,
      updated_at = NOW()
  WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_invoice_retry TO service_role;

-- ═══════════════════════════════════════════════════════════
-- CRON: Schedule nightly-reconciliation at 00:00 UTC daily
-- ═══════════════════════════════════════════════════════════
-- NOTE: Requires pg_cron extension enabled
-- Uncomment after pg_cron is installed:
--
-- SELECT cron.schedule(
--   'nightly-reconciliation',
--   '0 0 * * *',
--   $job$
--   SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/nightly-reconciliation',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
--       'Content-Type', 'application/json'
--     ),
--     body := '{"timestamp": "' || now()::text || '"}'::jsonb
--   );
--   $job$
-- );

-- ═══════════════════════════════════════════════════════════
-- CRON: Schedule class-start-ping every 5 minutes
-- ═══════════════════════════════════════════════════════════
-- Uncomment after pg_cron is installed:
--
-- SELECT cron.schedule(
--   'class-start-ping',
--   '*/5 * * * *',
--   $job$
--   SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/class-start-ping',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
--       'Content-Type', 'application/json'
--     ),
--     body := '{"timestamp": "' || now()::text || '"}'::jsonb
--   );
--   $job$
-- );

COMMIT;
