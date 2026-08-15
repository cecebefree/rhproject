// stripe-webhook — Handle Stripe webhook events for invoice + subscription payments (Row 27)
// Validates X-Stripe-Signature, processes payment_intent and subscription events

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

async function logWebhookEvent(eventType: string, payload: Record<string, unknown>, errorMessage?: string) {
  try {
    await supabase.from("supabase.log_events").insert({
      event_type: eventType,
      payload,
      error_message: errorMessage || null,
    });
  } catch (err) {
    console.error("Failed to log webhook event:", err);
  }
}

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
    console.error("Signature verification error:", err);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// PAYMENT_INTENT.SUCCEEDED — mark invoice as paid
// ═══════════════════════════════════════════════════════════
async function handlePaymentIntentSucceeded(pi: Record<string, unknown>) {
  const piId = pi.id as string;
  const charges = pi.charges as { data?: Array<{ id: string }> } | undefined;
  const chargeId = charges?.data?.[0]?.id || null;

  console.log(`payment_intent.succeeded: ${piId}`);

  const { data: invoice, error: lookupError } = await supabase
    .schema("office_desk")
    .from("invoices")
    .select("id, amount, status")
    .eq("stripe_payment_intent_id", piId)
    .single();

  if (lookupError || !invoice) {
    console.error("Invoice not found for PI:", piId);
    await logWebhookEvent("payment_intent.succeeded", pi, "Invoice not found");
    return { received: true };
  }

  if (invoice.status === "paid") {
    console.log(`Invoice ${invoice.id} already paid, skipping`);
    return { received: true, alreadyProcessed: true };
  }

  const { error: updateError } = await supabase
    .schema("office_desk")
    .from("invoices")
    .update({
      status: "paid",
      amount_paid: invoice.amount,
      stripe_charge_id: chargeId,
      paid_at: new Date().toISOString(),
      stripe_error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoice.id);

  if (updateError) {
    console.error("Invoice update failed:", updateError);
    await logWebhookEvent("payment_intent.succeeded", pi, updateError.message);
  } else {
    console.log(`Invoice ${invoice.id} marked as paid`);
  }

  return { received: true };
}

// ═══════════════════════════════════════════════════════════
// PAYMENT_INTENT.PAYMENT_FAILED — record error on invoice
// ═══════════════════════════════════════════════════════════
async function handlePaymentIntentFailed(pi: Record<string, unknown>) {
  const piId = pi.id as string;
  const lastError = pi.last_payment_error as { message?: string } | undefined;
  const errorMessage = lastError?.message || "Payment failed";

  console.log(`payment_intent.payment_failed: ${piId}`);

  const { error } = await supabase
    .schema("office_desk")
    .from("invoices")
    .update({
      stripe_error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", piId);

  if (error) console.error("Invoice error update failed:", error);

  return { received: true };
}

// ═══════════════════════════════════════════════════════════
// SUBSCRIPTION events — track tenant subscriptions
// ═══════════════════════════════════════════════════════════
async function handleSubscriptionEvent(sub: Record<string, unknown>, eventType: string) {
  const subId = sub.id as string;
  const metadata = sub.metadata as Record<string, string> | undefined;
  const tenantId = metadata?.tenant_id;
  const planId = metadata?.plan_id || "starter";
  const status = sub.status as string;
  const currentPeriodStart = sub.current_period_start as number;
  const currentPeriodEnd = sub.current_period_end as number;
  const cancelAtPeriodEnd = sub.cancel_at_period_end as boolean;

  console.log(`${eventType}: ${subId} (tenant: ${tenantId}, status: ${status})`);

  if (!tenantId) {
    console.log("No tenant_id in subscription metadata, skipping");
    return { received: true };
  }

  const amountMonthly = ((sub.items?.data?.[0]?.price?.unit_amount as number) || 0) / 100;

  if (eventType === "customer.subscription.created") {
    const { error } = await supabase.schema("office_desk").from("subscriptions").insert({
      tenant_id: tenantId,
      stripe_subscription_id: subId,
      processor: "stripe",
      plan_id: planId,
      status: status === "active" ? "active" : status === "past_due" ? "past_due" : "unpaid",
      amount_monthly: amountMonthly,
      billing_interval: (sub.items?.data?.[0]?.price?.recurring?.interval as string) || "month",
      current_period_start: currentPeriodStart ? new Date(currentPeriodStart * 1000).toISOString() : null,
      current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
      cancel_at_period_end: cancelAtPeriodEnd || false,
    });
    if (error) console.error("Subscription insert failed:", error);
  } else if (eventType === "customer.subscription.updated") {
    const { error } = await supabase.schema("office_desk").from("subscriptions").update({
      status: status === "active" ? "active" : status === "past_due" ? "past_due" : status === "canceled" ? "cancelled" : "unpaid",
      current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
      cancel_at_period_end: cancelAtPeriodEnd || false,
      updated_at: new Date().toISOString(),
    }).eq("stripe_subscription_id", subId);
    if (error) console.error("Subscription update failed:", error);
  } else if (eventType === "customer.subscription.deleted") {
    const { error } = await supabase.schema("office_desk").from("subscriptions").update({
      status: "cancelled",
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    }).eq("stripe_subscription_id", subId);
    if (error) console.error("Subscription cancel failed:", error);
  }

  return { received: true };
}

// ═══════════════════════════════════════════════════════════
// CHECKOUT.SESSION.COMPLETED — legacy payment_requests flow
// ═══════════════════════════════════════════════════════════
async function handleCheckoutSessionCompleted(session: Record<string, unknown>) {
  const sessionId = session.id as string;
  const paymentIntent = session.payment_intent as string | null;
  const amountTotal = session.amount_total as number | null;
  const currency = session.currency as string | null;

  const { data: existingRequest } = await supabase
    .from("school_desk.payment_requests")
    .select("id, status, registration_id, tenant_id")
    .eq("stripe_session_id", sessionId)
    .single();

  if (!existingRequest || existingRequest.status === "paid") {
    return { received: true };
  }

  await supabase.from("school_desk.payment_requests").update({
    status: "paid",
    paid_at: new Date().toISOString(),
    stripe_payment_id: paymentIntent,
  }).eq("id", existingRequest.id);

  if (existingRequest.registration_id) {
    await supabase.from("office_desk.registrations").update({
      status: "active",
      payment_attached_at: new Date().toISOString(),
      stripe_charge_id: paymentIntent,
    }).eq("id", existingRequest.registration_id);
  }

  return { received: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400, headers: corsHeaders });
  }

  const body = await req.text();

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { status: 500, headers: corsHeaders });
  }

  const isValid = await verifyStripeSignature(body, signature);
  if (!isValid) {
    await logWebhookEvent("stripe.webhook.signature_invalid", { body: body.substring(0, 500) }, "Invalid signature");
    return new Response("Invalid signature", { status: 401, headers: corsHeaders });
  }

  const event = JSON.parse(body);
  console.log(`Webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        return new Response(JSON.stringify(await handlePaymentIntentSucceeded(event.data.object)), { status: 200, headers: corsHeaders });

      case "payment_intent.payment_failed":
        return new Response(JSON.stringify(await handlePaymentIntentFailed(event.data.object)), { status: 200, headers: corsHeaders });

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        return new Response(JSON.stringify(await handleSubscriptionEvent(event.data.object, event.type)), { status: 200, headers: corsHeaders });

      case "checkout.session.completed":
        return new Response(JSON.stringify(await handleCheckoutSessionCompleted(event.data.object)), { status: 200, headers: corsHeaders });

      default:
        return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    await logWebhookEvent(event.type, event.data.object, String(err));
    return new Response("Internal server error", { status: 500, headers: corsHeaders });
  }
});
