-- Migration 127: Add company column to front_desk.leads
-- Row 65: Front Desk Lovable screens — company field for lead management

ALTER TABLE front_desk.leads ADD COLUMN company text;

COMMENT ON COLUMN front_desk.leads.company IS 'Company or organisation name for the lead';
