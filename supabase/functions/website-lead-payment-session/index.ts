// website-lead-payment-session — Row 91
// Payment capture logic: Stripe session creation + PayPal order creation
//
// POST /website-lead-payment-session
// Creates a Stripe Checkout Session or PayPal Order and returns the redirect URL.
//
// verify_jwt = false (public form submission)
// Env vars: STRIPE_SECRET_KEY, PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_MODE, SITE_URL

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════
// ENV
// ═══════════════════════════════════════════════════════════

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID");
const PAYPAL_SECRET = Deno.env.get("PAYPAL_SECRET");
const PAYPAL_MODE = Deno.env.get("PAYPAL_MODE") || "sandbox";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:5173";

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

type PaymentMethod = "stripe" | "paypal";

interface PaymentSessionRequest {
  family_email: string;
  child_name: string;
  child_dob: string;
  amount_cents: number;
  payment_method: PaymentMethod;
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

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
// STRIPE HELPERS
// ═══════════════════════════════════════════════════════════

async function createStripeCheckoutSession(params: {
  email: string;
  childName: string;
  childDob: string;
  amountCents: number;
  currency: string;
  leadId?: string;
}): Promise<{ sessionId: string; url: string } | { error: string }> {
  if (!STRIPE_SECRET_KEY) return { error: "Stripe not configured" };

  try {
    const form = new URLSearchParams();
    form.append("mode", "payment");
    form.append("customer_email", params.email);
    form.append("line_items[0][price_data][currency]", params.currency.toLowerCase());
    form.append("line_items[0][price_data][product_data][name]", `Registration: ${params.childName}`);
    form.append(
      "line_items[0][price_data][product_data][description]",
      `Registration for ${params.childName} (DOB: ${params.childDob})`
    );
    form.append("line_items[0][price_data][unit_amount]", String(params.amountCents));
    form.append("line_items[0][quantity]", "1");
    const successUrl = params.leadId
      ? `${SITE_URL}/register/success?session_id={CHECKOUT_SESSION_ID}&lead_id=${params.leadId}`
      : `${SITE_URL}/register/success?session_id={CHECKOUT_SESSION_ID}`;
    form.append("success_url", successUrl);
    form.append("cancel_url", `${SITE_URL}/register/cancel`);

    if (params.leadId) {
      form.append("metadata[lead_id]", params.leadId);
      form.append("payment_intent_data[metadata][lead_id]", params.leadId);
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    if (!res.ok) {
      const err = await res.json();
      const msg = (err as { error?: { message?: string } }).error?.message || "Stripe session creation failed";
      console.error("Stripe session error:", msg);
      return { error: msg };
    }

    const session = await res.json();
    return { sessionId: session.id, url: session.url };
  } catch (err) {
    console.error("Stripe API error:", err);
    return { error: `Stripe API error: ${String(err)}` };
  }
}

// ═══════════════════════════════════════════════════════════
// PAYPAL HELPERS
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

async function createPayPalOrder(params: {
  email: string;
  childName: string;
  childDob: string;
  amountCents: number;
  currency: string;
  leadId?: string;
}): Promise<{ orderId: string; approveUrl: string } | { error: string }> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) return { error: "PayPal not configured" };

  try {
    const accessToken = await getPayPalAccessToken();
    const amountValue = (params.amountCents / 100).toFixed(2);

    const orderRes = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: params.leadId || `lead_${Date.now()}`,
            description: `Registration: ${params.childName}`,
            custom_id: params.leadId || "",
            amount: {
              currency_code: params.currency.toUpperCase(),
              value: amountValue,
            },
          },
        ],
        application_context: {
          brand_name: "Redhouse",
          landing_page: "BILLING",
          user_action: "PAY_NOW",
          return_url: `${SITE_URL}/register/success?provider=paypal${params.leadId ? `&lead_id=${params.leadId}` : ""}`,
          cancel_url: `${SITE_URL}/register/cancel?provider=paypal`,
        },
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      console.error("PayPal order error:", err);
      return { error: "PayPal order creation failed" };
    }

    const order = await orderRes.json();
    const approveUrl = order.links?.find((l: { rel: string }) => l.rel === "approve")?.href;

    if (!approveUrl) return { error: "No approve URL in PayPal response" };

    return { orderId: order.id, approveUrl };
  } catch (err) {
    console.error("PayPal API error:", err);
    return { error: `PayPal API error: ${String(err)}` };
  }
}

// ═══════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════

function validateInput(body: Record<string, unknown>): {
  valid: true;
  data: PaymentSessionRequest;
} | { valid: false; response: Response } {
  const email = typeof body.family_email === "string" ? body.family_email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, response: reject(400, "invalid_family_email", "Valid family_email is required") };
  }

  const childName = typeof body.child_name === "string" ? body.child_name.trim() : "";
  if (!childName) {
    return { valid: false, response: reject(400, "child_name_required") };
  }

  const childDob = typeof body.child_dob === "string" ? body.child_dob.trim() : "";
  if (!childDob) {
    return { valid: false, response: reject(400, "child_dob_required") };
  }

  const amountCents = typeof body.amount_cents === "number" ? body.amount_cents : NaN;
  if (isNaN(amountCents) || !Number.isInteger(amountCents) || amountCents <= 0) {
    return { valid: false, response: reject(400, "invalid_amount_cents", "amount_cents must be a positive integer") };
  }

  const paymentMethod = typeof body.payment_method === "string" ? body.payment_method.trim().toLowerCase() : "";
  if (paymentMethod !== "stripe" && paymentMethod !== "paypal") {
    return { valid: false, response: reject(400, "invalid_payment_method", "payment_method must be 'stripe' or 'paypal'") };
  }

  return {
    valid: true,
    data: {
      family_email: email,
      child_name: childName,
      child_dob: childDob,
      amount_cents: amountCents,
      payment_method: paymentMethod as PaymentMethod,
    },
  };
}

// ═══════════════════════════════════════════════════════════
// ROUTE: POST /website-lead-payment-session
// ═══════════════════════════════════════════════════════════

async function handleCreateSession(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) throw new Error();
  } catch {
    return reject(400, "invalid_json");
  }

  const validation = validateInput(body);
  if (!validation.valid) return validation.response;

  const { family_email, child_name, child_dob, amount_cents, payment_method } = validation.data;

  const currency = typeof body.family_preferred_currency === "string"
    ? body.family_preferred_currency.trim().toUpperCase()
    : "USD";

  // Resolve tenant (first active tenant)
  const { data: tenant } = await supabase
    .schema("public")
    .from("tenant_devotional")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .single();

  const tenantId = tenant?.id;

  // Save lead to front_desk.leads before creating payment session
  let leadId: string | undefined;
  if (tenantId) {
    const { data: lead, error: leadError } = await supabase
      .schema("front_desk")
      .from("leads")
      .insert({
        tenant_id: tenantId,
        name: child_name,
        email: family_email,
        source: "Registration Form",
        source_type: "registration_form",
        status: "enquiry",
        notes: `Registration for ${child_name} (DOB: ${child_dob}). Fee: $${(amount_cents / 100).toFixed(2)} ${currency}. Payment: ${payment_method}`,
        tags: ["Registration", payment_method === "stripe" ? "Stripe" : "PayPal"],
      })
      .select("id")
      .single();

    if (!leadError && lead) {
      leadId = lead.id;
    } else {
      console.error("Failed to save lead:", leadError);
      // Continue with payment session even if lead save fails
    }
  }

  let result: { url?: string; error?: string };

  if (payment_method === "stripe") {
    const stripeResult = await createStripeCheckoutSession({
      email: family_email,
      childName: child_name,
      childDob: child_dob,
      amountCents: amount_cents,
      currency,
      leadId,
    });
    if ("error" in stripeResult) {
      await logEvent("website_lead_payment_session.stripe_failed", {
        family_email,
        child_name,
        error: stripeResult.error,
      });
      return reject(502, "stripe_session_failed", stripeResult.error);
    }
    result = { url: stripeResult.url };
  } else {
    const paypalResult = await createPayPalOrder({
      email: family_email,
      childName: child_name,
      childDob: child_dob,
      amountCents: amount_cents,
      currency,
      leadId,
    });
    if ("error" in paypalResult) {
      await logEvent("website_lead_payment_session.paypal_failed", {
        family_email,
        child_name,
        error: paypalResult.error,
      });
      return reject(502, "paypal_order_failed", paypalResult.error);
    }
    result = { url: paypalResult.approveUrl };
  }

  await logEvent("website_lead_payment_session.created", {
    family_email,
    child_name,
    payment_method,
    amount_cents,
    lead_id: leadId,
  });

  return jsonResp({
    status: "success",
    redirect_url: result.url,
    payment_method,
    lead_id: leadId,
  });
}

// ═══════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reject(405, "method_not_allowed", "Only POST is accepted");

  return handleCreateSession(req);
});
