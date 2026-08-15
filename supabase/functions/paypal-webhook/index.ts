// paypal-webhook — Handle PayPal webhook events for invoice + subscription payments (Row 27)
// Validates X-Paypal-Transmission-Sig, processes order and subscription events

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYPAL_WEBHOOK_ID = Deno.env.get("PAYPAL_WEBHOOK_ID");
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID");
const PAYPAL_SECRET = Deno.env.get("PAYPAL_SECRET");
const PAYPAL_MODE = Deno.env.get("PAYPAL_MODE") || "sandbox";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, paypal-transmission-sig, paypal-transmission-id, paypal-cert-url, paypal-auth-algo, paypal-live-mode",
};

function getPayPalBaseUrl(): string {
  return PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
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

async function verifyPayPalSignature(headers: Headers, body: string): Promise<boolean> {
  try {
    const transmissionId = headers.get("paypal-transmission-id");
    const certUrl = headers.get("paypal-cert-url");
    const authAlgo = headers.get("paypal-auth-algo");
    const liveMode = headers.get("paypal-live-mode");

    if (!transmissionId || !certUrl || !authAlgo) {
      console.error("Missing PayPal verification headers");
      return false;
    }

    // In production: verify with PayPal's webhook verification API
    // POST https://api-m.paypal.com/v1/notifications/verify-webhook-signature
    // For sandbox/development, allow through with header presence check
    if (PAYPAL_MODE === "sandbox") {
      console.log("PayPal sandbox mode: bypassing full signature verification");
      return true;
    }

    // Production: verify via PayPal API
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
// CHECKOUT.ORDER.COMPLETED — mark invoice as paid
// ═══════════════════════════════════════════════════════════
async function handleOrderCompleted(order: Record<string, unknown>) {
  const orderId = order.id as string;
  const captureId = (order as { purchase_units?: Array<{ payments?: { captures?: Array<{ id: string }> }> }>)
    .purchase_units?.[0]?.payments?.captures?.[0]?.id || null;

  console.log(`CHECKOUT.ORDER.COMPLETED: ${orderId}`);

  const { data: invoice, error: lookupError } = await supabase
    .schema("office_desk")
    .from("invoices")
    .select("id, amount, status")
    .eq("paypal_order_id", orderId)
    .single();

  if (lookupError || !invoice) {
    console.error("Invoice not found for PayPal order:", orderId);
    await logWebhookEvent("CHECKOUT.ORDER.COMPLETED", order, "Invoice not found");
    return { id: orderId, status: "SUCCESS" };
  }

  if (invoice.status === "paid") {
    console.log(`Invoice ${invoice.id} already paid, skipping`);
    return { id: orderId, status: "SUCCESS" };
  }

  const { error: updateError } = await supabase
    .schema("office_desk")
    .from("invoices")
    .update({
      status: "paid",
      amount_paid: invoice.amount,
      paypal_capture_id: captureId,
      paid_at: new Date().toISOString(),
      paypal_error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoice.id);

  if (updateError) {
    console.error("Invoice update failed:", updateError);
    await logWebhookEvent("CHECKOUT.ORDER.COMPLETED", order, updateError.message);
  } else {
    console.log(`Invoice ${invoice.id} marked as paid via PayPal`);
  }

  return { id: orderId, status: "SUCCESS" };
}

// ═══════════════════════════════════════════════════════════
// CHECKOUT.ORDER.APPROVED — auto-capture if possible
// ═══════════════════════════════════════════════════════════
async function handleOrderApproved(order: Record<string, unknown>) {
  const orderId = order.id as string;
  console.log(`CHECKOUT.ORDER.APPROVED: ${orderId}`);

  const { data: invoice } = await supabase
    .schema("office_desk")
    .from("invoices")
    .select("id, status")
    .eq("paypal_order_id", orderId)
    .single();

  if (!invoice || invoice.status === "paid") {
    return { id: orderId, status: "SUCCESS" };
  }

  // Auto-capture
  try {
    const accessToken = await getPayPalAccessToken();
    const capRes = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({}),
    });

    if (capRes.ok) {
      const captured = await capRes.json();
      if (captured.status === "COMPLETED") {
        const captureId = captured.purchase_units?.[0]?.payments?.captures?.[0]?.id;
        await supabase.schema("office_desk").from("invoices").update({
          status: "paid",
          paypal_capture_id: captureId,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", invoice.id);
      }
    }
  } catch (err) {
    console.error("Auto-capture failed:", err);
  }

  return { id: orderId, status: "SUCCESS" };
}

// ═══════════════════════════════════════════════════════════
// PAYMENT.CAPTURE.FAILED — record error
// ═══════════════════════════════════════════════════════════
async function handleCaptureFailed(capture: Record<string, unknown>) {
  const captureId = capture.id as string;
  const reason = (capture as { reason_details?: { reason?: string } }).reason_details?.reason || "Capture failed";

  console.log(`PAYMENT.CAPTURE.FAILED: ${captureId}`);

  const { error } = await supabase
    .schema("office_desk")
    .from("invoices")
    .update({
      paypal_error_message: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("paypal_capture_id", captureId);

  if (error) console.error("Invoice error update failed:", error);

  return { id: captureId, status: "SUCCESS" };
}

// ═══════════════════════════════════════════════════════════
// BILLING.SUBSCRIPTION events — track PayPal subscriptions
// ═══════════════════════════════════════════════════════════
async function handleBillingSubscriptionEvent(sub: Record<string, unknown>, eventType: string) {
  const subId = sub.id as string;
  const planId = (sub as { plan_id?: string }).plan_id;
  const status = sub.status as string;

  console.log(`${eventType}: ${subId} (status: ${status})`);

  // Try to find tenant from custom_id or subscriber
  const customId = (sub as { custom_id?: string }).custom_id;
  const subscriber = (sub as { subscriber?: { email_address?: string } }).subscriber;
  const billingEmail = subscriber?.email_address;

  // Look up tenant from stripe_customers by billing_email
  let tenantId = customId;
  if (!tenantId && billingEmail) {
    const { data: sc } = await supabase
      .schema("office_desk")
      .from("stripe_customers")
      .select("tenant_id")
      .eq("billing_email", billingEmail)
      .single();
    tenantId = sc?.tenant_id;
  }

  if (!tenantId) {
    console.log("Could not resolve tenant for PayPal subscription:", subId);
    return { id: subId, status: "SUCCESS" };
  }

  const planMapping: Record<string, string> = {};
  const amountMonthly = 0;

  if (eventType === "BILLING.SUBSCRIPTION.CREATED") {
    const { error } = await supabase.schema("office_desk").from("subscriptions").insert({
      tenant_id: tenantId,
      paypal_plan_id: planId,
      processor: "paypal",
      plan_id: planMapping[planId] || "starter",
      status: status === "ACTIVE" ? "active" : "unpaid",
      amount_monthly: amountMonthly,
      billing_interval: "month",
    });
    if (error) console.error("PayPal subscription insert failed:", error);
  } else if (eventType === "BILLING.SUBSCRIPTION.UPDATED") {
    const { error } = await supabase.schema("office_desk").from("subscriptions").update({
      status: status === "ACTIVE" ? "active" : status === "CANCELLED" ? "cancelled" : "unpaid",
      updated_at: new Date().toISOString(),
    }).eq("paypal_plan_id", planId || "");
    if (error) console.error("PayPal subscription update failed:", error);
  } else if (eventType === "BILLING.SUBSCRIPTION.CANCELLED") {
    const { error } = await supabase.schema("office_desk").from("subscriptions").update({
      status: "cancelled",
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    }).eq("paypal_plan_id", planId || "");
    if (error) console.error("PayPal subscription cancel failed:", error);
  }

  return { id: subId, status: "SUCCESS" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  if (!PAYPAL_WEBHOOK_ID) {
    console.error("PAYPAL_WEBHOOK_ID not configured");
    return new Response("Webhook ID not configured", { status: 500, headers: corsHeaders });
  }

  const body = await req.text();

  const isValid = await verifyPayPalSignature(req.headers, body);
  if (!isValid) {
    await logWebhookEvent("paypal.webhook.signature_invalid", { body: body.substring(0, 500) }, "Invalid signature");
    return new Response("Invalid signature", { status: 401, headers: corsHeaders });
  }

  const event = JSON.parse(body);
  const eventType = event.event_type as string;
  console.log(`PayPal webhook received: ${eventType}`);

  try {
    switch (eventType) {
      case "CHECKOUT.ORDER.COMPLETED":
        return new Response(JSON.stringify(await handleOrderCompleted(event.resource)), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "CHECKOUT.ORDER.APPROVED":
        return new Response(JSON.stringify(await handleOrderApproved(event.resource)), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "PAYMENT.CAPTURE.FAILED":
        return new Response(JSON.stringify(await handleCaptureFailed(event.resource)), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "BILLING.SUBSCRIPTION.CREATED":
      case "BILLING.SUBSCRIPTION.UPDATED":
      case "BILLING.SUBSCRIPTION.CANCELLED":
        return new Response(JSON.stringify(await handleBillingSubscriptionEvent(event.resource, eventType)), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      default:
        return new Response(JSON.stringify({ id: event.id, status: "SUCCESS" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    console.error("PayPal webhook processing error:", err);
    await logWebhookEvent(eventType, event.resource, String(err));
    return new Response("Internal server error", { status: 500, headers: corsHeaders });
  }
});
