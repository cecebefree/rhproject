-- Check FK cascade behavior
SELECT 
  tc.constraint_name,
  tc.table_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
  ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'front_desk';
