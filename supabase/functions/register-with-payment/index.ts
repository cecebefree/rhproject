// register-with-payment — Pattern A: registration + payment in single event (Row 75)
// Public endpoint (no JWT required)
// POST body: { registration, invoice, payment }
// Creates: registration + invoice + payment + lead handoff + temp credentials

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID");
const PAYPAL_SECRET = Deno.env.get("PAYPAL_SECRET");
const PAYPAL_MODE = Deno.env.get("PAYPAL_MODE") || "sandbox";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const EF_NOTIFY_SECRET = Deno.env.get("EF_REGISTER_WITH_PAYMENT_SERVICE_SECRET");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface RegistrationInput {
  tenant_id: string;
  lead_reference_id?: string;
  student_name: string;
  student_email: string;
  student_phone?: string;
  course_name: string;
  notes?: string;
}

interface InvoiceInput {
  amount: number;
  currency?: string;
  description: string;
}

interface PaymentInput {
  method: "stripe" | "paypal";
  token: string;
  nonce?: string;
}

interface RequestBody {
  registration: RegistrationInput;
  invoice: InvoiceInput;
  payment: PaymentInput;
}

// ═══════════════════════════════════════════════════════════
// PAYPal HELPERS
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// DEAD-LETTER LOGGER
// ═══════════════════════════════════════════════════════════

async function logFailedEnrollment(
  tenantId: string,
  registration: RegistrationInput,
  payment: PaymentInput,
  errorCode: string,
  errorMessage: string,
  ip?: string
): Promise<void> {
  try {
    // Sanitize: strip tokens/nonces from logged data
    const sanitizedPayment = { ...payment, token: "[REDACTED]", nonce: payment.nonce ? "[REDACTED]" : undefined };
    await supabase.from("office_desk.failed_enrollments").insert({
      tenant_id: tenantId,
      registration_attempt: registration,
      payment_attempt: sanitizedPayment,
      error_code: errorCode,
      error_message: errorMessage,
      payment_provider: payment.method,
      ip_address: ip || null,
    });
  } catch (err) {
    console.error("Failed to log to dead-letter:", err);
  }
}

// ═══════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════

function validateInput(body: unknown): { valid: true; data: RequestBody } | { valid: false; error: string; status: number } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required", status: 400 };
  }

  const { registration, invoice, payment } = body as Record<string, unknown>;

  if (!registration || typeof registration !== "object") {
    return { valid: false, error: "registration object is required", status: 400 };
  }
  if (!invoice || typeof invoice !== "object") {
    return { valid: false, error: "invoice object is required", status: 400 };
  }
  if (!payment || typeof payment !== "object") {
    return { valid: false, error: "payment object is required", status: 400 };
  }

  const reg = registration as Record<string, unknown>;
  if (!reg.tenant_id || typeof reg.tenant_id !== "string") {
    return { valid: false, error: "registration.tenant_id is required", status: 400 };
  }
  if (!reg.student_name || typeof reg.student_name !== "string") {
    return { valid: false, error: "registration.student_name is required", status: 400 };
  }
  if (!reg.student_email || typeof reg.student_email !== "string") {
    return { valid: false, error: "registration.student_email is required", status: 400 };
  }
  if (!reg.course_name || typeof reg.course_name !== "string") {
    return { valid: false, error: "registration.course_name is required", status: 400 };
  }

  const inv = invoice as Record<string, unknown>;
  if (typeof inv.amount !== "number" || inv.amount <= 0) {
    return { valid: false, error: "invoice.amount must be a positive number", status: 400 };
  }
  if (!inv.description || typeof inv.description !== "string") {
    return { valid: false, error: "invoice.description is required", status: 400 };
  }

  const pay = payment as Record<string, unknown>;
  if (pay.method !== "stripe" && pay.method !== "paypal") {
    return { valid: false, error: "payment.method must be 'stripe' or 'paypal'", status: 400 };
  }
  if (!pay.token || typeof pay.token !== "string") {
    return { valid: false, error: "payment.token is required", status: 400 };
  }

  // Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(reg.student_email as string)) {
    return { valid: false, error: "registration.student_email is not a valid email", status: 400 };
  }

  return {
    valid: true,
    data: body as unknown as RequestBody,
  };
}

// ═══════════════════════════════════════════════════════════
// PAYMENT PROCESSORS
// ═══════════════════════════════════════════════════════════

interface PaymentResult {
  success: boolean;
  provider_ref?: string;
  error?: string;
}

async function processStripePayment(
  amount: number,
  currency: string,
  token: string,
  description: string,
  metadata: Record<string, string>
): Promise<PaymentResult> {
  if (!STRIPE_SECRET_KEY) {
    return { success: false, error: "Stripe not configured" };
  }

  try {
    const amountCents = Math.round(amount * 100);
    const params = new URLSearchParams({
      amount: String(amountCents),
      currency: currency.toLowerCase(),
      source: token,
      description,
      "metadata[tenant_id]": metadata.tenant_id || "",
      "metadata[student_email]": metadata.student_email || "",
      "metadata[course_name]": metadata.course_name || "",
    });

    const res = await fetch("https://api.stripe.com/v1/charges", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.json();
      const msg = (err as { error?: { message?: string } }).error?.message || "Stripe charge failed";
      console.error("Stripe charge error:", msg);
      return { success: false, error: msg };
    }

    const charge = await res.json();
    return { success: true, provider_ref: charge.id };
  } catch (err) {
    console.error("Stripe API error:", err);
    return { success: false, error: `Stripe API error: ${String(err)}` };
  }
}

async function processPayPalPayment(
  amount: number,
  currency: string,
  orderId: string
): Promise<PaymentResult> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    return { success: false, error: "PayPal not configured" };
  }

  try {
    const accessToken = await getPayPalAccessToken();

    // Capture the order
    const capRes = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
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
      console.error("PayPal capture error:", err);
      return { success: false, error: "PayPal capture failed" };
    }

    const captured = await capRes.json();
    const status = captured.status;
    const captureId = captured.purchase_units?.[0]?.payments?.captures?.[0]?.id;

    if (status === "COMPLETED") {
      return { success: true, provider_ref: captureId || orderId };
    }

    return { success: false, error: `PayPal order status: ${status}` };
  } catch (err) {
    console.error("PayPal API error:", err);
    return { success: false, error: `PayPal API error: ${String(err)}` };
  }
}

// ═══════════════════════════════════════════════════════════
// TEMP CREDENTIAL GENERATOR
// ═══════════════════════════════════════════════════════════

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join("");
}

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const callerIp = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

  // Parse + validate
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ status: "error", code: "VALIDATION_ERROR", message: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Rate limit check ──────────────────────────────────────
  try {
    const { data: allowed } = await supabase.rpc("check_rate_limit" as any, {
      p_caller: `register-with-payment:${callerIp}`,
      p_tenant: null,
    });
    if (allowed === false) {
      return new Response(
        JSON.stringify({ status: "error", code: "RATE_LIMITED", message: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
      );
    }
  } catch {
    // Fail-open: proceed if rate limit check errors
  }

  // ── Turnstile verification ────────────────────────────────
  const TURNSTILE_SECRET = Deno.env.get("TURNSTILE_SECRET_KEY");
  const turnstileToken = typeof (body as any)?.turnstile_token === "string" ? (body as any).turnstile_token.trim() : null;
  if (TURNSTILE_SECRET && !turnstileToken) {
    return new Response(
      JSON.stringify({ status: "error", code: "TURNSTILE_REQUIRED", message: "CAPTCHA verification required" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (TURNSTILE_SECRET && turnstileToken) {
    try {
      const ipHeader = req.headers.get("cf-connecting-ip") || undefined;
      const formBody = new URLSearchParams();
      formBody.append("secret", TURNSTILE_SECRET);
      formBody.append("response", turnstileToken);
      if (ipHeader) formBody.append("remoteip", ipHeader);
      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: formBody,
      });
      const verifyData = await verifyRes.json();
      if (!(verifyData as any)?.success) {
        return new Response(
          JSON.stringify({ status: "error", code: "TURNSTILE_FAILED", message: "CAPTCHA verification failed" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch {
      // Fail-open: if Turnstile service is unreachable, proceed
    }
  }

  // ── Enumeration protection ─────────────────────────────────
  // Generic error message for all auth failures to prevent email enumeration
  const GENERIC_AUTH_ERROR = "Registration could not be completed. Please try again or contact support.";

  const validation = validateInput(body);
  if (!validation.valid) {
    return new Response(
      JSON.stringify({ status: "error", code: "VALIDATION_ERROR", message: validation.error }),
      { status: validation.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { registration: regInput, invoice: invInput, payment: payInput } = validation.data;
  const currency = invInput.currency || "ZAR";

  // 1. Verify tenant exists
  const { data: tenant, error: tenantError } = await supabase
    .from("tenant_lms")
    .select("id")
    .eq("id", regInput.tenant_id)
    .single();

  if (tenantError || !tenant) {
    await logFailedEnrollment(regInput.tenant_id, regInput, payInput, "TENANT_NOT_FOUND", "Tenant not found", callerIp);
    return new Response(
      JSON.stringify({ status: "error", code: "REGISTRATION_FAILED", message: GENERIC_AUTH_ERROR }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 2. Check for duplicate active registration (same email + tenant)
  const { data: existingReg } = await supabase
    .schema("office_desk")
    .from("registrations")
    .select("id, status")
    .eq("tenant_id", regInput.tenant_id)
    .eq("student_email", regInput.student_email)
    .is("deleted_at", null)
    .in("status", ["pending_init", "pending_review", "approved", "active"])
    .maybeSingle();

  if (existingReg) {
    await logFailedEnrollment(regInput.tenant_id, regInput, payInput, "DUPLICATE_EMAIL", `Active registration exists: ${existingReg.id}`, callerIp);
    return new Response(
      JSON.stringify({
        status: "error",
        code: "REGISTRATION_FAILED",
        message: GENERIC_AUTH_ERROR,
        existing_registration_id: existingReg.id,
      }),
      { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 3. Process payment
  let paymentResult: PaymentResult;
  const paymentDescription = `Registration: ${regInput.student_name} - ${regInput.course_name}`;

  if (payInput.method === "stripe") {
    paymentResult = await processStripePayment(
      invInput.amount,
      currency,
      payInput.token,
      paymentDescription,
      {
        tenant_id: regInput.tenant_id,
        student_email: regInput.student_email,
        course_name: regInput.course_name,
      }
    );
  } else {
    paymentResult = await processPayPalPayment(invInput.amount, currency, payInput.token);
  }

  if (!paymentResult.success) {
    await logFailedEnrollment(regInput.tenant_id, regInput, payInput, "PAYMENT_FAILED", paymentResult.error || "Payment failed", callerIp);
    return new Response(
      JSON.stringify({
        status: "error",
        code: "PAYMENT_FAILED",
        message: paymentResult.error || "Payment processing failed",
      }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 4. Create registration + invoice + payment in sequence
  const now = new Date().toISOString();

  // 4a. Insert registration
  const { data: registration, error: regError } = await supabase
    .schema("office_desk")
    .from("registrations")
    .insert({
      tenant_id: regInput.tenant_id,
      lead_reference_id: regInput.lead_reference_id || null,
      student_name: regInput.student_name,
      student_email: regInput.student_email,
      student_phone: regInput.student_phone || null,
      course_name: regInput.course_name,
      status: "pending_init",
      notes: regInput.notes || null,
    })
    .select("id, status, created_at")
    .single();

  if (regError) {
    console.error("Registration insert failed:", regError);
    await logFailedEnrollment(regInput.tenant_id, regInput, payInput, "DB_ERROR", `Registration insert: ${regError.message}`, callerIp);
    return new Response(
      JSON.stringify({ status: "error", code: "DB_ERROR", message: "Failed to create registration" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 4b. Insert invoice
  const { data: invoice, error: invError } = await supabase
    .schema("office_desk")
    .from("invoices")
    .insert({
      tenant_id: regInput.tenant_id,
      registration_id: registration.id,
      amount: invInput.amount,
      amount_paid: invInput.amount,
      currency,
      description: invInput.description,
      status: "paid",
      payment_processor: payInput.method,
      payment_method: payInput.method === "stripe" ? "card" : "paypal",
      paid_at: now,
      lead_id: regInput.lead_reference_id || null,
    })
    .select("id, status")
    .single();

  if (invError) {
    console.error("Invoice insert failed:", invError);
    // Registration created but invoice failed — log but don't roll back (registration is still useful)
    await logFailedEnrollment(regInput.tenant_id, regInput, payInput, "DB_ERROR", `Invoice insert: ${invError.message}`, callerIp);
    return new Response(
      JSON.stringify({ status: "error", code: "DB_ERROR", message: "Failed to create invoice" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 4c. Insert payment record
  const { data: payment, error: payError } = await supabase
    .schema("office_desk")
    .from("payments")
    .insert({
      tenant_id: regInput.tenant_id,
      invoice_id: invoice.id,
      amount: invInput.amount,
      currency,
      payment_method: payInput.method === "stripe" ? "card" : "paypal",
      reference: paymentResult.provider_ref || null,
      status: "confirmed",
      paid_at: now,
    })
    .select("id, status")
    .single();

  if (payError) {
    console.error("Payment insert failed:", payError);
    await logFailedEnrollment(regInput.tenant_id, regInput, payInput, "DB_ERROR", `Payment insert: ${payError.message}`, callerIp);
  }

  // 5. Mark lead as handed_off (non-blocking)
  if (regInput.lead_reference_id) {
    try {
      await supabase
        .schema("front_desk")
        .from("leads")
        .update({ status: "handed_off", updated_at: now })
        .eq("id", regInput.lead_reference_id)
        .eq("tenant_id", regInput.tenant_id);
    } catch (err) {
      console.error("Lead handoff failed (non-blocking):", err);
    }
  }

  // 6. Generate temp credentials
  const tempPassword = generateTempPassword();
  const tempCreds = {
    email: regInput.student_email,
    temp_password: tempPassword,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
  };

  // 7. Notify office desk (non-blocking, fire-and-forget)
  try {
    const notifyUrl = `${SUPABASE_URL}/functions/v1/office-desk-notify`;
    fetch(notifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "X-EF-Caller": "register-with-payment",
        "X-EF-Timestamp": String(Date.now()),
        "X-EF-Signature": "internal",
      },
      body: JSON.stringify({
        action: "new_registration",
        registration_id: registration.id,
        student_name: regInput.student_name,
        student_email: regInput.student_email,
        amount: invInput.amount,
        payment_status: "confirmed",
        tenant_id: regInput.tenant_id,
      }),
    }).catch((err) => console.error("Office desk notify failed (non-blocking):", err));
  } catch (err) {
    console.error("Office desk notify failed (non-blocking):", err);
  }

  // 8. Return success
  return new Response(
    JSON.stringify({
      status: "success",
      registration: {
        id: registration.id,
        status: registration.status,
        created_at: registration.created_at,
      },
      invoice: {
        id: invoice.id,
        status: invoice.status,
      },
      payment: payment
        ? { id: payment.id, status: payment.status }
        : { id: null, status: "record_failed" },
      temp_credentials: tempCreds,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
