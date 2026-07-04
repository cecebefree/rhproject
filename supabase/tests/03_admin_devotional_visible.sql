SELECT plan(2);

-- 1. admin_all_devotional_config policy exists
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'devotional_config'
              AND policyname = 'admin_all_devotional_config'),
    'admin_all_devotional_config policy exists'
);

-- 2. Policy uses JWT app_metadata role = admin check
SELECT ok(
    qual::text LIKE '%auth.jwt()%app_metadata%role%admin%',
    'admin_all_devotional_config checks JWT app_metadata role = admin'
)
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'devotional_config'
  AND policyname = 'admin_all_devotional_config';

SELECT * FROM finish();
