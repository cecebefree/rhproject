-- This should return FALSE (rate limit exhausted: 100 calls in last minute)
SELECT check_rate_limit('e2e-rate-exhaust', 'e97e5c3a-1234-4321-abcd-000000000001') AS should_be_false;
