SELECT column_name, data_type FROM information_schema.columns 
WHERE table_schema = 'school_desk' AND table_name = 'courses' 
ORDER BY ordinal_position;
