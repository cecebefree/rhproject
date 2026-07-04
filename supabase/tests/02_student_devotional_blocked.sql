SELECT plan(2);

-- 1. No non-admin SELECT policies exist on devotional_config
--    The only policy is admin_all_devotional_config which is FOR ALL.
--    Students have no explicit SELECT policy, so they are blocked by default.
SELECT is(
    count(*)::integer,
    0,
    'No non-admin SELECT policies on devotional_config — students blocked by default'
)
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'devotional_config'
  AND cmd = 'SELECT'
  AND policyname NOT LIKE 'admin\_all\_%';

-- 2. The only policy on devotional_config is admin_all_devotional_config
SELECT is(
    count(*)::integer,
    1,
    'Exactly 1 policy on devotional_config (admin_all bypass)'
)
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'devotional_config';

SELECT * FROM finish();
