SELECT 'tenant_devotional' AS tbl, id, name, slug FROM public.tenant_devotional
UNION ALL
SELECT 'tenant_lms', id, name, slug FROM public.tenant_lms
UNION ALL
SELECT 'tenant_mobile', id, name, slug FROM public.tenant_mobile;
