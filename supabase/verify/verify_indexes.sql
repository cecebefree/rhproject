SELECT indexname, tablename FROM pg_indexes WHERE tablename LIKE 'tenant%' ORDER BY tablename, indexname;
