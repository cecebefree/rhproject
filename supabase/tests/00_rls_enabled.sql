SELECT plan(6);

SELECT ok(relrowsecurity, 'profiles has RLS enabled')
FROM pg_class WHERE relname = 'profiles';

SELECT ok(relrowsecurity, 'devotional_config has RLS enabled')
FROM pg_class WHERE relname = 'devotional_config';

SELECT ok(relrowsecurity, 'devotional_item has RLS enabled')
FROM pg_class WHERE relname = 'devotional_item';

SELECT ok(relrowsecurity, 'tenant_devotional has RLS enabled')
FROM pg_class WHERE relname = 'tenant_devotional';

SELECT ok(relrowsecurity, 'tenant_lms has RLS enabled')
FROM pg_class WHERE relname = 'tenant_lms';

SELECT ok(relrowsecurity, 'tenant_mobile has RLS enabled')
FROM pg_class WHERE relname = 'tenant_mobile';

SELECT * FROM finish();
