-- Migration 107: Add callback scheduling fields to front_desk.leads
-- Row 64: Callback scheduling fields (unblocks Row 65 Front Desk screens)

-- Create enum type for callback_status
CREATE TYPE front_desk.callback_status_type AS ENUM ('pending', 'completed', 'cancelled');

-- Add callback fields to leads table
ALTER TABLE front_desk.leads
  ADD COLUMN callback_scheduled_at timestamptz,
  ADD COLUMN callback_status front_desk.callback_status_type,
  ADD COLUMN callback_notes text;

-- Add index for callback scheduling queries (find leads due for callback)
CREATE INDEX idx_leads_callback_scheduled
  ON front_desk.leads (callback_scheduled_at)
  WHERE callback_scheduled_at IS NOT NULL AND callback_status = 'pending';

COMMENT ON COLUMN front_desk.leads.callback_scheduled_at IS 'Scheduled date/time for follow-up callback';
COMMENT ON COLUMN front_desk.leads.callback_status IS 'Current status of the callback: pending, completed, or cancelled';
COMMENT ON COLUMN front_desk.leads.callback_notes IS 'Notes for the callback task';
