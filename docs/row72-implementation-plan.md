# Row 72: Payment Integration in School Front Desk — Implementation Plan

## Current State Analysis

### Existing Payment Infrastructure
- **office_desk.payments** table (migration 100): `id, tenant_id, invoice_id, amount, currency, payment_method, reference, status, paid_at`
- **office_desk.registrations** table: Has `payment_attached_at, stripe_customer_id, stripe_charge_id, paypal_transaction_id`
- **stripe-webhook EF**: Handles `charge.succeeded` events, attaches payments to registrations
- **No frontend payment components exist** — payments are backend-only via webhooks

### Key Finding
The current system is **reactive** — Stripe sends webhooks after payment. Row 72 needs to be **proactive** — create payment links that teachers can share with students.

---

## Implementation Plan

### Phase 1: Database Schema (Migration 122)

```sql
-- school_desk.payment_requests table
CREATE TABLE school_desk.payment_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenant_lms(id),
  registration_id   uuid NOT NULL REFERENCES office_desk.registrations(id),
  amount            numeric(12,2) NOT NULL,
  currency          text NOT NULL DEFAULT 'ZAR',
  description       text,
  stripe_session_id text,        -- Stripe Checkout Session ID
  stripe_payment_url text,       -- Stripe hosted payment page URL
  status            text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',      -- Payment link created, not yet paid
      'paid',         -- Stripe confirmed payment
      'expired',      -- Session expired
      'cancelled'     -- Teacher cancelled
    )),
  created_by        uuid NOT NULL REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  paid_at           timestamptz,
  deleted_at        timestamptz
);

-- RLS policies
-- rc_payment_select: Teachers read payment requests in own tenant
-- rc_payment_insert: Teachers create payment requests for registrations in own tenant
-- rc_payment_update: Teachers update own pending requests (cancel)
```

### Phase 2: Edge Function — Create Checkout Session

**Location:** `supabase/functions/create-payment-session/index.ts`

```typescript
// POST /v1/checkout/sessions via Stripe API
// Input: { registration_id, amount, currency, description }
// Output: { session_id, payment_url }
// Uses: STRIPE_SECRET_KEY env var
```

**Key details:**
- Creates Stripe Checkout Session with `mode: 'payment'`
- Passes `registration_id` and `tenant_id` in metadata for webhook matching
- Returns hosted payment URL for teacher to share

### Phase 3: Frontend Components

#### PaymentRequestForm.tsx
```typescript
interface PaymentRequestFormProps {
  tenantId: string;
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Fields:
// - Registration dropdown (from office_desk.registrations, filtered by tenant)
// - Amount input (numeric)
// - Currency selector (ZAR, USD, EUR, GBP)
// - Description textarea (optional)
// - Submit button → calls create-payment-session EF
```

#### PaymentList.tsx
```typescript
interface PaymentListProps {
  tenantId: string;
  userId: string;
  onSelect: (paymentId: string) => void;
}

// Table columns: Registration, Amount, Currency, Status, Created, Paid
// Search filter by student name
// Real-time subscriptions
```

#### PaymentDetail.tsx
```typescript
interface PaymentDetailProps {
  paymentId: string;
  onBack: () => void;
}

// Full view:
// - Student name (from registration)
// - Amount + Currency
// - Status badge
// - Payment link (copyable)
// - QR code for payment link
// - Created at, Paid at dates
// - Cancel button (if pending)
```

### Phase 4: Integration with Existing System

#### Stripe Webhook Enhancement
Update `stripe-webhook/index.ts` to handle `checkout.session.completed`:
```typescript
if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  const { registration_id, tenant_id } = session.metadata;
  
  // Update payment_request status to 'paid'
  await supabase
    .from('school_desk.payment_requests')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('stripe_session_id', session.id);
  
  // Update registration status (existing logic)
}
```

### Phase 5: UI Integration

#### SchoolDeskPage.tsx Updates
Add "Payments" tab with views:
- `payments` → PaymentList
- `payments-detail` → PaymentDetail
- `payments-create` → PaymentRequestForm

---

## File Structure

```
supabase/
├── migrations/
│   └── 122_school_desk_payment_requests.sql
└── functions/
    └── create-payment-session/
        └── index.ts

apps/web/src/features/lms/
├── components/
│   ├── PaymentRequestForm.tsx
│   ├── PaymentList.tsx
│   └── PaymentDetail.tsx
├── pages/
│   └── SchoolDeskPage.tsx (update)
└── services/
    └── supabase.ts (update)
```

---

## Estimated Time

| Task | Hours |
|------|-------|
| Migration 122 (schema + RLS) | 0.5 |
| Edge Function (Stripe API) | 1.5 |
| PaymentRequestForm.tsx | 1.0 |
| PaymentList.tsx | 1.0 |
| PaymentDetail.tsx | 1.0 |
| supabase.ts updates | 0.5 |
| SchoolDeskPage integration | 0.5 |
| Stripe webhook enhancement | 0.5 |
| Testing (pgTAP + TypeScript) | 1.0 |
| **Total** | **7.5 hours** |

---

## Dependencies

1. **Stripe API key** — Need `STRIPE_SECRET_KEY` in Supabase Edge Functions secrets
2. **Stripe Webhook** — Must be configured to receive `checkout.session.completed` events
3. **Existing registrations** — Payment requests link to `office_desk.registrations`

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Stripe API key not configured | Document setup steps, provide fallback UI |
| Webhook race condition | Use idempotent updates, check status before change |
| Registration FK constraint | Validate registration exists before creating payment request |
| Currency mismatch | Validate currency matches registration context |

---

## Acceptance Criteria

- [ ] Migration 122 creates table with correct schema and RLS
- [ ] Teachers can create payment requests for their tenant's registrations
- [ ] Stripe Checkout Session created via Edge Function
- [ ] Payment link and QR code displayed in PaymentDetail
- [ ] Real-time updates when payment status changes
- [ ] TypeScript clean, 464+ pgTAP tests pass
- [ ] Stripe webhook handles `checkout.session.completed`
