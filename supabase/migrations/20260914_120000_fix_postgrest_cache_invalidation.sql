BEGIN;
NOTIFY pgrst, 'reload schema';
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE schemaname = 'public';
  IF policy_count = 0 THEN
    RAISE WARNING 'No RLS policies found in public schema after cache invalidation.';
  ELSE
    RAISE NOTICE 'PostgREST cache invalidation: % RLS policies active', policy_count;
  END IF;
END $$;
COMMIT;
