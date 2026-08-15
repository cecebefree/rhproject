-- Migration 126: Create log_events table for webhook debugging (Row 76)
-- Stores failed webhook attempts and processing errors for debugging

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- LOG EVENTS — webhook debug logging
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.log_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    text NOT NULL,
  payload       jsonb NOT NULL DEFAULT '{}',
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_log_events_type
  ON public.log_events (event_type);

CREATE INDEX IF NOT EXISTS idx_log_events_created
  ON public.log_events (created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- RLS: service_role only (Edge Functions use service_role)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.log_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS log_events_service_role ON public.log_events;
CREATE POLICY log_events_service_role
  ON public.log_events FOR ALL TO service_role
  USING (true);

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════
GRANT ALL ON public.log_events TO service_role;

-- ═══════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════
COMMENT ON TABLE public.log_events IS
  'Row 76: Webhook debug logging. Stores failed webhook attempts and processing errors.';
COMMENT ON COLUMN public.log_events.event_type IS
  'Stripe event type or error category (e.g. checkout.session.completed)';
COMMENT ON COLUMN public.log_events.payload IS
  'Full event payload or relevant subset (truncated if too large)';
COMMENT ON COLUMN public.log_events.error_message IS
  'Error message if processing failed';

COMMIT;
