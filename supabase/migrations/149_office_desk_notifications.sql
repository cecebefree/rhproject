-- Migration 149: office_desk.notifications table (Row 86)
-- Tracks email notifications sent by office-desk-notify Edge Function
-- Called by trigger on_registration_created when a new registration is inserted

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- NOTIFICATIONS — email notification log for office desk
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_desk.notifications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id   uuid NOT NULL REFERENCES office_desk.registrations(id) ON DELETE CASCADE,
  notification_type varchar(50) NOT NULL DEFAULT 'new_registration',
  sent_at           timestamptz DEFAULT now(),
  email_to          varchar(255) NOT NULL,
  status            varchar(50) NOT NULL DEFAULT 'sent',
  error_message     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_registration
  ON office_desk.notifications (registration_id);

CREATE INDEX IF NOT EXISTS idx_notifications_status
  ON office_desk.notifications (status);

CREATE INDEX IF NOT EXISTS idx_notifications_sent_at
  ON office_desk.notifications (sent_at);

-- ═══════════════════════════════════════════════════════════
-- RLS: NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════

ALTER TABLE office_desk.notifications ENABLE ROW LEVEL SECURITY;

-- Deny anon — notification log is internal only
DROP POLICY IF EXISTS nd_deny_anon ON office_desk.notifications;
CREATE POLICY nd_deny_anon ON office_desk.notifications
  FOR ALL TO anon
  USING (false);

-- Deny authenticated — only service_role + office can read
DROP POLICY IF EXISTS nd_deny_authenticated ON office_desk.notifications;
CREATE POLICY nd_deny_authenticated ON office_desk.notifications
  FOR ALL TO authenticated
  USING (false);

-- Office/admin read-only
DROP POLICY IF EXISTS nd_office_select ON office_desk.notifications;
CREATE POLICY nd_office_select ON office_desk.notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
    )
  );

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════

GRANT SELECT, INSERT ON office_desk.notifications TO service_role;
GRANT SELECT ON office_desk.notifications TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- TRIGGER: auto-update updated_at on row change
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION office_desk.set_notifications_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notifications_updated_at ON office_desk.notifications;
CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON office_desk.notifications
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.set_notifications_updated_at();

-- ═══════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════

COMMENT ON TABLE office_desk.notifications IS 'Row 86: Email notification log for office desk — tracks notifications sent by office-desk-notify Edge Function';
COMMENT ON COLUMN office_desk.notifications.registration_id IS 'FK to office_desk.registrations — the registration that triggered this notification';
COMMENT ON COLUMN office_desk.notifications.notification_type IS 'Type: new_registration, payment_received, dispute';
COMMENT ON COLUMN office_desk.notifications.email_to IS 'Recipient email address';
COMMENT ON COLUMN office_desk.notifications.status IS 'Delivery status: sent, failed';
COMMENT ON COLUMN office_desk.notifications.error_message IS 'Error details if status=failed';

-- ═══════════════════════════════════════════════════════════
-- REGISTER office-desk-notify in config (documentation only)
-- ═══════════════════════════════════════════════════════════
-- Note: Function entry is managed in supabase/config.toml
-- This migration only creates the notifications table + RLS

COMMIT;
