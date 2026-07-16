-- 06_jwt_hook_fail_loud.sql
-- pgTAP tests for custom_access_token_hook fail-loud behavior (migration 056)
-- Test paths:
--   1. missing-profile: hook must RAISE (fail loud), no token minted
--   2. null-tenant: hook must log WARNING and still mint claims

BEGIN;
SELECT plan(9);

-- Ensure pgTAP functions are available
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;

-- ============================================================
-- Test 1: missing-profile -> hook MUST RAISE (fail loud)
-- User exists in auth.users but NO profile row exists
-- ============================================================
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES (
    '11111111-1111-1111-1111-111111111111'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'missing-profile@test.com',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;

-- Delete the profile that was auto-created by handle_new_user trigger
DELETE FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111'::uuid;

-- Verify profile does NOT exist
SELECT ok(
    NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111'::uuid),
    'Test user has no profile row'
);

-- Hook must RAISE EXCEPTION when profile not found
SELECT throws_ok(
    'SELECT custom_access_token_hook(''{"claims":{"sub":"11111111-1111-1111-1111-111111111111"}}''::jsonb)',
    'custom_access_token_hook: no profile row for user 11111111-1111-1111-1111-111111111111',
    'missing-profile: hook RAISES exception when profile row does not exist'
);

-- ============================================================
-- Test 2-5: null-tenant -> hook logs WARNING and still mints claims
-- Create user with profile that has NULL tenant_id
-- ============================================================
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES (
    '22222222-2222-2222-2222-222222222222'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'null-tenant@test.com',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;

-- Set the auto-created profile's tenant_id to NULL using the 057 bypass.
-- We UPDATE rather than DELETE+INSERT to avoid FK delete chains
-- (booklist_child_id_fkey, announcement_created_by_fkey, etc. have no ON DELETE CASCADE).
-- The bypass GUC is transaction-local; this file's pgTAP transaction discards it.
SELECT set_config('app.tenant_assignment_bypass', 'true', true);
UPDATE public.profiles
SET tenant_id = NULL
WHERE id = '22222222-2222-2222-2222-222222222222'::uuid;
SELECT set_config('app.tenant_assignment_bypass', 'false', true);

-- Update non-tenant columns + ensure role/name without touching tenant_id
UPDATE public.profiles
SET name = 'Null Tenant User', role = 'student'
WHERE id = '22222222-2222-2222-2222-222222222222'::uuid;

-- Verify profile has NULL tenant_id
SELECT ok(
    (SELECT tenant_id FROM public.profiles WHERE id = '22222222-2222-2222-2222-222222222222'::uuid) IS NULL,
    'Test user profile has NULL tenant_id'
);

-- Hook should return claims with null tenant_id (NULL from jsonb ->>) and role
-- jsonb ->> on null returns NULL, not empty string
SELECT is(
    custom_access_token_hook('{"claims":{"sub":"22222222-2222-2222-2222-222222222222"}}'::jsonb)
        -> 'claims' -> 'app_metadata' ->> 'tenant_id',
    NULL::text,
    'null-tenant: hook returns NULL for null tenant_id (jsonb ->> on null)'
);

SELECT is(
    custom_access_token_hook('{"claims":{"sub":"22222222-2222-2222-2222-222222222222"}}'::jsonb)
        -> 'claims' -> 'app_metadata' ->> 'role',
    'student',
    'null-tenant: hook still injects role correctly despite null tenant_id'
);

SELECT is(
    custom_access_token_hook('{"claims":{"sub":"22222222-2222-2222-2222-222222222222"}}'::jsonb)
        -> 'claims' -> 'app_metadata' ? 'role',
    true,
    'null-tenant: app_metadata has role key even when tenant_id is null'
);

SELECT is(
    custom_access_token_hook('{"claims":{"sub":"22222222-2222-2222-2222-222222222222"}}'::jsonb)
        -> 'claims' -> 'app_metadata' ? 'tenant_id',
    true,
    'null-tenant: app_metadata has tenant_id key even when value is null'
);

-- ============================================================
-- Test 6-9: Regression test - normal user with valid profile still works
-- ============================================================
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
VALUES (
    '33333333-3333-3333-3333-333333333333'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'normal@test.com',
    crypt('password', gen_salt('bf')),
    now(),
    now(),
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;

-- Update the auto-created profile with correct values
-- Fixture bypass: trigger trg_profiles_tenant_id_immutable (migration 057)
-- blocks direct tenant_id writes; bypass is transaction-local and test runs in BEGIN/ROLLBACK
SELECT set_config('app.tenant_assignment_bypass', 'true', true);

UPDATE public.profiles
SET role = 'teacher', tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE id = '33333333-3333-3333-3333-333333333333'::uuid;

SELECT set_config('app.tenant_assignment_bypass', 'false', true);

SELECT is(
    custom_access_token_hook('{"claims":{"sub":"33333333-3333-3333-3333-333333333333"}}'::jsonb)
        -> 'claims' -> 'app_metadata' ->> 'role',
    'teacher',
    'regression: normal user with valid profile still works (role)'
);

SELECT is(
    custom_access_token_hook('{"claims":{"sub":"33333333-3333-3333-3333-333333333333"}}'::jsonb)
        -> 'claims' -> 'app_metadata' ->> 'tenant_id',
    '00000000-0000-0000-0000-000000000001',
    'regression: normal user tenant_id injection still works'
);

SELECT * FROM finish();
ROLLBACK;
