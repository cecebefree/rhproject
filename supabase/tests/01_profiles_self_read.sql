SELECT plan(3);

-- 1. Policy exists
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'profiles'
              AND policyname = 'Users can view own profile'),
    'profiles "Users can view own profile" policy exists'
);

-- 2. Policy uses direct auth.uid() = id (no recursion from the old 013 admin policy)
SELECT ok(
    qual::text LIKE '%auth.uid()%id%',
    'self-read policy qual references auth.uid() and id'
)
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND policyname = 'Users can view own profile';

-- 3. Policy qual does NOT contain a subquery (no recursion)
SELECT ok(
    qual::text NOT LIKE '%SELECT%FROM%profiles%',
    'self-read policy has no subquery into profiles (no recursion)'
)
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND policyname = 'Users can view own profile';

SELECT * FROM finish();
