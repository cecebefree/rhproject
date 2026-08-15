SELECT schemaname, tablename, COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname IN ('front_desk', 'school_desk', 'office_desk')
GROUP BY schemaname, tablename
ORDER BY schemaname, tablename;
