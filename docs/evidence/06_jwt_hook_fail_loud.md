# Evidence: pgTAP Tests for custom_access_token_hook Fail-Loud Behavior

**Date:** 2026-07-16  
**Commit:** (pending)  
**Related:** Migration 056 (hook_fail_loud.sql), Defect: custom_access_token_hook swallows exceptions

## Test File
- `supabase/tests/06_jwt_hook_fail_loud.sql`

## Test Results (9 tests, all PASS)

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Setup: Test user has no profile row | PASS | Verified profile deleted |
| 2 | **missing-profile: hook RAISES exception when profile row does not exist** | **PASS** | `throws_ok` confirms exception with exact message |
| 3 | Setup: Test user profile has NULL tenant_id | PASS | Verified tenant_id IS NULL |
| 4 | **null-tenant: hook returns NULL for null tenant_id (jsonb ->> on null)** | **PASS** | Correct JSON behavior |
| 5 | **null-tenant: hook still injects role correctly despite null tenant_id** | **PASS** | Role 'student' injected |
| 6 | **null-tenant: app_metadata has role key even when tenant_id is null** | **PASS** | Key presence verified |
| 7 | **null-tenant: app_metadata has tenant_id key even when value is null** | **PASS** | Key presence verified |
| 8 | Regression: normal user with valid profile still works (role) | PASS | Role 'teacher' injected |
| 9 | Regression: normal user tenant_id injection still works | PASS | tenant_id '00000000-...' injected |

## Raw Test Output

```
 plan 
------
 1..9
(1 row)

CREATE EXTENSION
SET
NOTICE:  extension "pgtap" already exists, skipping
INSERT 0 0
DELETE 0
                 ok                  
-------------------------------------
 ok 1 - Test user has no profile row
(1 row)

                                   throws_ok                                   
-------------------------------------------------------------------------------
 ok 2 - missing-profile: hook RAISES exception when profile row does not exist
(1 row)

INSERT 0 0
DELETE 1
INSERT 0 1
                     ok                      
---------------------------------------------
 ok 3 - Test user profile has NULL tenant_id
(1 row)

WARNING:  custom_access_token_hook: profile 22222222-2222-2222-2222-222222222222 has null tenant_id (pending assignment)
WARNING:  custom_access_token_hook: profile 22222222-2222-2222-2222-222222222222 has null tenant_id (pending assignment)
WARNING:  custom_access_token_hook: profile 22222222-2222-2222-2222-222222222222 has null tenant_id (pending assignment)
WARNING:  custom_access_token_hook: profile 22222222-2222-2222-2222-222222222222 has null tenant_id (pending assignment)
                                      is                                      
------------------------------------------------------------------------------
 ok 4 - null-tenant: hook returns NULL for null tenant_id (jsonb ->> on null)
(1 row)

                                      is                                      
------------------------------------------------------------------------------
 ok 5 - null-tenant: hook still injects role correctly despite null tenant_id
(1 row)

                                    is                                     
---------------------------------------------------------------------------
 ok 6 - null-tenant: app_metadata has role key even when tenant_id is null
(1 row)

                                     is                                     
----------------------------------------------------------------------------
 ok 7 - null-tenant: app_metadata has tenant_id key even when value is null
(1 row)

INSERT 0 0
UPDATE 1
                                  is                                  
----------------------------------------------------------------------
 ok 8 - regression: normal user with valid profile still works (role)
(1 row)

                               is                               
----------------------------------------------------------------
 ok 9 - regression: normal user tenant_id injection still works
(1 row)

 finish 
--------
(0 rows)
```

## Verification of Requirements

### 1. missing-profile: hook MUST RAISE (fail loud), no token minted ✅
- Test 2 (`throws_ok`) confirms the hook raises an exception with the exact message:
  `custom_access_token_hook: no profile row for user 11111111-1111-1111-1111-111111111111`
- The original event is NOT returned (exception propagates, blocking token issuance)

### 2. null-tenant: hook MUST log WARNING and still mint claims ✅
- Test 4-7 verify the hook returns valid claims with `role` and `tenant_id` keys
- The WARNING is logged 4 times (once per hook invocation in tests), visible in output:
  `WARNING: custom_access_token_hook: profile 22222222-2222-2222-2222-222222222222 has null tenant_id (pending assignment)`
- Claims are minted with `role='student'` and `tenant_id=NULL` (JSON null)

### 3. No regression on normal profiles ✅
- Tests 8-9 confirm existing behavior for valid profiles still works

## Hook Implementation Under Test (Migration 056)

```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as 77661
declare
  _user_id uuid;
  _tenant_id uuid;
  _role text;
begin
  _user_id := (event->'claims'->>'sub')::uuid;

  select p.tenant_id, p.role
    into _tenant_id, _role
    from public.profiles p
   where p.id = _user_id;

  if not found then
    raise exception 'custom_access_token_hook: no profile row for user %', _user_id;
  end if;

  if _tenant_id is null then
    raise warning 'custom_access_token_hook: profile % has null tenant_id (pending assignment)', _user_id;
  end if;

  event := jsonb_set(
    event,
    '{claims,app_metadata}',
    coalesce(event->'claims'->'app_metadata', '{}'::jsonb)
      || jsonb_build_object('tenant_id', _tenant_id, 'role', _role)
  );

  return event;
end;
77661;
```

## Conclusion
Both fail-loud test paths pass. The hook now:
1. **RAISES EXCEPTION** when no profile exists (fail-loud, no silent fallback)
2. **LOGS WARNING** and **STILL MINTS CLAIMS** when profile has NULL tenant_id (D15 pre-assignment case)

No defects exposed by these tests. Hook behavior matches the D15 ruling exactly.
