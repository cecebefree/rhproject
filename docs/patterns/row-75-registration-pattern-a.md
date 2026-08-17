# Row 75 — Registration Pattern A (Form + Payment Same Event)

## Overview

Pattern A handles the case where a student submits their registration form **and** pays in a single transaction. This is the simplest enrollment path — one API call creates the registration, invoice, and payment record atomically.

**Contrast with Pattern B (Row 76):** Form arrives first → `pending_review` placeholder → payment arrives later → EF lookup-and-attach → status flips to `active`.

---

## API Endpoint

```
POST /functions/v1/register-with-payment
```

**Auth:** Public (no JWT required, `anon` role)  
**Rate Limit:** 5 requests/minute per IP (recommended at Cloudflare/Supabase edge)

---

## Request Body

```json
{
  "registration": {
    "tenant_id": "uuid (required)",
    "lead_reference_id": "uuid (optional)",
    "student_name": "string (required)",
    "student_email": "string (required)",
    "student_phone": "string (optional)",
    "course_name": "string (required)",
    "notes": "string (optional)"
  },
  "invoice": {
    "amount": "number (required, > 0)",
    "currency": "string (default: ZAR)",
    "description": "string (required)"
  },
  "payment": {
    "method": "'stripe' | 'paypal' (required)",
    "token": "string (required — Stripe token or PayPal order ID)",
    "nonce": "string (optional — PayPal nonce)"
  }
}
```

---

## Response (Success — 200)

```json
{
  "status": "success",
  "registration": {
    "id": "uuid",
    "status": "pending_init",
    "created_at": "2026-08-15T10:00:00Z"
  },
  "invoice": {
    "id": "uuid",
    "status": "paid"
  },
  "payment": {
    "id": "uuid",
    "status": "confirmed"
  },
  "temp_credentials": {
    "email": "student@example.com",
    "temp_password": "aB3kL9xM2pQ7",
    "expires_at": "2026-08-16T10:00:00Z"
  }
}
```

## Response (Error)

```json
{
  "status": "error",
  "code": "VALIDATION_ERROR | TENANT_NOT_FOUND | DUPLICATE_EMAIL | PAYMENT_FAILED | DB_ERROR",
  "message": "Human-readable error message"
}
```

---

## Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `VALIDATION_ERROR` | 400 | Missing/invalid fields in request body |
| `TENANT_NOT_FOUND` | 404 | `tenant_id` doesn't match any tenant |
| `DUPLICATE_EMAIL` | 409 | Active registration already exists for this email + tenant |
| `PAYMENT_FAILED` | 402 | Stripe/PayPal rejected the payment |
| `DB_ERROR` | 500 | Database insert failed |
| `NETWORK_ERROR` | 500 | Client-side network error |

---

## Logic Flow

```
1. Validate request body
2. Verify tenant exists (tenant_lms)
3. Check for duplicate active registration (same email + tenant)
4. Process payment:
   a. Stripe → POST /v1/charges (charge with token)
   b. PayPal → capture order (orderId)
5. If payment succeeds:
   a. INSERT office_desk.registrations (status: pending_init)
   b. INSERT office_desk.invoices (status: paid, amount_paid = amount)
   c. INSERT office_desk.payments (status: confirmed)
   d. UPDATE front_desk.leads.status = 'handed_off' (if lead_reference_id)
   e. Generate temp credentials (random password, 24h expiry)
   f. Notify office desk (non-blocking, fire-and-forget)
   g. Return success with temp credentials
6. If payment fails:
   a. INSERT office_desk.failed_enrollments (dead-letter)
   b. Return error with retry instructions
```

---

## Transaction Safety

- Registration is created **after** payment succeeds (no orphan registrations)
- If registration insert fails after payment, the failure is logged but not rolled back (payment already captured — manual reconciliation needed)
- Duplicate email check prevents double-charges for same student
- Idempotency: calling twice with same Stripe token will fail (Stripe prevents duplicate charges)

---

## Dead-Letter Table

All failed attempts are logged to `office_desk.failed_enrollments`:

```sql
SELECT * FROM office_desk.failed_enrollments
WHERE resolved = false
ORDER BY created_at DESC;
```

Columns: `registration_attempt` (jsonb), `payment_attempt` (jsonb, tokens redacted), `error_code`, `error_message`, `ip_address`, `created_at`.

Office/admin users can query this table to investigate failures.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key for DB writes |
| `STRIPE_SECRET_KEY` | If Stripe | Stripe secret key (`sk_...`) |
| `PAYPAL_CLIENT_ID` | If PayPal | PayPal client ID |
| `PAYPAL_SECRET` | If PayPal | PayPal secret |
| `PAYPAL_MODE` | No | `sandbox` (default) or `live` |

---

## Frontend Integration

The `RegistrationForm` component (`apps/web/src/features/office-desk/components/RegistrationForm.tsx`) provides a ready-to-use form that:

1. Collects student details + course + amount
2. Lets user select Stripe or PayPal
3. Calls `register-with-payment` EF
4. Shows temp credentials on success

**Note:** The actual Stripe.js / PayPal SDK token collection must be implemented separately (PCI compliance — tokens must be obtained client-side before calling this EF).

---

## Files

| Path | Purpose |
|------|---------|
| `supabase/migrations/145_failed_enrollments_deadletter.sql` | Dead-letter table + RLS |
| `supabase/functions/register-with-payment/index.ts` | Main Pattern A EF |
| `supabase/functions/office-desk-notify/index.ts` | Non-blocking office desk notification |
| `apps/web/src/features/office-desk/components/RegistrationForm.tsx` | Frontend registration form |
| `supabase/tests/145_failed_enrollments_test.sql` | pgTAP test for dead-letter table |
| `docs/patterns/row-75-registration-pattern-a.md` | This file |
