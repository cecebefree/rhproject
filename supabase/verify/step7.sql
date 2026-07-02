SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  c.relname AS table_name,
  a.attname AS column_name,
  CASE con.contype
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'f' THEN 'FK'
    WHEN 'p' THEN 'PRIMARY KEY'
    ELSE con.contype::text
  END AS type_label
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(con.conkey)
WHERE c.relname IN ('tenant_devotional', 'tenant_lms', 'tenant_mobile')
  AND con.contype IN ('u', 'f')
ORDER BY c.relname, con.contype, con.conname;
