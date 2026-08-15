SELECT caller, tenant_id, called_at 
FROM public.ef_call_log 
WHERE caller = 'e2e-rate-test' 
ORDER BY called_at;
