SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname IN ('front_desk', 'school_desk', 'office_desk') 
ORDER BY schemaname, tablename;
