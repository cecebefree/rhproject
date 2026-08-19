// website-lead-payment-webhook — Row 81
// Webhook handler for Stripe/PayPal payment confirmations
// Archives the website_leads row and creates an office_desk.registrations row
//
// verify_jwt = false (webhooks don't have JWT)
// Env vars: STRIPE_WEBHOOK_SECRET, PAYPAL_MODE, PAYPAL_WEBHOOK_ID

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID");
const PAYPAL_SECRET = Deno.env.get("PAYPAL_SECRET");
const PAYPAL_MODE = Deno.env.get("PAYPAL_MODE") || "sandbox";
const PAYPAL_WEBHOOK_ID = Deno.env.get("PAYPAL_WEBHOOK_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, paypal-transmission-sig",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function reject(status: number, error: string, detail?: string): Response {
  return jsonResp({ error, ...(detail ? { detail } : {}) }, status);
}

async function logEvent(eventType: string, payload: Record<string, unknown>, errorMessage?: string) {
  try {
    await supabase.from("supabase.log_events").insert({
      event_type: eventType,
      payload,
      error_message: errorMessage || null,
    });
  } catch (err) {
    console.error("Failed to log event:", err);
  }
}

// ═══════════════════════════════════════════════════════════
// STRIPE SIGNATURE VERIFICATION
// ═══════════════════════════════════════════════════════════

async function verifyStripeSignature(body: string, signature: string): Promise<boolean> {
  try {
    const parts = signature.split(",");
    if (parts.length !== 2) return false;

    const tPart = parts.find((p) => p.startsWith("t="));
    const v1Part = parts.find((p) => p.startsWith("v1="));
    if (!tPart || !v1Part) return false;

    const timestamp = tPart.split("=")[1];
    const providedSignature = v1Part.split("=")[1];
    if (!timestamp || !providedSignature) return false;

    const payload = `${timestamp}.${body}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(STRIPE_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const hexBytes = providedSignature.match(/[\da-f]{2}/gi);
    if (!hexBytes) return false;
    const signatureBytes = new Uint8Array(hexBytes.map((x) => parseInt(x, 16)));

    return await crypto.subtle.verify("HMAC", key, signatureBytes, encoder.encode(payload));
  } catch (err) {
    console.error("Stripe signature verification error:", err);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// PAYPAL SIGNATURE VERIFICATION
// ═══════════════════════════════════════════════════════════

function getPayPalBaseUrl(): string {
  return PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function getPayPalAccessToken(): Promise<string> {
  const res = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return data.access_token;
}

async function verifyPayPalSignature(headers: Headers, body: string): Promise<boolean> {
  try {
    const transmissionId = headers.get("paypal-transmission-id");
    const certUrl = headers.get("paypal-cert-url");
    const authAlgo = headers.get("paypal-auth-algo");

    if (!transmissionId || !certUrl || !authAlgo) {
      console.error("Missing PayPal verification headers");
      return false;
    }

    if (PAYPAL_MODE === "sandbox") {
      console.log("PayPal sandbox mode: bypassing full signature verification");
      return true;
    }

    const accessToken = await getPayPalAccessToken();
    const verifyRes = await fetch(`${getPayPalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(body),
      }),
    });

    const result = await verifyRes.json();
    return result.verification_status === "SUCCESS";
  } catch (err) {
    console.error("PayPal signature verification error:", err);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// STRIPE WEBHOOK HANDLER
// ═══════════════════════════════════════════════════════════

async function handleStripeWebhook(body: string, sigHeader: string): Promise<Response> {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return reject(500, "webhook_secret_not_configured");
  }

  const isValid = await verifyStripeSignature(body, sigHeader);
  if (!isValid) {
    await logEvent("website_lead.stripe.signature_invalid", { body: body.substring(0, 500) });
    return reject(401, "invalid_signature");
  }

  const event = JSON.parse(body);
  console.log(`Stripe webhook received: ${event.type}`);

  if (event.type !== "checkout.session.completed") {
    return jsonResp({ received: true, skipped: true });
  }

  const session = event.data.object;
  const leadId = session.metadata?.lead_id;
  if (!leadId) {
    console.log("No lead_id in session metadata, skipping");
    return jsonResp({ received: true });
  }

  const stripeCustomerId = session.customer || null;
  const stripeChargeId = session.payment_intent || null;

  try {
    const { data: registration, error } = await supabase
      .rpc("archive_lead_and_create_registration", {
        p_lead_id: leadId,
        p_stripe_customer_id: stripeCustomerId,
        p_stripe_charge_id: stripeChargeId,
      });

    if (error) {
      console.error("archive_lead_and_create_registration failed:", error);
      await logEvent("website_lead.stripe.archive_failed", { lead_id: leadId, error: error.message });
      return reject(500, "archive_failed", error.message);
    }

    console.log(`Registration created: ${registration.id} from lead ${leadId}`);

    // Fire-and-forget: notify office desk
    try {
      const notifyUrl = `${SUPABASE_URL}/functions/v1/office-desk-notify`;
      fetch(notifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "X-EF-Caller": "website-lead-payment-webhook",
          "X-EF-Timestamp": String(Date.now()),
          "X-EF-Signature": "internal",
        },
        body: JSON.stringify({
          action: "new_registration",
          registration_id: registration.id,
          student_name: registration.student_name,
          student_email: registration.student_email,
          payment_status: "payment_received",
          payment_method: "stripe",
        }),
      }).catch((err) => console.error("Office desk notify failed (non-blocking):", err));
    } catch (err) {
      console.error("Office desk notify failed (non-blocking):", err);
    }

    return jsonResp({ received: true, registration_id: registration.id });
  } catch (err) {
    console.error("Webhook processing error:", err);
    await logEvent("website_lead.stripe.processing_error", { lead_id: leadId, error: String(err) });
    return reject(500, "processing_error");
  }
}

// ═══════════════════════════════════════════════════════════
// PAYPAL WEBHOOK HANDLER
// ═══════════════════════════════════════════════════════════

async function handlePayPalWebhook(req: Request, body: string): Promise<Response> {
  const isValid = await verifyPayPalSignature(req.headers, body);
  if (!isValid) {
    await logEvent("website_lead.paypal.signature_invalid", { body: body.substring(0, 500) });
    return reject(401, "invalid_signature");
  }

  const event = JSON.parse(body);
  const eventType = event.event_type as string;
  console.log(`PayPal webhook received: ${eventType}`);

  if (eventType !== "CHECKOUT.ORDER.COMPLETED") {
    return jsonResp({ received: true, skipped: true });
  }

  const order = event.resource;
  const orderId = order.id as string;
  const leadId = order.purchase_units?.[0]?.custom_id || order.purchase_units?.[0]?.reference_id;

  if (!leadId) {
    console.log("No lead_id in PayPal order, skipping");
    return jsonResp({ received: true });
  }

  const paypalTransactionId = order.purchase_units?.[0]?.payments?.captures?.[0]?.id || orderId;

  try {
    const { data: registration, error } = await supabase
      .rpc("archive_lead_and_create_registration", {
        p_lead_id: leadId,
        p_paypal_transaction_id: paypalTransactionId,
      });

    if (error) {
      console.error("archive_lead_and_create_registration failed:", error);
      await logEvent("website_lead.paypal.archive_failed", { lead_id: leadId, error: error.message });
      return reject(500, "archive_failed", error.message);
    }

    console.log(`Registration created: ${registration.id} from lead ${leadId} (PayPal)`);

    // Fire-and-forget: notify office desk
    try {
      const notifyUrl = `${SUPABASE_URL}/functions/v1/office-desk-notify`;
      fetch(notifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "X-EF-Caller": "website-lead-payment-webhook",
          "X-EF-Timestamp": String(Date.now()),
          "X-EF-Signature": "internal",
        },
        body: JSON.stringify({
          action: "new_registration",
          registration_id: registration.id,
          student_name: registration.student_name,
          student_email: registration.student_email,
          payment_status: "payment_received",
          payment_method: "paypal",
        }),
      }).catch((err) => console.error("Office desk notify failed (non-blocking):", err));
    } catch (err) {
      console.error("Office desk notify failed (non-blocking):", err);
    }

    return jsonResp({ received: true, registration_id: registration.id });
  } catch (err) {
    console.error("PayPal webhook processing error:", err);
    await logEvent("website_lead.paypal.processing_error", { lead_id: leadId, error: String(err) });
    return reject(500, "processing_error");
  }
}

// ═══════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reject(405, "method_not_allowed", "Only POST is accepted");

  const body = await req.text();

  // Stripe webhook
  const stripeSig = req.headers.get("stripe-signature");
  if (stripeSig) {
    return handleStripeWebhook(body, stripeSig);
  }

  // PayPal webhook
  const paypalSig = req.headers.get("paypal-transmission-sig");
  if (paypalSig) {
    return handlePayPalWebhook(req, body);
  }

  return reject(400, "missing_webhook_signature", "Expected stripe-signature or paypal-transmission-sig header");
});
