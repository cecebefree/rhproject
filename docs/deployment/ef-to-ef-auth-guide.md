# EF-to-EF Auth Guide

**Row 57:** HMAC-SHA256 service identity auth for inter-EF calls.
**Date:** 2026-08-15
**Status:** Implemented

---

## Overview

EF-to-EF auth enables secure desk-to-desk communication:
- `front_desk` → `school_desk` (create_enrollment, notify_lead_conversion)
- `school_desk` → `office_desk` (notify_enrollment_status, query_registration)
- `office_desk` → `school_desk` (query_registration, notify_payment_status)

---

## Architecture

```
┌─────────────────┐     HMAC-SHA256      ┌─────────────────┐
│   front_desk    │ ──────────────────►  │   school_desk   │
│                 │   X-EF-Caller: ...   │                 │
│                 │   X-EF-Signature: .. │                 │
│                 │   X-EF-Timestamp: .. │                 │
└─────────────────┘                      └─────────────────┘
         │                                        │
         │                                        │
         ▼                                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    public.ef_call_log                        │
│  (append-only audit trail for all EF-to-EF calls)          │
└─────────────────────────────────────────────────────────────┘
```

---

## Secret Generation

Generate a secret for each desk service:

```bash
# Front Desk
openssl rand -hex 32
# Output: 31072cf3bbb395950756bd8497d4acb9cebc0f3aa8f66c052a1b2a3b7de33bb9

# Office Desk
openssl rand -hex 32
# Output: a7f0cc39cc98958cd3ca3c1f9cbdab9f9f27be80fb19931601a35e1999b0f90e

# School Desk
openssl rand -hex 32
# Output: aa57d77eb94c75657297d7b515e6630bb880eb7d87b38a9f86c646975497bb9b
```

---

## Environment Variables

Add to `supabase/.env`:

```bash
# EF-to-EF Auth (Desk Service Identity)
EF_FRONT_DESK_SERVICE_NAME=front_desk
EF_FRONT_DESK_SERVICE_SECRET=31072cf3bbb395950756bd8497d4acb9cebc0f3aa8f66c052a1b2a3b7de33bb9
EF_FRONT_DESK_SERVICE_SECRET_PREV=

EF_OFFICE_DESK_SERVICE_NAME=office_desk
EF_OFFICE_DESK_SERVICE_SECRET=a7f0cc39cc98958cd3ca3c1f9cbdab9f9f27be80fb19931601a35e1999b0f90e
EF_OFFICE_DESK_SERVICE_SECRET_PREV=

EF_SCHOOL_DESK_SERVICE_NAME=school_desk
EF_SCHOOL_DESK_SERVICE_SECRET=aa57d77eb94c75657297d7b515e6630bb880eb7d87b38a9f86c646975497bb9b
EF_SCHOOL_DESK_SERVICE_SECRET_PREV=
```

---

## Header Format

Every EF-to-EF request must include these headers:

| Header | Description | Example |
|--------|-------------|---------|
| `X-EF-Caller` | Name of calling service | `front_desk` |
| `X-EF-Signature` | HMAC-SHA256 signature (hex) | `a1b2c3d4...` |
| `X-EF-Timestamp` | Unix timestamp (ms) | `1755000000000` |

---

## Signature Computation

```
1. Compute body hash:
   body_hash = SHA256(request_body || "")

2. Create message:
   message = method + "|" + path + "|" + timestamp + "|" + body_hash

3. Compute HMAC:
   signature = HMAC-SHA256(message, EF_SERVICE_SECRET)

4. Encode as hex:
   signature_hex = hex(signature)
```

### Example

```typescript
const body = JSON.stringify({ tenant_id: "..." });
const bodyHash = await computeBodyHash(body);
const timestamp = Date.now();
const message = `POST|/functions/v1/front-desk-read-leads|${timestamp}|${bodyHash}`;
const signature = await computeHMAC(message, EF_SERVICE_SECRET);
```

---

## Authorization Matrix

| Caller | Allowed Targets | Allowed Actions |
|--------|-----------------|-----------------|
| `front_desk` | `school_desk` | `create_enrollment`, `notify_lead_conversion` |
| `front_desk` | `office_desk` | `create_registration`, `notify_lead_conversion` |
| `school_desk` | `office_desk` | `notify_enrollment_status`, `query_registration` |
| `office_desk` | `school_desk` | `query_registration`, `notify_payment_status` |

Unknown callers are rejected at the gate.

---

## Receiver Implementation

```typescript
import {
  verifyEFSignature,
  authorizeEFCall,
  writeEfCallLog,
  getServiceSecret,
  getPreviousServiceSecret,
  getCallerIP,
} from "../_shared/ef-auth.ts";

Deno.serve(async (req) => {
  // Check for EF-to-EF auth
  const efCaller = req.headers.get("X-EF-Caller");
  if (efCaller) {
    try {
      const efSecret = getServiceSecret("school_desk");
      const efSecretPrev = getPreviousServiceSecret("school_desk");
      const efContext = await verifyEFSignature(req, efSecret, efSecretPrev);

      // Authorize the call
      authorizeEFCall(efContext, "school_desk", "create_enrollment");

      // ... business logic ...

      // Log the call (non-blocking)
      await writeEfCallLog({
        tenant_id: efContext.tenantId,
        caller: efContext.caller,
        receiver: "school_desk",
        action: "create_enrollment",
        method: req.method,
        path: url.pathname,
        status_code: 200,
        caller_ip: getCallerIP(req),
        signature_valid: efContext.signatureValid,
        replay_check_passed: efContext.replayCheckPassed,
      });

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
      // EF auth failed
      return err instanceof Response ? err : new Response(
        JSON.stringify({ error: "ef_auth_failed" }),
        { status: 500 }
      );
    }
  }

  // ... existing user JWT auth logic ...
});
```

---

## Audit Log Queries

### Recent calls by caller

```sql
SELECT caller, COUNT(*), MAX(created_at)
FROM ef_call_log
WHERE created_at > now() - interval '1 hour'
GROUP BY caller;
```

### Failed calls (signature invalid)

```sql
SELECT *
FROM ef_call_log
WHERE signature_valid = false
ORDER BY created_at DESC
LIMIT 100;
```

### Rate limiting check

```sql
SELECT COUNT(*) as call_count
FROM ef_call_log
WHERE caller = 'front_desk'
AND created_at > now() - interval '1 minute';
```

---

## Troubleshooting

### "missing_ef_headers"

**Cause:** Request missing X-EF-Caller, X-EF-Signature, or X-EF-Timestamp headers.

**Fix:** Ensure all three headers are included in the request.

### "invalid_signature"

**Cause:** HMAC signature doesn't match.

**Fix:**
1. Verify `EF_SERVICE_SECRET` matches the caller's secret
2. Check signature computation: `method|path|timestamp|body_hash`
3. Ensure body hash is computed from the exact request body

### "replay_detected"

**Cause:** Timestamp is more than 60 seconds old.

**Fix:**
1. Use `Date.now()` for fresh timestamps
2. Ensure clocks are synchronized (NTP)

### "unauthorized_action"

**Cause:** Caller is not authorized for this action on this target.

**Fix:**
1. Check authorization matrix in `ef-auth.ts`
2. Add the action to the matrix if needed

---

## Secret Rotation

### Dual-Key Support

Each EF accepts two secrets:
- `EF_SERVICE_SECRET` (current)
- `EF_SERVICE_SECRET_PREV` (previous, for rotation)

### Rotation Procedure

1. Generate new secret: `openssl rand -hex 32`
2. Set `EF_SERVICE_SECRET_PREV` to old secret
3. Set `EF_SERVICE_SECRET` to new secret
4. Deploy updated EFs
5. Update all callers with new secret
6. Clear `EF_SERVICE_SECRET_PREV` after 7 days

---

## Testing

Run the test suite:

```bash
deno run --allow-net --allow-env scripts/test-ef-auth.ts
```

Expected output:
```
✅ PASS | Valid signature (HTTP 200)
✅ PASS | Invalid signature (HTTP 401)
✅ PASS | Replay detection (HTTP 401)
✅ PASS | Missing headers (HTTP 401)
✅ PASS | Unauthorized caller (HTTP 403)
```

---

## Files

| File | Purpose |
|------|---------|
| `supabase/functions/_shared/ef-auth.ts` | Core auth module |
| `supabase/migrations/144_ef_call_log.sql` | Audit table migration |
| `scripts/test-ef-auth.ts` | Test harness |
| `docs/deployment/ef-to-ef-auth-guide.md` | This file |
