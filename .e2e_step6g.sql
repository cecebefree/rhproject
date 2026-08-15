-- Simulate 100 calls in the last minute to exhaust the rate limit
INSERT INTO public.ef_call_log (tenant_id, caller, receiver, action, method, path, status_code, caller_ip)
SELECT 
  'e97e5c3a-1234-4321-abcd-000000000001',
  'e2e-rate-exhaust',
  'submit-lead',
  'create',
  'POST',
  '/functions/v1/submit-lead',
  201,
  '127.0.0.1'
FROM generate_series(1, 100);
