SELECT check_rate_limit('e2e-rate-test', 'e97e5c3a-1234-4321-abcd-000000000001') AS call_result
FROM generate_series(1, 12);
