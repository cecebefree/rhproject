-- Migration 165: Front Desk action RPCs + support tables
-- take_inquiry, schedule_callback, send_inquiry_email, escalate_inquiry

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- SUPPORT TABLES (front_desk schema)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS front_desk.callbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES front_desk.inquiries(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fd_callbacks_inquiry ON front_desk.callbacks(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_fd_callbacks_status ON front_desk.callbacks(status);

-- Remote may already have a front_desk.email_logs with different schema (lead_id-based).
-- Drop and recreate with inquiry_id-based schema (table is empty on remote).
DROP TABLE IF EXISTS front_desk.email_logs CASCADE;

CREATE TABLE front_desk.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES front_desk.inquiries(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fd_email_logs_inquiry ON front_desk.email_logs(inquiry_id);

CREATE TABLE IF NOT EXISTS front_desk.escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES front_desk.inquiries(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  target_level TEXT NOT NULL CHECK (target_level IN ('senior_counselor', 'manager', 'director')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fd_escalations_inquiry ON front_desk.escalations(inquiry_id);

-- ═══════════════════════════════════════════════════════════
-- RLS ON SUPPORT TABLES
-- ═══════════════════════════════════════════════════════════

ALTER TABLE front_desk.callbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE front_desk.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE front_desk.escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "callbacks authenticated all" ON front_desk.callbacks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "email_logs authenticated all" ON front_desk.email_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "escalations authenticated all" ON front_desk.escalations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON front_desk.callbacks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON front_desk.email_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON front_desk.escalations TO authenticated;

GRANT SELECT, INSERT, UPDATE ON front_desk.callbacks TO service_role;
GRANT SELECT, INSERT, UPDATE ON front_desk.email_logs TO service_role;
GRANT SELECT, INSERT, UPDATE ON front_desk.escalations TO service_role;

-- ═══════════════════════════════════════════════════════════
-- RPC: take_inquiry (public schema for JS client compatibility)
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.take_inquiry(
  p_inquiry_id UUID,
  p_counselor_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_inquiry front_desk.inquiries%ROWTYPE;
BEGIN
  SELECT * INTO v_inquiry
  FROM front_desk.inquiries
  WHERE id = p_inquiry_id;

  IF v_inquiry.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Inquiry not found');
  END IF;

  IF v_inquiry.assigned_counselor_id IS NOT NULL
     AND v_inquiry.assigned_counselor_id != p_counselor_id THEN
    RETURN json_build_object('success', false, 'error', 'Inquiry already assigned to another counselor');
  END IF;

  UPDATE front_desk.inquiries
  SET
    assigned_counselor_id = p_counselor_id,
    assigned_at = now(),
    updated_at = now()
  WHERE id = p_inquiry_id;

  RETURN json_build_object(
    'success', true,
    'inquiry_id', p_inquiry_id,
    'assigned_to', p_counselor_id,
    'message', 'Inquiry assigned successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.take_inquiry(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.take_inquiry(UUID, UUID) TO service_role;

-- ═══════════════════════════════════════════════════════════
-- RPC: schedule_callback
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.schedule_callback(
  p_inquiry_id UUID,
  p_scheduled_at TIMESTAMPTZ,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_callback_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM front_desk.inquiries WHERE id = p_inquiry_id) THEN
    RETURN json_build_object('success', false, 'error', 'Inquiry not found');
  END IF;

  IF p_scheduled_at <= now() THEN
    RETURN json_build_object('success', false, 'error', 'Scheduled time must be in the future');
  END IF;

  INSERT INTO front_desk.callbacks (inquiry_id, scheduled_at, notes, status)
  VALUES (p_inquiry_id, p_scheduled_at, p_notes, 'pending')
  RETURNING id INTO v_callback_id;

  UPDATE front_desk.inquiries
  SET call_scheduled_at = p_scheduled_at, updated_at = now()
  WHERE id = p_inquiry_id;

  RETURN json_build_object(
    'success', true,
    'callback_id', v_callback_id,
    'inquiry_id', p_inquiry_id,
    'scheduled_at', p_scheduled_at,
    'message', 'Callback scheduled successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.schedule_callback(UUID, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_callback(UUID, TIMESTAMPTZ, TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════
-- RPC: send_inquiry_email
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.send_inquiry_email(
  p_inquiry_id UUID,
  p_subject TEXT,
  p_body TEXT,
  p_recipient_email TEXT
)
RETURNS JSON AS $$
DECLARE
  v_email_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM front_desk.inquiries WHERE id = p_inquiry_id) THEN
    RETURN json_build_object('success', false, 'error', 'Inquiry not found');
  END IF;

  INSERT INTO front_desk.email_logs (inquiry_id, recipient, subject, body, status, sent_at)
  VALUES (p_inquiry_id, p_recipient_email, p_subject, p_body, 'sent', now())
  RETURNING id INTO v_email_id;

  RETURN json_build_object(
    'success', true,
    'email_id', v_email_id,
    'inquiry_id', p_inquiry_id,
    'recipient', p_recipient_email,
    'message', 'Email logged successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.send_inquiry_email(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_inquiry_email(UUID, TEXT, TEXT, TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════
-- RPC: escalate_inquiry
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.escalate_inquiry(
  p_inquiry_id UUID,
  p_escalation_reason TEXT,
  p_escalation_target TEXT DEFAULT 'manager'
)
RETURNS JSON AS $$
DECLARE
  v_esc_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM front_desk.inquiries WHERE id = p_inquiry_id) THEN
    RETURN json_build_object('success', false, 'error', 'Inquiry not found');
  END IF;

  IF p_escalation_target NOT IN ('senior_counselor', 'manager', 'director') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid escalation target');
  END IF;

  INSERT INTO front_desk.escalations (inquiry_id, reason, target_level, status)
  VALUES (p_inquiry_id, p_escalation_reason, p_escalation_target, 'pending')
  RETURNING id INTO v_esc_id;

  UPDATE front_desk.inquiries
  SET enrollment_status = 'escalated', updated_at = now()
  WHERE id = p_inquiry_id;

  RETURN json_build_object(
    'success', true,
    'escalation_id', v_esc_id,
    'inquiry_id', p_inquiry_id,
    'target_level', p_escalation_target,
    'reason', p_escalation_reason,
    'message', 'Inquiry escalated successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.escalate_inquiry(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_inquiry(UUID, TEXT, TEXT) TO service_role;

COMMIT;
