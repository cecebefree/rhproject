# Row 76: Stripe Webhook Integration — Implementation Plan

## Overview
Stripe webhook endpoint for `checkout.session.completed` events. Handles payment confirmation, downstream record creation, and idempotent processing.

---

## Webhook Flow Diagram

```
┌─────────────────┐
│   Stripe.com     │
│ (checkout.session│
│   .completed)    │
└────────┬────────┘
         │ POST
         ▼
┌─────────────────┐
│ Edge Function   │
│ stripe-webhook  │
└────────┬────────┘
         │
         ├─► 1. Verify signature (STRIPE_WEBHOOK_SECRET)
         │
         ├─► 2. Extract session ID from event
         │
         ├─► 3. Check idempotency (already processed?)
         │
         ├─► 4. Update payment_request → status='paid', paid_at=NOW()
         │
         ├─► 5. Create office_desk.payment record
         │
         ├─► 6. Send notification (student + parent)
         │
         └─► 7. Update course access (if enrollment payment)
```

---

## Edge Function Structure

```typescript
// supabase/functions/stripe-webhook/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.14.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

serve(async (req: Request) => {
  // 1. CORS handling
  // 2. Signature verification
  // 3. Event parsing
  // 4. Idempotency check
  // 5. Process payment
  // 6. Return 200 OK
});
```

---

## Error Handling Strategy

| Error Type | Action | Response |
|------------|--------|----------|
| Missing signature | Reject | 400 Bad Request |
| Invalid signature | Reject | 401 Unauthorized |
| Already processed | Skip | 200 OK (idempotent) |
| Payment request not found | Log + skip | 200 OK (don't fail webhook) |
| Database error | Log + retry | 500 Internal Server Error |
| Downstream failure | Log + continue | 200 OK (payment is primary) |

---

## Key Implementation Details

### 1. Signature Verification
```typescript
const signature = req.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
```

### 2. Idempotency Check
```typescript
// Check if payment already processed
if (existingPayment.status === 'paid') {
  return new Response('Already processed', { status: 200 });
}
```

### 3. Payment Request Update
```typescript
await supabase
  .from('school_desk.payment_requests')
  .update({
    status: 'paid',
    paid_at: new Date().toISOString(),
    stripe_charge_id: session.payment_intent,
  })
  .eq('stripe_session_id', session.id);
```

### 4. Downstream Record Creation
```typescript
// Create office_desk.payment record
await supabase
  .from('office_desk.payments')
  .insert({
    tenant_id: paymentRequest.tenant_id,
    registration_id: paymentRequest.registration_id,
    amount: session.amount_total / 100,
    currency: session.currency,
    stripe_payment_id: session.payment_intent,
    status: 'completed',
  });
```

---

## Database Additions

### Table: supabase.log_events (if not exists)
```sql
CREATE TABLE IF NOT EXISTS supabase.log_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    text NOT NULL,
  payload       jsonb NOT NULL,
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

---

## File Structure

```
supabase/functions/
  stripe-webhook/
    index.ts          # Main webhook handler

.env.local            # STRIPE_WEBHOOK_SECRET
```

---

## Testing with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local Supabase
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Trigger test event
stripe trigger checkout.session.completed
```

---

## Estimated Time

| Task | Hours |
|------|-------|
| Edge Function implementation | 2.0 |
| Signature verification | 0.5 |
| Idempotent handling | 0.5 |
| Payment request update | 0.5 |
| Downstream record creation | 1.0 |
| Notification (student + parent) | 1.0 |
| Course access update | 0.5 |
| Error handling + logging | 0.5 |
| Testing with Stripe CLI | 1.0 |
| **Total** | **7.5** |

---

## Dependencies

- `STRIPE_SECRET_KEY` — from Stripe dashboard
- `STRIPE_WEBHOOK_SECRET` — from Stripe webhook settings
- `school_desk.payment_requests` (Row 72)
- `office_desk.registrations` (Row 67)
- `public.profiles` (existing)

---

## Acceptance Criteria

- [ ] Webhook verifies Stripe signature correctly
- [ ] Idempotent: processes same event multiple times safely
- [ ] Updates payment_request status to 'paid'
- [ ] Creates office_desk.payment record
- [ ] Sends notification to student and parent
- [ ] Updates course access if enrollment payment
- [ ] Logs errors to supabase.log_events
- [ ] Returns 200 OK for all valid webhooks
