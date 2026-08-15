-- STEP 4c: Test check_rate_limit() RPC
SELECT * FROM check_rate_limit('e2e-test-caller', 'e97e5c3a-1234-4321-abcd-000000000001');
