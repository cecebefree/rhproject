-- Migration 132: Create office_desk.contacts table
-- Missing CREATE TABLE referenced by migrations 133, 134, 140
-- Columns derived from: ContactDetail.tsx interface, bulkOperationsService.ts,
--   migration 133 (version tracking), migration 140 (undo function)

BEGIN;

CREATE TABLE IF NOT EXISTS office_desk.contacts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenant_lms(id) ON DELETE CASCADE,
  desk_id           uuid,
  name              text,
  email             text,
  phone             text,
  company           text,
  title             text,
  status            text DEFAULT 'active',
  assigned_to       uuid REFERENCES auth.users(id),
  tags              text[],
  category          text,
  priority          text,
  notes             text,
  archived_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON office_desk.contacts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_desk ON office_desk.contacts (desk_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON office_desk.contacts (email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON office_desk.contacts (status);
CREATE INDEX IF NOT EXISTS idx_contacts_archived ON office_desk.contacts (archived_at) WHERE archived_at IS NULL;

COMMIT;
