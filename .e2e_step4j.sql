SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'school_desk.courses'::regclass AND contype = 'c';
