SELECT 
  tg.tgname AS trigger_name,
  tg.tgtype AS trigger_type,
  n.nspname AS schema_name,
  c.relname AS table_name,
  pg_get_triggerfunctiondef(tg.oid) AS function_def
FROM pg_trigger tg
JOIN pg_class c ON tg.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'front_desk'
ORDER BY table_name, trigger_name;
