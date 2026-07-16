# DEFECT: custom_access_token_hook swallows exceptions, mislabeled fail-loud

**Status:** OPEN
**Opened:** 2026-07-16
**Severity:** Medium (contained by deny-by-default RLS, but violates loud-failure protocol)

---

## Evidence

**Source:** `custom_access_token_hook` function in Supabase
**Evidence pointer:** `docs/evidence/gate-1b-hook-source.txt` (commit `3904522`)
**Verification:** `pg_proc` output confirms function body

### Raw pg_proc output (2026-07-16)

```sql
custom_access_token_hook |
                         | DECLARE
                         |   _user_id uuid;
                         |   _tenant_id uuid;
                         |   _role text;
                         | BEGIN
                         |   -- Extract user ID from the event payload
                         |   _user_id := (event->'claims'->>'sub')::uuid;
                         |
                         |   -- Look up tenant_id and role from profiles
                         |   SELECT p.tenant_id, p.role
                         |     INTO _tenant_id, _role
                         |     FROM public.profiles p
                         |    WHERE p.id = _user_id;
                         |
                         |   -- Inject into app_metadata (merged into existing claims)
                         |   event := jsonb_set(
                         |     event,
                         |     '{claims,app_metadata}',
                         |     COALESCE(event->'claims'->'app_metadata', '{}'::jsonb)
                         |       || jsonb_build_object(
                         |            'tenant_id', _tenant_id,
                         |            'role', _role
                         |          )
                         |   );
                         |
                         |   RETURN event;
                         | EXCEPTION WHEN OTHERS THEN
                         |   -- Fail-loud: return original event so auth does not break
                         |   RETURN event;
                         | END;
```

---

## Defect

The handler's `EXCEPTION WHEN OTHERS THEN` block is commented `-- Fail-loud` but does the opposite: it **silently swallows all errors**, returning the original event with no `tenant_id` claim.

### Failure modes

1. **Missing profiles row:** `SELECT INTO` returns NULL for `_tenant_id` and `_role`. Token is minted with `tenant_id: null`. No exception raised.
2. **Profile exists but tenant_id is NULL:** Token is minted with `tenant_id: null`. No exception raised.
3. **Any other exception (DB error, type cast, etc.):** Exception caught, original event returned. Token minted without `app_metadata` injection. No exception raised.

In all cases, the user receives a valid JWT with no tenant_id claim, and the system does not log or raise the error.

---

## Impact

**Contained** by deny-by-default RLS: every tenant-scoped policy requires `tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid`. A token with `tenant_id: null` matches zero rows — no cross-tenant data leak.

**But:**
- Violates the loud-failure protocol documented in the hook's own comment
- Mislabeled as its opposite ("Fail-loud" on a silent handler)
- Missing tenant_id means the user sees empty screens with no error feedback
- Debugging is harder: no server-side error signal for a missing profile

---

## Required Fix (Deferred — Own Item)

1. Re-raise on lookup failure: if `_tenant_id IS NULL` after the SELECT, raise an exception (e.g., `RAISE EXCEPTION 'custom_access_token_hook: no profile for user %', _user_id`)
2. Re-raise on any other exception instead of returning the original event
3. Verify fix via raw `pg_proc` output (same method as this evidence)
4. Seal evidence per Gate 1B pattern

---

Defect logged: 2026-07-16
Awaiting own item assignment.
