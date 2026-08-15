-- Verify soft-delete columns exist on leads
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_schema = 'front_desk' AND table_name = 'leads' 
AND column_name IN ('archived_at', 'archive_reason');
