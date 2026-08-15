// confirm-payment — Dual processor payment confirmation (Row 27)
// POST body: { invoice_id, processor, payment_intent_id (Stripe) or order_id (PayPal), payment_method_id? }
// Confirms payment and updates invoice status on success

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID");
const PAYPAL_SECRET = Deno.env.get("PAYPAL_SECRET");
const PAYPAL_MODE = Deno.env.get("PAYPAL_MODE") || "sandbox";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Missing authorization", { status: 401, headers: corsHeaders });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { invoice_id, processor, payment_intent_id, order_id, payment_method_id } = body;
  if (!invoice_id || !processor) {
    return new Response(
      JSON.stringify({ success: false, error: "invoice_id and processor are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify invoice exists
  const { data: invoice, error: invError } = await supabase
    .schema("office_desk")
    .from("invoices")
    .select("id, tenant_id, amount, amount_paid, status, stripe_payment_intent_id, paypal_order_id, payment_processor")
    .eq("id", invoice_id)
    .single();

  if (invError || !invoice) {
    return new Response(
      JSON.stringify({ success: false, error: "Invoice not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (invoice.status === "paid") {
    return new Response(
      JSON.stringify({ success: true, status: "paid", message: "Invoice already paid" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const now = new Date().toISOString();

  // ─── STRIPE ────────────────────────────────────────────
  if (processor === "stripe") {
    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "STRIPE_SECRET_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const piId = (payment_intent_id as string) || invoice.stripe_payment_intent_id;
    if (!piId) {
      return new Response(
        JSON.stringify({ success: false, error: "No Stripe payment intent ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const confirmParams: Record<string, string> = {};
    if (payment_method_id) confirmParams.payment_method = payment_method_id as string;

    const piRes = await fetch(`https://api.stripe.com/v1/payment_intents/${piId}/confirm`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: Object.keys(confirmParams).length > 0
        ? new URLSearchParams(confirmParams).toString()
        : undefined,
    });

    if (!piRes.ok) {
      const err = await piRes.text();
      console.error("Stripe confirm failed:", err);
      return new Response(
        JSON.stringify({ success: false, error: "Payment confirmation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pi = await piRes.json();

    if (pi.status === "succeeded") {
      const chargeId = pi.charges?.data?.[0]?.id || null;

      await supabase.schema("office_desk").from("invoices").update({
        status: "paid",
        amount_paid: invoice.amount,
        stripe_charge_id: chargeId,
        stripe_error_message: null,
        paid_at: now,
        updated_at: now,
      }).eq("id", invoice.id);

      return new Response(
        JSON.stringify({ success: true, processor: "stripe", status: "paid", paid_at: now, charge_id: chargeId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pi.status === "requires_action") {
      return new Response(
        JSON.stringify({ success: true, status: "requires_action", client_secret: pi.client_secret }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pi.status === "requires_payment_method") {
      await supabase.schema("office_desk").from("invoices").update({
        stripe_error_message: "Payment failed: invalid payment method",
        updated_at: now,
      }).eq("id", invoice.id);

      return new Response(
        JSON.stringify({ success: false, status: "requires_payment_method", error: "Payment failed: invalid payment method" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, status: pi.status, client_secret: pi.client_secret }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ─── PAYPAL ────────────────────────────────────────────
  if (processor === "paypal") {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
      return new Response(
        JSON.stringify({ success: false, error: "PayPal not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const oid = (order_id as string) || invoice.paypal_order_id;
    if (!oid) {
      return new Response(
        JSON.stringify({ success: false, error: "No PayPal order ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getPayPalAccessToken();

    const capRes = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${oid}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({}),
    });

    if (!capRes.ok) {
      const err = await capRes.text();
      console.error("PayPal capture failed:", err);
      return new Response(
        JSON.stringify({ success: false, error: "PayPal capture failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const captured = await capRes.json();
    const captureId = captured.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;
    const status = captured.status;

    if (status === "COMPLETED") {
      await supabase.schema("office_desk").from("invoices").update({
        status: "paid",
        amount_paid: invoice.amount,
        paypal_capture_id: captureId,
        paypal_error_message: null,
        paid_at: now,
        updated_at: now,
      }).eq("id", invoice.id);

      return new Response(
        JSON.stringify({ success: true, processor: "paypal", status: "paid", paid_at: now, capture_id: captureId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (status === "APPROVED") {
      return new Response(
        JSON.stringify({ success: true, processor: "paypal", status: "pending_capture" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.schema("office_desk").from("invoices").update({
      paypal_error_message: `PayPal capture failed: ${status}`,
      updated_at: now,
    }).eq("id", invoice.id);

    return new Response(
      JSON.stringify({ success: false, status, error: `PayPal order status: ${status}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: false, error: "Invalid processor" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
