// mocks/stripe-webhook.mock.ts
// Stripe webhook event mocks and HMAC signature generation for testing

import { webcrypto } from "node:crypto";
const crypto = webcrypto;

const encoder = new TextEncoder();

/**
 * Generate a valid Stripe webhook signature for testing.
 * Stripe signs with: HMAC-SHA256("t=timestamp.body", webhook_secret)
 */
export async function signStripeWebhook(
  body: string,
  secret: string,
  timestamp?: number
): Promise<string> {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const payload = `${ts}.${body}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const hexSig = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `t=${ts},v1=${hexSig}`;
}

export interface StripeCheckoutSessionCompleted {
  id: string;
  object: "checkout.session";
  customer: string | null;
  payment_intent: string | null;
  metadata: {
    lead_id: string;
    child_name: string;
    family_email: string;
  };
}

export interface StripeWebhookEvent {
  id: string;
  object: "event";
  type: string;
  data: {
    object: StripeCheckoutSessionCompleted;
  };
}

export function buildCheckoutSessionCompleted(overrides: {
  lead_id: string;
  child_name?: string;
  family_email?: string;
  customer?: string;
  payment_intent?: string;
  event_id?: string;
}): StripeWebhookEvent {
  return {
    id: overrides.event_id || `evt_test_${Date.now()}`,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_test_${Date.now()}`,
        object: "checkout.session",
        customer: overrides.customer || `cus_test_${Date.now()}`,
        payment_intent: overrides.payment_intent || `pi_test_${Date.now()}`,
        metadata: {
          lead_id: overrides.lead_id,
          child_name: overrides.child_name || "TestChild",
          family_email: overrides.family_email || "test@example.com",
        },
      },
    },
  };
}

export function buildChargeSucceeded(overrides: {
  lead_id: string;
  charge_id?: string;
  event_id?: string;
}): StripeWebhookEvent {
  return {
    id: overrides.event_id || `evt_test_${Date.now()}`,
    object: "event",
    type: "charge.succeeded",
    data: {
      object: {
        id: overrides.charge_id || `ch_test_${Date.now()}`,
        object: "checkout.session",
        customer: null,
        payment_intent: null,
        metadata: {
          lead_id: overrides.lead_id,
          child_name: "TestChild",
          family_email: "test@example.com",
        },
      },
    },
  };
}

export function buildPaymentIntentSucceeded(overrides: {
  lead_id: string;
  payment_intent_id?: string;
  event_id?: string;
}): StripeWebhookEvent {
  return {
    id: overrides.event_id || `evt_test_${Date.now()}`,
    object: "event",
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: overrides.payment_intent_id || `pi_test_${Date.now()}`,
        object: "checkout.session",
        customer: null,
        payment_intent: null,
        metadata: {
          lead_id: overrides.lead_id,
          child_name: "TestChild",
          family_email: "test@example.com",
        },
      },
    },
  };
}

// Mock Stripe Checkout Session creation response
export function buildStripeSessionResponse(overrides: { url?: string; id?: string } = {}) {
  return {
    id: overrides.id || `cs_test_${Date.now()}`,
    url: overrides.url || `https://checkout.stripe.com/c/pay/cs_test_${Date.now()}`,
    mode: "payment",
    payment_status: "unpaid",
  };
}
