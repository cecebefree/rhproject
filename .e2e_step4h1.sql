INSERT INTO school_desk.courses (id, tenant_id, title, description, price, status, teacher_id, type)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'e97e5c3a-1234-4321-abcd-000000000001',
  'E2E Test Course',
  'Test course for Row 50 E2E validation',
  0.00,
  'published',
  '00000000-0000-0000-0000-000000000000',
  'core'
)
ON CONFLICT (id) DO NOTHING;
