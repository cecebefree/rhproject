-- Debug: Check what the rate limit function sees
SELECT 
  (SELECT COUNT(*) FROM public.ef_call_log 
   WHERE caller = 'e2e-rate-exhaust' 
   AND tenant_id = 'e97e5c3a-1234-4321-abcd-000000000001'
   AND created_at > now() - interval '60 seconds') AS count_60s,
  (SELECT COUNT(*) FROM public.ef_call_log 
   WHERE caller = 'e2e-rate-exhaust' 
   AND tenant_id = 'e97e5c3a-1234-4321-abcd-000000000001'
   AND created_at > now() - interval '10 seconds') AS count_10s,
  check_rate_limit('e2e-rate-exhaust', 'e97e5c3a-1234-4321-abcd-000000000001') AS rate_check;
