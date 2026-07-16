-- Combined pgTAP test runner
-- Total: 33 tests (6+3+2+2+15+5)
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
SELECT plan(33);
-- === 00_rls_enabled.sql ===

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


-- === 01_profiles_self_read.sql ===

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


-- === 02_student_devotional_blocked.sql ===

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


-- === 03_admin_devotional_visible.sql ===

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


-- === 04_admin_all_bypass.sql ===
-- 5 tables x 3 checks each

CREATE OR REPLACE FUNCTION check_admin_all_policy(tname text)
RETURNS SETOF TEXT AS $$
BEGIN
    RETURN QUERY SELECT ok(
        EXISTS (SELECT 1 FROM pg_policies
                WHERE schemaname = 'public'
                  AND tablename = tname
                  AND policyname = 'admin_all_' || tname),
        tname || ' has admin_all policy'
    );

    RETURN QUERY SELECT ok(
        (SELECT qual::text LIKE '%auth.jwt()%app_metadata%role%admin%'
         FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = tname
           AND policyname = 'admin_all_' || tname),
        tname || ' admin_all uses JWT role check'
    );

    RETURN QUERY SELECT ok(
        (SELECT relrowsecurity
         FROM pg_class
         WHERE relname = tname),
        tname || ' has RLS enabled'
    );
END;
$$ LANGUAGE plpgsql;

SELECT * FROM check_admin_all_policy('tenant_devotional');
SELECT * FROM check_admin_all_policy('tenant_lms');
SELECT * FROM check_admin_all_policy('tenant_mobile');
SELECT * FROM check_admin_all_policy('devotional_config');
SELECT * FROM check_admin_all_policy('devotional_item');


-- === 05_jwt_hook_injection.sql ===

-- 1. Function exists
SELECT ok(
    EXISTS (SELECT 1 FROM pg_proc
            WHERE proname = 'custom_access_token_hook'
              AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')),
    'custom_access_token_hook function exists'
);

-- 2. Function is SECURITY DEFINER
SELECT ok(
    prosecdef,
    'custom_access_token_hook is SECURITY DEFINER'
)
FROM pg_proc
WHERE proname = 'custom_access_token_hook'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 3. GRANT EXECUTE to supabase_auth_admin exists
SELECT ok(
    EXISTS (
        SELECT 1 FROM information_schema.routine_privileges
        WHERE routine_schema = 'public'
          AND routine_name = 'custom_access_token_hook'
          AND grantee = 'supabase_auth_admin'
          AND privilege_type = 'EXECUTE'
    ),
    'EXECUTE granted to supabase_auth_admin'
);

-- 4-5: Create test user via auth.users (triggers handle_new_user -> creates profile)
-- Then update the profile to set tenant_id, and verify hook injection.
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000099'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'test-hook@redhouse.com',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;

-- Update profile created by handle_new_user trigger with our test values
-- Fixture bypass: trigger trg_profiles_tenant_id_immutable (migration 057)
-- blocks direct tenant_id writes; bypass is transaction-local and test runs in BEGIN/ROLLBACK
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
UPDATE public.profiles
SET name = 'Hook Test User', role = 'student',
    tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE id = '00000000-0000-0000-0000-000000000099'::uuid;

SELECT set_config('app.tenant_assignment_bypass', 'false', true);

SELECT is(
    custom_access_token_hook('{"claims":{"sub":"00000000-0000-0000-0000-000000000099"}}'::jsonb)
        -> 'claims' -> 'app_metadata' ->> 'role',
    'student',
    'Hook injects role = student into app_metadata for existing user'
);

-- 5. Hook also injects tenant_id
SELECT is(
    custom_access_token_hook('{"claims":{"sub":"00000000-0000-0000-0000-000000000099"}}'::jsonb)
        -> 'claims' -> 'app_metadata' ->> 'tenant_id',
    '00000000-0000-0000-0000-000000000001',
    'Hook injects tenant_id into app_metadata for existing user'
);



SELECT * FROM finish();

-- teardown: do not leave the test-only helper in the public schema
-- (it is unmigrated local state that pollutes the type snapshot)
DROP FUNCTION IF EXISTS public.check_admin_all_policy(text);

ROLLBACK;