-- Test rate limit: make 12 rapid calls and check if 11th is blocked
-- First, clear any existing rate limit entries for our test caller
DELETE FROM public.ef_call_log WHERE caller = 'e2e-rate-test';

-- Make 12 calls to check_rate_limit and collect results
SELECT check_rate_limit('e2e-rate-test', 'e97e5c3a-1234-4321-abcd-000000000001') AS call_result
FROM generate_series(1, 12);
