SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'front_desk' 
ORDER BY table_name, ordinal_position;
