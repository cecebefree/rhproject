// website-lead-to-registration — Row 81
// Dual-route Edge Function:
//   POST /website-lead-to-registration   — receive Lovable form, create lead + payment session
//   POST /website-lead-payment-webhook    — receive Stripe/PayPal webhook, archive lead + create registration
//
// verify_jwt = false (webhooks don't have JWT)
// Env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

// ═══════════════════════════════════════════════════════════
// ENV
// ═══════════════════════════════════════════════════════════

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID");
const PAYPAL_SECRET = Deno.env.get("PAYPAL_SECRET");
const PAYPAL_MODE = Deno.env.get("PAYPAL_MODE") || "sandbox";
const PAYPAL_WEBHOOK_ID = Deno.env.get("PAYPAL_WEBHOOK_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:5173";

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, paypal-transmission-sig",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

async function createStripeCheckoutSession(params: {
  leadId: string;
  email: string;
  firstName: string;
  lastName: string;
  childName: string;
  amount: number;
  currency: string;
}): Promise<{ sessionId: string; url: string } | { error: string }> {
  if (!STRIPE_SECRET_KEY) return { error: "Stripe not configured" };

  try {
    const form = new URLSearchParams();
    form.append("mode", "payment");
    form.append("customer_email", params.email);
    form.append("line_items[0][price_data][currency]", params.currency.toLowerCase());
    form.append("line_items[0][price_data][product_data][name]", `Registration: ${params.childName}`);
    form.append("line_items[0][price_data][product_data][description]", `Family registration for ${params.firstName} ${params.lastName} — child: ${params.childName}`);
    form.append("line_items[0][price_data][unit_amount]", String(Math.round(params.amount * 100)));
    form.append("line_items[0][quantity]", "1");
    form.append("success_url", `${SITE_URL}/registration/success?session_id={CHECKOUT_SESSION_ID}&lead_id=${params.leadId}`);
    form.append("cancel_url", `${SITE_URL}/registration/cancel?lead_id=${params.leadId}`);
    form.append("metadata[lead_id]", params.leadId);
    form.append("metadata[child_name]", params.childName);
    form.append("metadata[family_email]", params.email);
    form.append("payment_intent_data[metadata][lead_id]", params.leadId);

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

async function verifyPayPalSignature(headers: Headers, body: string): Promise<boolean> {
  try {
    const transmissionId = headers.get("paypal-transmission-id");
    const certUrl = headers.get("paypal-cert-url");
    const authAlgo = headers.get("paypal-auth-algo");

    if (!transmissionId || !certUrl || !authAlgo) {
      console.error("Missing PayPal verification headers");
      return false;
    }

    // Sandbox: bypass full verification
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

async function createPayPalOrder(params: {
  leadId: string;
  email: string;
  firstName: string;
  lastName: string;
  childName: string;
  amount: number;
  currency: string;
}): Promise<{ orderId: string; approveUrl: string } | { error: string }> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) return { error: "PayPal not configured" };

  try {
    const accessToken = await getPayPalAccessToken();

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
            reference_id: params.leadId,
            description: `Registration: ${params.childName}`,
            custom_id: params.leadId,
            amount: {
              currency_code: params.currency.toUpperCase(),
              value: String(params.amount.toFixed(2)),
            },
          },
        ],
        application_context: {
          brand_name: "Redhouse",
          landing_page: "BILLING",
          user_action: "PAY_NOW",
          return_url: `${SITE_URL}/registration/success?provider=paypal&lead_id=${params.leadId}`,
          cancel_url: `${SITE_URL}/registration/cancel?provider=paypal&lead_id=${params.leadId}`,
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

    return { orderId: order.id, url: approveUrl };
  } catch (err) {
    console.error("PayPal API error:", err);
    return { error: `PayPal API error: ${String(err)}` };
  }
}

// ═══════════════════════════════════════════════════════════
// ROUTE: POST /website-lead-to-registration
// ═══════════════════════════════════════════════════════════

async function handleSubmit(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) throw new Error();
  } catch {
    return reject(400, "invalid_json");
  }

  // Validate required fields
  const email = typeof body.family_email === "string" ? body.family_email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return reject(400, "invalid_family_email", "Valid family_email is required");
  }

  const familyFirstName = typeof body.family_first_name === "string" ? body.family_first_name.trim() : "";
  const familyLastName = typeof body.family_last_name === "string" ? body.family_last_name.trim() : "";
  if (!familyFirstName) {
    return reject(400, "family_first_name_required");
  }

  const childName = typeof body.child_name === "string" ? body.child_name.trim() : "";
  if (!childName) {
    return reject(400, "child_name_required");
  }

  const paymentMethod = typeof body.payment_method === "string" ? body.payment_method.trim().toLowerCase() : "";
  if (paymentMethod !== "stripe" && paymentMethod !== "paypal") {
    return reject(400, "invalid_payment_method", "payment_method must be 'stripe' or 'paypal'");
  }

  // Optional fields — pass through as-is
  const familyPhone = typeof body.family_phone === "string" ? body.family_phone.trim() : null;
  const familyRelation = typeof body.family_relation_to_child === "string" ? body.family_relation_to_child.trim() : null;
  const familyLanguage = typeof body.family_primary_language === "string" ? body.family_primary_language.trim() : null;
  const familyCurrency = typeof body.family_preferred_currency === "string" ? body.family_preferred_currency.trim() : "USD";
  const familyFaith = typeof body.family_primary_faith === "string" ? body.family_primary_faith.trim() : null;
  const childYob = typeof body.child_year_of_birth === "number" ? body.child_year_of_birth : null;
  const childCitizenship = typeof body.child_country_of_citizenship === "string" ? body.child_country_of_citizenship.trim() : null;
  const childResidency = typeof body.child_country_of_residency === "string" ? body.child_country_of_residency.trim() : null;
  const childCurriculum = typeof body.child_preferred_core_curriculum === "string" ? body.child_preferred_core_curriculum.trim() : null;
  const childGrade = typeof body.child_preferred_starting_grade === "string" ? body.child_preferred_starting_grade.trim() : null;
  const childYear = typeof body.child_preferred_starting_year === "number" ? body.child_preferred_starting_year : null;
  const intakeGroup = typeof body.child_intake_group === "string" ? body.child_intake_group.trim() : null;
  const zoneSelection = typeof body.zone_selection === "number" ? body.zone_selection : null;
  const turnstileToken = typeof body.turnstile_token === "string" ? body.turnstile_token.trim() : null;
  const ipAddress = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || null;

  // 1. Insert into website_leads
  const { data: lead, error: insertErr } = await supabase
    .from("website_leads")
    .insert({
      email,
      name: `${familyFirstName} ${familyLastName}`.trim(),
      family_first_name: familyFirstName,
      family_last_name: familyLastName,
      family_email: email,
      family_phone: familyPhone,
      family_relation_to_child: familyRelation,
      family_primary_language: familyLanguage,
      family_preferred_currency: familyCurrency,
      family_primary_faith: familyFaith,
      child_name: childName,
      child_year_of_birth: childYob,
      child_country_of_citizenship: childCitizenship,
      child_country_of_residency: childResidency,
      child_preferred_core_curriculum: childCurriculum,
      child_preferred_starting_grade: childGrade,
      child_preferred_starting_year: childYear,
      child_intake_group: intakeGroup,
      zone_selection: zoneSelection,
      payment_method: paymentMethod,
      turnstile_token: turnstileToken,
      ip_address: ipAddress,
      verified: true,
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("Lead insert failed:", insertErr);
    return reject(500, "lead_insert_failed", insertErr.message);
  }

  console.log(`Lead created: ${lead.id} (${email})`);

  // 2. Create payment session
  const defaultAmount = 50.00; // Registration fee — configurable via env or product catalog
  const currency = familyCurrency || "USD";

  let paymentResult: { url?: string; error?: string };

  if (paymentMethod === "stripe") {
    const result = await createStripeCheckoutSession({
      leadId: lead.id,
      email,
      firstName: familyFirstName,
      lastName: familyLastName,
      childName,
      amount: defaultAmount,
      currency,
    });
    if ("error" in result) {
      await logEvent("website_lead.stripe_session_failed", { lead_id: lead.id, error: result.error });
      return reject(502, "stripe_session_failed", result.error);
    }
    paymentResult = { url: result.url };
  } else {
    const result = await createPayPalOrder({
      leadId: lead.id,
      email,
      firstName: familyFirstName,
      lastName: familyLastName,
      childName,
      amount: defaultAmount,
      currency,
    });
    if ("error" in result) {
      await logEvent("website_lead.paypal_session_failed", { lead_id: lead.id, error: result.error });
      return reject(502, "paypal_session_failed", result.error);
    }
    paymentResult = { url: result.url };
  }

  // 3. Return payment link + registration lead ID
  return jsonResp({
    status: "success",
    lead_id: lead.id,
    payment_link: paymentResult.url,
    payment_method: paymentMethod,
  }, 201);
}

// ═══════════════════════════════════════════════════════════
// ROUTE: POST /website-lead-payment-webhook
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
          "X-EF-Caller": "website-lead-to-registration",
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

  // Extract PayPal transaction ID from capture
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
          "X-EF-Caller": "website-lead-to-registration",
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

async function handleWebhook(req: Request): Promise<Response> {
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
}

// ═══════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop() || "";

  // Route: POST /website-lead-payment-webhook
  if (req.method === "POST" && (path === "website-lead-payment-webhook" || path === "index.ts")) {
    // If path is index.ts, check the action field in body or default to submit
    if (path === "index.ts") {
      // Try to peek at body to determine action
      const clonedReq = req.clone();
      try {
        const peek = await clonedReq.json();
        if (peek.action === "webhook") {
          return handleWebhook(req);
        }
      } catch {
        // Not JSON or no action — fall through to submit
      }
      return handleSubmit(req);
    }
    return handleWebhook(req);
  }

  // Route: POST /website-lead-to-registration
  if (req.method === "POST" && (path === "website-lead-to-registration" || path === "" || path === "index.ts")) {
    return handleSubmit(req);
  }

  return reject(405, "method_not_allowed", `POST /website-lead-to-registration or POST /website-lead-payment-webhook`);
});
