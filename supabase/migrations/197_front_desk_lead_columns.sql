-- Migration 197: Add source, tags, time_zone, assigned_to to front_desk.leads
-- These columns are required by the Front Desk stitch design

-- Source column: "Web Inquiry", "Contact Form", "Enrollment Call", "Live Call", "Chat Bot", "Marketing"
ALTER TABLE front_desk.leads ADD COLUMN IF NOT EXISTS source text;

-- Tags column: array of tags like "Registration Lead", "General Enquiry", "Tour Requested"
ALTER TABLE front_desk.leads ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Time zone column: "ZONE 1 (USA + CANADA)", "ZONE 2 (USA + BRAZIL)", "ZONE 3 (UK + SA + EU)", "ZONE 4 (INDIA + ASIA)"
ALTER TABLE front_desk.leads ADD COLUMN IF NOT EXISTS time_zone text;

-- Assigned to column: references auth.users(id)
ALTER TABLE front_desk.leads ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id);

-- Create index for assigned_to lookups
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON front_desk.leads(assigned_to);

-- Create index for source filtering
CREATE INDEX IF NOT EXISTS idx_leads_source ON front_desk.leads(source);

-- Create index for tags searching
CREATE INDEX IF NOT EXISTS idx_leads_tags ON front_desk.leads USING gin(tags);
