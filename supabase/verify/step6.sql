SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('tenant_devotional', 'tenant_lms', 'tenant_mobile')
ORDER BY relname;
