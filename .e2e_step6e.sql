SELECT caller, tenant_id, created_at 
FROM public.ef_call_log 
WHERE caller = 'e2e-rate-test' 
ORDER BY created_at;
