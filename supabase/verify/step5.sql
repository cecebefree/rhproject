SELECT c.relname AS table_name, a.attname AS column_name, a.attnotnull AS not_null
FROM pg_class c
JOIN pg_attribute a ON a.attrelid = c.oid
WHERE c.relname IN ('tenant_devotional', 'tenant_lms', 'tenant_mobile')
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY c.relname, a.attnum;
