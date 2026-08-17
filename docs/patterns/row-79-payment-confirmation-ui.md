# Row 79: Payment Confirmation UI on Office Desk

## Status: DONE

## What Was Built

Payment management interface on the Office Desk for reviewing, confirming, refunding, and retrying incoming payments from student registrations.

### Architecture

```
PaymentConfirmation (list) ──→ PaymentConfirmationDetail (modal)
         │                              │
         └── supabase.ts (queries) ─────┘
                    │
         ┌──────────┼──────────┐
         ▼          ▼          ▼
confirm-payment   refund-    retry-
  -manual EF    payment EF  payment EF
         │          │          │
         └── migrations/146 (RLS) ──┘
```

### Database

**Migration 146 — Enhanced payments RLS:**
- Drops old RLS policies on `office_desk.payments`
- Creates:
  - `payments_anon_deny` — anonymous users blocked
  - `payments_admin_all` — office_admin/office_manager: full CRUD
  - `payments_office_select` — office role: SELECT (soft-delete filtered)
  - `payments_office_update` — office role: UPDATE (status changes only)
  - `payments_auth_select` — authenticated: SELECT own tenant payments
- `REVOKE INSERT/UPDATE/DELETE ON office_desk.payments FROM authenticated` — prevents direct writes, all mutations go through EFs

### Edge Functions

| Function | Purpose | Auth |
|----------|---------|------|
| `confirm-payment-manual` | Manually confirm a pending payment (office admin/manager) | JWT, role-gated |
| `refund-payment` | Refund a confirmed payment (Stripe refund API or PayPal void) | JWT, role-gated |
| `retry-payment` | Retry a failed payment (Stripe: new token required; PayPal: new order+capture) | JWT, role-gated |

### Frontend Components

**`PaymentConfirmation.tsx`** — List view
- Status tabs: All | Pending | Confirmed | Failed | Refunded (with counts)
- Search by reference or invoice number
- Filter by payment method (Stripe Card, Stripe ACH, PayPal)
- Real-time updates via Supabase realtime subscription
- Row click opens detail modal

**`PaymentConfirmationDetail.tsx`** — Detail modal
- Payment info: amount, method, reference, paid_at
- Registration info: student name, email, course, status
- Invoice info: number, description, amount, status
- Timeline: created_at, updated_at
- Actions based on status:
  - **Pending** → Confirm (optional notes)
  - **Confirmed** → Refund (amount + reason required)
  - **Failed** → Retry (new token for Stripe)
  - **Refunded** → read-only

### Service Layer

**`supabase.ts` additions:**
- `Payment`, `PaymentWithInvoice` types
- `PAYMENT_STATUS_LABELS`, `PAYMENT_STATUS_COLORS` constants
- `selectPayments()` — query with joins to invoices + registrations
- `getPaymentById()` — single payment with full chain
- `confirmPaymentManual()` — calls EF
- `refundPayment()` — calls EF
- `retryPayment()` — calls EF
- `subscribeToPayments()` — realtime subscription

## Unblocked Dependencies

| Row | Item | Now Unblocked |
|-----|------|---------------|
| 80 | Archived leads — payment confirmation needed for lead→registration flow | ✅ |

## Verification

- `tsc --noEmit` — clean (exit 0)
- `biome check` — clean (exit 0, no errors)
- Biome suggestion: `useSemanticElements` on tr[role=button] — advisory only, not blocking

## Files

| File | Purpose |
|------|---------|
| `supabase/migrations/146_office_desk_payments_rls.sql` | Enhanced payments RLS |
| `supabase/functions/confirm-payment-manual/index.ts` | Manual payment confirm |
| `supabase/functions/refund-payment/index.ts` | Payment refund |
| `supabase/functions/retry-payment/index.ts` | Payment retry |
| `apps/web/src/features/office-desk/components/PaymentConfirmation.tsx` | List view |
| `apps/web/src/features/office-desk/components/PaymentConfirmationDetail.tsx` | Detail modal |
| `apps/web/src/features/office-desk/services/supabase.ts` | Types + queries + EF callers |
