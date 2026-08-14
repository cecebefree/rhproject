-- Row 62 fix: Align CHECK constraint with RLS policies
-- Replace 'converted' with 'handed_off' (no prod data, clean state)

BEGIN;

ALTER TABLE front_desk.leads
DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE front_desk.leads
ADD CONSTRAINT leads_status_check
CHECK (status IN ('enquiry', 'qualified', 'invoiced', 'handed_off'));

COMMIT;
