SELECT 'tenant_devotional' AS tbl, COUNT(*) AS cnt FROM public.tenant_devotional
UNION ALL
SELECT 'tenant_lms', COUNT(*) FROM public.tenant_lms
UNION ALL
SELECT 'tenant_mobile', COUNT(*) FROM public.tenant_mobile;
