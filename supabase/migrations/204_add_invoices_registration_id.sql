-- Add registration_id column to invoices
ALTER TABLE office_desk.invoices
  ADD COLUMN registration_id uuid REFERENCES office_desk.registrations(id);

-- Insert sentinel registration if it doesn't exist
INSERT INTO office_desk.registrations (id, tenant_id, student_name, student_email, status)
VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'e97e5c3a-1234-4321-abcd-000000000001'::uuid, 'Sentinel', 'sentinel@example.com', 'active')
ON CONFLICT (id) DO NOTHING;

-- Add index
CREATE INDEX idx_invoices_registration ON office_desk.invoices USING btree (registration_id);
