SELECT 
  tc.constraint_name,
  tc.table_schema,
  tc.table_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_schema = 'front_desk'
  AND ccu.table_name = 'leads';
