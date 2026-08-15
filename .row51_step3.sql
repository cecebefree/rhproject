-- Verify all RLS policies include tenant_id comparison in qual
SELECT 
  tablename,
  policyname,
  cmd,
  (qual LIKE '%tenant_id%') AS has_tenant_in_using,
  (with_check LIKE '%tenant_id%') AS has_tenant_in_check
FROM pg_policies 
WHERE schemaname = 'front_desk'
ORDER BY tablename, policyname;
