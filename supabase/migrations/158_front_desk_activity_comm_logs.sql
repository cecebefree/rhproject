-- Migration 158: Front Desk activity_log + communication_log
-- Append-only tables for unified contact timeline

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- TABLE: front_desk.activity_log
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS front_desk.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES front_desk.inquiries(id) ON DELETE CASCADE,
  desk VARCHAR(20) NOT NULL
    CHECK (desk IN ('front', 'office', 'school')),
  action VARCHAR(50) NOT NULL
    CHECK (action IN (
      'call_logged', 'email_sent', 'sms_sent', 'document_uploaded',
      'status_updated', 'ai_categorized', 'counselor_assigned',
      'escalated', 'note_added', 'callback_scheduled', 'moved_to_office'
    )),
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
  performed_by UUID REFERENCES public.staff_profiles(id),
  data JSONB DEFAULT '{}'::jsonb
  -- Expected keys: {duration, outcome, notes, channel, template, priority, reason}
);

-- ═══════════════════════════════════════════════════════════
-- TABLE: front_desk.communication_log
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS front_desk.communication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES front_desk.inquiries(id) ON DELETE CASCADE,
  desk VARCHAR(20) NOT NULL
    CHECK (desk IN ('front', 'office', 'school')),
  channel VARCHAR(20) NOT NULL
    CHECK (channel IN ('email', 'sms')),
  recipient VARCHAR NOT NULL,
  subject VARCHAR,
  body TEXT,
  sent_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  delivery_status VARCHAR DEFAULT 'sent'
    CHECK (delivery_status IN ('sent', 'bounced', 'opened', 'clicked', 'failed'))
);

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_fd_activity_inquiry
  ON front_desk.activity_log (inquiry_id);

CREATE INDEX IF NOT EXISTS idx_fd_activity_desk
  ON front_desk.activity_log (desk);

CREATE INDEX IF NOT EXISTS idx_fd_activity_timestamp
  ON front_desk.activity_log (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_fd_comm_inquiry
  ON front_desk.communication_log (inquiry_id);

CREATE INDEX IF NOT EXISTS idx_fd_comm_channel
  ON front_desk.communication_log (channel);

CREATE INDEX IF NOT EXISTS idx_fd_comm_sent
  ON front_desk.communication_log (sent_at DESC);

-- ═══════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════

COMMENT ON TABLE front_desk.activity_log IS 'Append-only activity trail for all desk interactions with inquiries';
COMMENT ON TABLE front_desk.communication_log IS 'Append-only log of all email/SMS communications sent to inquiry contacts';
COMMENT ON COLUMN front_desk.activity_log.data IS 'JSONB payload with action-specific data: {duration, outcome, notes, channel, template}';
COMMENT ON COLUMN front_desk.communication_log.delivery_status IS 'Tracking status: sent, bounced, opened, clicked, failed';

COMMIT;
