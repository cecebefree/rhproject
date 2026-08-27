# Office Desk Edge Functions — Test Cases

## Prerequisites
- Local Supabase running (`supabase start`)
- Migration 186 applied (`supabase db reset`)
- Test data seeded (family_account, students, invoices, schedule_slot)

---

## Test 1: verify-turnstile — Valid Token

```bash
curl -X POST http://localhost:54321/functions/v1/verify-turnstile \
  -H "Content-Type: application/json" \
  -d '{"token": "valid_token_xyz"}'
```

**Expected:** 200 OK
```json
{
  "success": true,
  "challenge_ts": "2026-08-22T10:00:00Z",
  "hostname": "localhost",
  "error_codes": []
}
```

---

## Test 2: verify-turnstile — Missing Token

```bash
curl -X POST http://localhost:54321/functions/v1/verify-turnstile \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:** 400 Bad Request
```json
{
  "error": "Missing or invalid token"
}
```

---

## Test 3: nightly-reconciliation — Invoice Payment

```bash
# Seed: Create pending invoice + completed payment
# Then trigger reconciliation

curl -X POST http://localhost:54321/functions/v1/nightly-reconciliation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -d '{"timestamp": "2026-08-22T00:00:00Z"}'
```

**Expected:** 200 OK
```json
{
  "success": true,
  "invoices_paid": 1,
  "debit_orders_charged": 0,
  "failed_charges": 0,
  "timestamp": "2026-08-22T00:00:01Z",
  "duration_ms": 123
}
```

**Verify:** Invoice status updated to 'paid', family_activity logged.

---

## Test 4: nightly-reconciliation — Unauthorized

```bash
curl -X POST http://localhost:54321/functions/v1/nightly-reconciliation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -d '{}'
```

**Expected:** 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

---

## Test 5: validate-toggle — Pause Enrichment Module

```bash
curl -X POST http://localhost:54321/functions/v1/validate-toggle \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <PARENT_USER_TOKEN>" \
  -d '{
    "family_account_id": "<FAMILY_UUID>",
    "student_id": "<STUDENT_UUID>",
    "module": "enrichment",
    "action": "pause"
  }'
```

**Expected:** 200 OK
```json
{
  "allowed": true,
  "reason": "success",
  "active_modules": ["core", "clubs"],
  "paused_modules": ["enrichment"]
}
```

---

## Test 6: validate-toggle — Cannot Pause Core (Only Active Module)

```bash
curl -X POST http://localhost:54321/functions/v1/validate-toggle \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <PARENT_USER_TOKEN>" \
  -d '{
    "family_account_id": "<FAMILY_UUID>",
    "student_id": "<STUDENT_UUID>",
    "module": "core",
    "action": "pause"
  }'
```

**Expected:** 200 OK
```json
{
  "allowed": false,
  "reason": "cannot_pause_only_active_module",
  "active_modules": ["core"],
  "paused_modules": []
}
```

---

## Test 7: validate-toggle — Unauthorized User

```bash
curl -X POST http://localhost:54321/functions/v1/validate-toggle \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <WRONG_USER_TOKEN>" \
  -d '{
    "family_account_id": "<FAMILY_UUID>",
    "student_id": "<STUDENT_UUID>",
    "module": "core",
    "action": "pause"
  }'
```

**Expected:** 403 Forbidden
```json
{
  "error": "Unauthorized: not a parent/guardian of this family"
}
```

---

## Test 8: class-start-ping — Send Notifications

```bash
# Seed: Create schedule_slot with start_time = NOW() + 3 minutes
# Then trigger ping

curl -X POST http://localhost:54321/functions/v1/class-start-ping \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -d '{"timestamp": "2026-08-22T10:00:00Z"}'
```

**Expected:** 200 OK
```json
{
  "success": true,
  "notifications_sent": 2,
  "timestamp": "2026-08-22T10:00:15Z"
}
```

**Verify:** Notifications created in `notifications` table, family_activity logged.

---

## Test 9: class-start-ping — No Upcoming Classes

```bash
curl -X POST http://localhost:54321/functions/v1/class-start-ping \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -d '{"timestamp": "2026-08-22T10:00:00Z"}'
```

**Expected:** 200 OK
```json
{
  "success": true,
  "notifications_sent": 0,
  "message": "No classes starting in next 5 minutes"
}
```

---

## Test 10: system_log — Table Exists and Accepts Inserts

```sql
-- Via psql or Supabase SQL Editor
INSERT INTO system_log (function_name, status, details)
VALUES ('test', 'success', '{"test": true}'::jsonb);

SELECT * FROM system_log WHERE function_name = 'test';
```

**Expected:** 1 row returned with inserted data.

---

## Cleanup

```sql
-- Remove test data
DELETE FROM system_log WHERE function_name = 'test';
DELETE FROM family_activity WHERE details->>'function_name' = 'nightly-reconciliation';
DELETE FROM notifications WHERE type = 'schedule';
```
