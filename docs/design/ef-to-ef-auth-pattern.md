# EF-to-EF Auth Pattern for Redhouse Desk Services

**Status:** Draft
**Date:** 2026-08-12
**Scope:** Front Desk, School Desk, Office Desk edge function mutual authentication

---

## Problem

Three desk EFs must call each other (e.g., Front Desk → School Desk on lead conversion) without user credentials. Current EFs authenticate via user JWT or `SUPABASE_SERVICE_ROLE_KEY` (global, identity-less). No pattern exists for service-to-service auth with caller identity, authorization scoping, or audit trails.

## Design

### 1. Service Identity

Each desk EF gets a named identity stored in `Deno.env`:

```
EF_SERVICE_NAME=front_desk     # immutable per EF
EF_SERVICE_SECRET=<hmac-sha256-hex>  # per-service shared secret
```

Caller signs every outbound request with HMAC-SHA256 over a canonical string:

```
sign( method + "." + path + "." + timestamp_ms + "." + body_hash, EF_SERVICE_SECRET )
```

Where `body_hash = SHA256(request_body || "")`. Empty body hashes to the empty-string SHA256.

Sent as headers:

```
X-EF-Caller: front_desk
X-EF-Signature: <hex(hmac)>
X-EF-Timestamp: <unix_ms>
```

### 2. Authorization Matrix

Hardcoded in `_shared/ef-auth.ts`. Only explicitly listed pairs are allowed:

| Caller          | Allowed Targets             | Allowed Actions                          |
|-----------------|-----------------------------|------------------------------------------|
| `front_desk`    | `school_desk`, `office_desk` | create_enrollment, notify_lead_conversion |
| `school_desk`   | `office_desk`               | notify_enrollment_status                 |
| `office_desk`   | `school_desk`               | query_registration                       |

Unknown callers are rejected at the gate. The matrix is the single source of truth; no implicit "all-access" for any service.

### 3. Token/Secret Management

- **Storage:** Secrets stored in Supabase Vault or as encrypted env vars per EF (never in code or git).
- **Rotation:** Dual-key support. Each EF accepts two valid secrets (`EF_SERVICE_SECRET` + `EF_SERVICE_SECRET_PREV`). Rotation: deploy new secret → update callers → remove old secret. 7-day overlap window.
- **Per-tenant isolation:** Secrets are project-wide but every request carries `tenant_id` in the signed payload. The receiver validates `tenant_id` matches the caller's known tenant. Cross-tenant calls are blocked regardless of valid signature.

### 4. Request Validation (Receiver)

Every protected EF endpoint wraps its handler with `verifyEfAuth(req)`:

```
1. Extract X-EF-Caller, X-EF-Signature, X-EF-Timestamp headers.
2. Reject if timestamp > 60 seconds old (replay protection).
3. Compute canonical string: method + "." + path + "." + timestamp + "." + body_hash.
4. Verify HMAC against caller's secret (try current, then prev).
5. Look up caller in AUTHORIZATION_MATRIX[caller][this_service].
6. If not found → 403 { error: "ef_unauthorized" }.
7. Return parsed AuthContext: { caller: "front_desk", tenant_id, allowed_actions }.
```

All steps are synchronous. No network calls. Failure at any step returns 403 immediately.

### 5. Audit Trail

Every EF-to-EF call writes one row to `public.ef_call_log`:

```sql
CREATE TABLE public.ef_call_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  caller        text NOT NULL,
  receiver      text NOT NULL,
  action        text NOT NULL,
  method        text NOT NULL,
  path          text NOT NULL,
  status_code   int NOT NULL,
  caller_ip     text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

Inserted by the receiver _after_ the call completes (success or failure). RLS: admin-only SELECT within tenant, no UPDATE/DELETE. Append-only.

### 6. Concrete Example: Front Desk → School Desk

**Flow:** Front Desk creates a lead → converts to enrollment → notifies School Desk.

```
Front Desk EF                          School Desk EF
     |                                       |
     |-- POST /school-desk/enrollments ------>|
     |   X-EF-Caller: front_desk             |
     |   X-EF-Signature: <hmac>              |
     |   X-EF-Timestamp: 1755000000000       |
     |   Body: { lead_id, student_name,      |
     |           course_id, tenant_id }       |
     |                                       |
     |                     verifyEfAuth(req)  |
     |                     → caller=front_desk|
     |                     → allowed? YES     |
     |                     → insert enrollment|
     |                     → write ef_call_log|
     |                                       |
     |<------ 201 { enrollment_id } ---------|
```

**School Desk receiver (pseudocode):**

```typescript
import { verifyEfAuth, writeEfCallLog } from "../_shared/ef-auth.ts";

Deno.serve(async (req) => {
  const auth = await verifyEfAuth(req, "school_desk");
  if (auth instanceof Response) return auth; // 403

  if (!auth.allowed_actions.includes("create_enrollment")) {
    return new Response(JSON.stringify({ error: "ef_action_denied" }), { status: 403 });
  }

  // ... business logic using service_role client ...
  // ... write ef_call_log ...
});
```

### 7. Compatibility with Row 61 (Rate Limiting) and Row 62 (Office Desk RLS)

- **Rate limiting (Row 61):** `ef_call_log` is append-only; a rate-limit check query (`SELECT count(*) FROM ef_call_log WHERE caller = $1 AND created_at > now() - interval '1 minute'`) is cheap and indexable. Apply per-caller rate limits in `verifyEfAuth` before authorization.
- **Office Desk RLS (Row 62):** Desk EFs use `service_role` clients (bypass RLS) but apply server-side `tenant_id` filtering as defense-in-depth. This is the same pattern already used by `front-desk-read-leads` and `release-report-card`. EF-to-EF calls add no new RLS requirements — the receiving EF's `service_role` client + tenant filter is the security boundary.

### 8. Migration Requirements

New migration (next number) creates `ef_call_log` and grants:

```sql
GRANT INSERT ON public.ef_call_log TO service_role;
GRANT SELECT ON public.ef_call_log TO authenticated;
```

RLS policy: admin-only SELECT within tenant (matches existing admin_all pattern from 086).

---

**Key invariant:** The `service_role` key remains the DB access mechanism. EF-to-EF auth is an _application-layer_ gate that runs _before_ any DB operation. It adds caller identity and authorization — not DB permissions.
