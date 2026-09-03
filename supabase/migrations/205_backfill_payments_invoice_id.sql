-- Insert sentinel invoice if it doesn't exist
INSERT INTO office_desk.invoices (id, tenant_id, registration_id, invoice_number, amount, status)
VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'e97e5c3a-1234-4321-abcd-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'SENTINEL-0000', 0.00, 'draft')
ON CONFLICT (id) DO NOTHING;

-- Backfill payments.invoice_id with a sentinel UUID
UPDATE office_desk.payments
SET invoice_id = '00000000-0000-0000-0000-000000000000'::uuid
WHERE invoice_id IS NULL;
