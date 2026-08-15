INSERT INTO public.profiles (id, name, role, tenant_id)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'Test Teacher',
  'teacher',
  'e97e5c3a-1234-4321-abcd-000000000001'
)
ON CONFLICT (id) DO NOTHING;
