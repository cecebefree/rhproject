/**
 * Payment client library — Stripe + PayPal integration
 * Wraps Edge Function calls for payment intent creation and confirmation.
 *
 * Edge Functions:
 *   - create-payment-intent: POST { invoice_id, tenant_id, processor }
 *   - confirm-payment:        POST { invoice_id, processor, payment_intent_id? }
 *   - stripe-webhook / paypal-webhook: webhook handlers (server-side only)
 */

import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

// ─── Stripe.js singleton ────────────────────────────────────
let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(
      import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
    );
  }
  return stripePromise;
};

// ─── Helpers ────────────────────────────────────────────────
async function efCall<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? ''}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    }
  );

  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Edge Function ${fn} failed (${res.status})`);
  }
  return json as T;
}

// ─── Types ──────────────────────────────────────────────────
export interface StripePaymentResult {
  success: boolean;
  processor: 'stripe';
  client_secret: string;
  payment_intent_id: string;
  amount: number;
}

export interface PayPalPaymentResult {
  success: boolean;
  processor: 'paypal';
  order_id: string;
  approval_url: string;
  amount: number;
}

export interface PaymentConfirmation {
  success: boolean;
  processor: string;
  status: string;
  paid_at?: string;
  charge_id?: string;
  capture_id?: string;
  client_secret?: string;
  error?: string;
}

// ─── Stripe ─────────────────────────────────────────────────
export async function createStripePaymentIntent(
  invoiceId: string,
  tenantId: string,
  paymentMethod: 'card' | 'ach' = 'card'
): Promise<StripePaymentResult> {
  return efCall<StripePaymentResult>('create-payment-intent', {
    invoice_id: invoiceId,
    tenant_id: tenantId,
    processor: 'stripe',
    payment_method: paymentMethod,
  });
}

export async function confirmStripePayment(
  invoiceId: string,
  paymentIntentId?: string,
  paymentMethodId?: string
): Promise<PaymentConfirmation> {
  return efCall<PaymentConfirmation>('confirm-payment', {
    invoice_id: invoiceId,
    processor: 'stripe',
    payment_intent_id: paymentIntentId,
    payment_method_id: paymentMethodId,
  });
}

// ─── PayPal ─────────────────────────────────────────────────
export async function createPayPalPaymentIntent(
  invoiceId: string,
  tenantId: string
): Promise<PayPalPaymentResult> {
  return efCall<PayPalPaymentResult>('create-payment-intent', {
    invoice_id: invoiceId,
    tenant_id: tenantId,
    processor: 'paypal',
  });
}

export async function confirmPayPalPayment(
  invoiceId: string,
  orderId?: string
): Promise<PaymentConfirmation> {
  return efCall<PaymentConfirmation>('confirm-payment', {
    invoice_id: invoiceId,
    processor: 'paypal',
    order_id: orderId,
  });
}

// ─── RPC wrappers (via Supabase client) ─────────────────────
export async function createStripePaymentIntentRPC(
  studentId: string,
  invoiceId: string,
  amount: number
) {
  const { data, error } = await supabase.rpc('create_stripe_payment_intent', {
    p_student_id: studentId,
    p_invoice_id: invoiceId,
    p_amount: amount,
  });
  if (error) throw error;
  return data;
}

export async function createPayPalPaymentIntentRPC(
  studentId: string,
  invoiceId: string,
  amount: number
) {
  const { data, error } = await supabase.rpc('create_paypal_payment_intent', {
    p_student_id: studentId,
    p_invoice_id: invoiceId,
    p_amount: amount,
  });
  if (error) throw error;
  return data;
}

// ─── Retry ──────────────────────────────────────────────────
export async function retryPayment(
  paymentId: string,
  newToken?: string
) {
  return efCall<{
    success: boolean;
    payment: { id: string; status: string; reference: string; paid_at: string };
    message: string;
  }>('retry-payment', {
    payment_id: paymentId,
    new_token: newToken,
  });
}
