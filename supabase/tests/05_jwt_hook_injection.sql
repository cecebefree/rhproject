BEGIN;
SELECT plan(5);

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
-- R20 test fixture bypass: authorized tenant_id write for pgTAP setup
-- Trigger 057 honors this transaction-local GUC; ROLLBACK discards it
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
ROLLBACK;
