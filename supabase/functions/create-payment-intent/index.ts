// create-payment-intent — Dual processor payment initiation (Row 27)
// POST body: { invoice_id, tenant_id, processor, payment_method }
// Routes to Stripe (card/ACH) or PayPal (checkout order)

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

  const { invoice_id, tenant_id, processor, payment_method } = body;
  if (!invoice_id || !tenant_id || !processor) {
    return new Response(
      JSON.stringify({ success: false, error: "invoice_id, tenant_id, and processor are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const method = (payment_method as string) || (processor === "paypal" ? "paypal" : "card");

  // Verify user belongs to tenant with office/admin role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return new Response(
      JSON.stringify({ success: false, error: "Profile not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (profile.tenant_id !== tenant_id) {
    return new Response(
      JSON.stringify({ success: false, error: "Access denied" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (!["office", "admin"].includes(profile.role)) {
    return new Response(
      JSON.stringify({ success: false, error: "Only office/admin users can process payments" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Look up invoice
  const { data: invoice, error: invError } = await supabase
    .schema("office_desk")
    .from("invoices")
    .select("id, tenant_id, amount, amount_paid, invoice_number, status, lead_id")
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
      JSON.stringify({ success: false, error: "Invoice is already paid" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Look up billing identity
  const { data: billingIdentity } = await supabase
    .schema("office_desk")
    .from("stripe_customers")
    .select("id, stripe_customer_id, paypal_customer_id, billing_email")
    .eq("tenant_id", tenant_id)
    .single();

  let billingEmail = billingIdentity?.billing_email;
  if (!billingEmail && invoice.lead_id) {
    const { data: lead } = await supabase
      .schema("front_desk")
      .from("leads")
      .select("email, name")
      .eq("id", invoice.lead_id)
      .single();
    billingEmail = lead?.email;
  }

  const amountDue = Math.max(0, (invoice.amount || 0) - (invoice.amount_paid || 0));
  const invoiceLabel = invoice.invoice_number || invoice_id.slice(0, 8);

  // ─── STRIPE ────────────────────────────────────────────
  if (processor === "stripe") {
    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "STRIPE_SECRET_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let stripeCustomerId = billingIdentity?.stripe_customer_id;

    if (!stripeCustomerId) {
      const customerParams = new URLSearchParams({
        "metadata[tenant_id]": tenant_id,
        name: `Tenant ${tenant_id.slice(0, 8)}`,
      });
      if (billingEmail) customerParams.set("email", billingEmail);

      const cRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: customerParams.toString(),
      });
      if (!cRes.ok) {
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create Stripe customer" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const customer = await cRes.json();
      stripeCustomerId = customer.id;
      await supabase.schema("office_desk").from("stripe_customers").upsert(
        { tenant_id, stripe_customer_id: stripeCustomerId, billing_email: billingEmail || null },
        { onConflict: "tenant_id" }
      );
    }

    const amountCents = Math.round(amountDue * 100);
    const piParams = new URLSearchParams({
      amount: String(amountCents),
      currency: "usd",
      customer: stripeCustomerId!,
      "payment_method_types[]": method === "ach" ? "us_bank_account" : "card",
      "metadata[invoice_id]": invoice_id,
      "metadata[tenant_id]": tenant_id,
      description: `Invoice ${invoiceLabel}`,
    });

    const piRes = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: piParams.toString(),
    });

    if (!piRes.ok) {
      const err = await piRes.text();
      console.error("Stripe PaymentIntent failed:", err);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create Stripe payment intent" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentIntent = await piRes.json();

    await supabase.schema("office_desk").from("invoices").update({
      stripe_payment_intent_id: paymentIntent.id,
      payment_processor: "stripe",
      payment_method: method,
      updated_at: new Date().toISOString(),
    }).eq("id", invoice_id);

    return new Response(
      JSON.stringify({
        success: true,
        processor: "stripe",
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: amountDue,
      }),
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

    const accessToken = await getPayPalAccessToken();

    const orderBody = {
      intent: "CAPTURE",
      purchase_units: [{
        amount: { currency_code: "USD", value: amountDue.toFixed(2) },
        description: `Invoice ${invoiceLabel}`,
        custom_id: invoice_id,
      }],
      ...(billingEmail ? { payer: { email_address: billingEmail } } : {}),
      application_context: {
        brand_name: "VAS Studio",
        landing_page: "BILLING",
        user_action: "PAY_NOW",
      },
    };

    const oRes = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(orderBody),
    });

    if (!oRes.ok) {
      const err = await oRes.text();
      console.error("PayPal order creation failed:", err);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create PayPal order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const order = await oRes.json();
    const approvalUrl = order.links?.find((l: { rel: string }) => l.rel === "approve")?.href;

    await supabase.schema("office_desk").from("invoices").update({
      paypal_order_id: order.id,
      payment_processor: "paypal",
      payment_method: "paypal",
      updated_at: new Date().toISOString(),
    }).eq("id", invoice_id);

    // Store PayPal customer if missing
    if (!billingIdentity?.paypal_customer_id && billingEmail) {
      await supabase.schema("office_desk").from("stripe_customers").upsert(
        { tenant_id, paypal_customer_id: billingEmail, billing_email: billingEmail },
        { onConflict: "tenant_id" }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        processor: "paypal",
        order_id: order.id,
        approval_url: approvalUrl,
        amount: amountDue,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: false, error: "Invalid processor. Use 'stripe' or 'paypal'." }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
