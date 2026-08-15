-- Check timestamp distribution of logged calls
SELECT created_at, COUNT(*) as cnt
FROM public.ef_call_log 
WHERE caller = 'e2e-rate-exhaust'
GROUP BY created_at
ORDER BY created_at;
