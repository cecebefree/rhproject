INSERT INTO front_desk.leads (tenant_id, name, email, phone, notes) 
VALUES ('e97e5c3a-1234-4321-abcd-000000000001', 'E2E Test Lead', 'e2e-test@example.com', '+1234567890', 'Row 50 E2E test lead')
RETURNING id, tenant_id, name, email, created_at;
