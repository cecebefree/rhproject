-- Migration 133: Add version tracking for real-time conflict detection
-- Adds version_id and updated_at columns to leads, invoices, contacts

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- FRONT DESK: LEADS
-- ═══════════════════════════════════════════════════════════

-- Add version_id for conflict detection
ALTER TABLE front_desk.leads
  ADD COLUMN IF NOT EXISTS version_id UUID DEFAULT gen_random_uuid();

-- Add updated_at for tracking last modification
ALTER TABLE front_desk.leads
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add updated_by to track who made the change
ALTER TABLE front_desk.leads
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Create index for version lookups
CREATE INDEX IF NOT EXISTS idx_leads_version_id ON front_desk.leads(version_id);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION front_desk.update_leads_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version_id = gen_random_uuid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_updated_at ON front_desk.leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON front_desk.leads
  FOR EACH ROW
  EXECUTE FUNCTION front_desk.update_leads_timestamp();

-- ═══════════════════════════════════════════════════════════
-- OFFICE DESK: INVOICES
-- ═══════════════════════════════════════════════════════════

-- Add version_id for conflict detection
ALTER TABLE office_desk.invoices
  ADD COLUMN IF NOT EXISTS version_id UUID DEFAULT gen_random_uuid();

-- Add updated_at for tracking last modification
ALTER TABLE office_desk.invoices
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add updated_by to track who made the change
ALTER TABLE office_desk.invoices
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Create index for version lookups
CREATE INDEX IF NOT EXISTS idx_invoices_version_id ON office_desk.invoices(version_id);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION office_desk.update_invoices_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version_id = gen_random_uuid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON office_desk.invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON office_desk.invoices
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.update_invoices_timestamp();

-- ═══════════════════════════════════════════════════════════
-- OFFICE DESK: CONTACTS
-- ═══════════════════════════════════════════════════════════

-- Add version_id for conflict detection
ALTER TABLE office_desk.contacts
  ADD COLUMN IF NOT EXISTS version_id UUID DEFAULT gen_random_uuid();

-- Add updated_at for tracking last modification
ALTER TABLE office_desk.contacts
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add updated_by to track who made the change
ALTER TABLE office_desk.contacts
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Create index for version lookups
CREATE INDEX IF NOT EXISTS idx_contacts_version_id ON office_desk.contacts(version_id);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION office_desk.update_contacts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version_id = gen_random_uuid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contacts_updated_at ON office_desk.contacts;
CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON office_desk.contacts
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.update_contacts_timestamp();

-- ═══════════════════════════════════════════════════════════
-- BACKFILL EXISTING DATA
-- ═══════════════════════════════════════════════════════════

-- Set updated_at = created_at for existing records
UPDATE front_desk.leads SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE office_desk.invoices SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE office_desk.contacts SET updated_at = created_at WHERE updated_at IS NULL;

-- ═══════════════════════════════════════════════════════════
-- ENABLE REALTIME
-- ═══════════════════════════════════════════════════════════

-- Ensure tables are in the realtime publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE front_desk.leads;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE office_desk.invoices;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE office_desk.contacts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
