SELECT column_name, is_nullable FROM information_schema.columns 
WHERE table_schema = 'school_desk' AND table_name = 'courses' AND column_name = 'teacher_id';
