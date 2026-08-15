-- Check if any other tables reference front_desk.leads
SELECT 
  tc.constraint_name,
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_schema,
  ccu.table_name AS foreign_table
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_schema = 'front_desk'
  AND ccu.table_name = 'leads'
ORDER BY tc.table_schema, tc.table_name;
