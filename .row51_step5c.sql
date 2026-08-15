SELECT e.enumlabel FROM pg_enum e 
JOIN pg_type t ON e.enumtypid = t.oid 
WHERE t.typname = 'archive_reason_type';
