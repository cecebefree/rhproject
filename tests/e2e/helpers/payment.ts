// helpers/payment.ts — Stripe test payment helpers for E2E tests

import { type Page } from "@playwright/test";

const SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost:54321";

// ═══════════════════════════════════════════════════════════
// STRIPE TEST CARD
// ═══════════════════════════════════════════════════════════

export const STRIPE_TEST_CARD = {
  number: "4242424242424242",
  exp: "1234", // MMYY
  cvc: "123",
  zip: "12345",
};

// ═══════════════════════════════════════════════════════════
// FILL STRIPE CARD ELEMENT (embedded in iframe)
// ═══════════════════════════════════════════════════════════

export async function fillStripeCard(page: Page): Promise<void> {
  // Stripe Elements renders in an iframe
  const stripeFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first();

  // Fill card number
  await stripeFrame
    .locator('[name="cardnumber"]')
    .fill(STRIPE_TEST_CARD.number);

  // Fill expiry
  await stripeFrame.locator('[name="exp-date"]').fill(STRIPE_TEST_CARD.exp);

  // Fill CVC
  await stripeFrame.locator('[name="cvc"]').fill(STRIPE_TEST_CARD.cvc);

  // Fill ZIP
  await stripeFrame.locator('[name="postal"]').fill(STRIPE_TEST_CARD.zip);
}

// ═══════════════════════════════════════════════════════════
// SIMULATE STRIPE WEBHOOK (for backend testing)
// ═══════════════════════════════════════════════════════════

export async function simulateStripeWebhook(params: {
  eventType: string;
  chargeId: string;
  registrationId: string;
  amount: number;
  webhookSecret?: string;
}): Promise<{ status: number; body: string }> {
  const {
    eventType,
    chargeId,
    registrationId,
    amount,
    webhookSecret = "whsec_test_secret",
  } = params;

  const timestamp = Math.floor(Date.now() / 1000).toString();

  const eventPayload = {
    id: `evt_e2e_${Date.now()}`,
    type: eventType,
    data: {
      object: {
        id: chargeId,
        amount,
        amount_refunded: eventType === "charge.refunded" ? amount : 0,
        currency: "zar",
        metadata: { registration_id: registrationId },
        failure_message:
          eventType === "charge.failed" ? "Insufficient funds" : undefined,
        refunds:
          eventType === "charge.refunded"
            ? {
                data: [
                  {
                    id: `re_e2e_${Date.now()}`,
                    amount,
                    reason: "requested_by_customer",
                    status: "succeeded",
                  },
                ],
              }
            : undefined,
      },
    },
  };

  const body = JSON.stringify(eventPayload);

  // Sign with HMAC-SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${body}`)
  );
  const hexSig = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/webhooks-stripe`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": `t=${timestamp},v1=${hexSig}`,
      },
      body,
    }
  );

  return { status: res.status, body: await res.text() };
}

// ═══════════════════════════════════════════════════════════
// SEND TEMPLATE EMAIL (via EF)
// ═══════════════════════════════════════════════════════════

export async function sendTemplateEmail(params: {
  accessToken: string;
  templateId: string;
  recipientEmail: string;
  recipientName: string;
  data: Record<string, string>;
}): Promise<{ status: number; body: string }> {
  const { accessToken, templateId, recipientEmail, recipientName, data } = params;

  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/send-template-email`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        template_id: templateId,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        data,
      }),
    }
  );

  return { status: res.status, body: await res.text() };
}
