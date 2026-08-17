// retry-payment — Retry failed payment via Stripe/PayPal (Row 79)
// POST body: { payment_id, new_token? }
// Authenticated endpoint (JWT required, office/admin role)
// Retries failed payment with optional new token

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  // Verify JWT + office/admin role
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Missing authorization", { status: 401, headers: corsHeaders });

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, tenant_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) return new Response("Profile not found", { status: 404, headers: corsHeaders });
  if (!["office", "admin"].includes(profile.role)) {
    return new Response(
      JSON.stringify({ success: false, error: "Only office/admin can retry payments" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { payment_id, new_token } = body;
  if (!payment_id) {
    return new Response(
      JSON.stringify({ success: false, error: "payment_id is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Look up payment
  const { data: payment, error: payError } = await supabase
    .schema("office_desk")
    .from("payments")
    .select("id, tenant_id, invoice_id, amount, currency, payment_method, reference, status, paid_at")
    .eq("id", payment_id)
    .single();

  if (payError || !payment) {
    return new Response(
      JSON.stringify({ success: false, error: "Payment not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify tenant access
  if (payment.tenant_id !== profile.tenant_id && profile.role !== "admin") {
    return new Response(
      JSON.stringify({ success: false, error: "Access denied" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify status is failed
  if (payment.status !== "failed") {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Cannot retry payment with status '${payment.status}'`,
      }),
      { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Look up invoice for description + registration details
  let invoiceDesc = `Retry: payment ${payment.id.slice(0, 8)}`;
  let studentEmail = "";
  let studentName = "";

  if (payment.invoice_id) {
    const { data: invoice } = await supabase
      .schema("office_desk")
      .from("invoices")
      .select("id, description, registration_id")
      .eq("id", payment.invoice_id)
      .single();

    if (invoice) {
      invoiceDesc = invoice.description || invoiceDesc;
      if (invoice.registration_id) {
        const { data: reg } = await supabase
          .schema("office_desk")
          .from("registrations")
          .select("student_name, student_email")
          .eq("id", invoice.registration_id)
          .single();
        if (reg) {
          studentEmail = reg.student_email || "";
          studentName = reg.student_name || "";
        }
      }
    }
  }

  let newReference = payment.reference || "";
  let retrySuccess = false;

  // ─── STRIPE RETRY ───────────────────────────────────────
  if (payment.payment_method === "card") {
    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Stripe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new_token) {
      // Fresh charge with new token
      const amountCents = Math.round(payment.amount * 100);
      const params = new URLSearchParams({
        amount: String(amountCents),
        currency: (payment.currency || "zar").toLowerCase(),
        source: new_token as string,
        description: invoiceDesc,
        "metadata[payment_id]": payment.id,
        "metadata[tenant_id]": payment.tenant_id,
      });

      const chargeRes = await fetch("https://api.stripe.com/v1/charges", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!chargeRes.ok) {
        const err = await chargeRes.text();
        console.error("Stripe retry charge failed:", err);

        // Log to dead-letter
        await supabase.from("office_desk.failed_enrollments").insert({
          tenant_id: payment.tenant_id,
          registration_attempt: { payment_id: payment.id, retry: true },
          payment_attempt: { method: "stripe", new_token: "[REDACTED]" },
          error_code: "RETRY_FAILED",
          error_message: `Stripe retry failed: ${err.substring(0, 200)}`,
          payment_provider: "stripe",
        });

        return new Response(
          JSON.stringify({ success: false, error: "Stripe retry failed" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const charge = await chargeRes.json();
      newReference = charge.id;
      retrySuccess = true;
    } else {
      // No new token — check if we can retry the original PI
      // Stripe doesn't support retrying failed charges; need new token
      return new Response(
        JSON.stringify({
          success: false,
          error: "A new payment token is required to retry. Please re-enter card details.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // ─── PAYPAL RETRY ───────────────────────────────────────
  if (payment.payment_method === "paypal") {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
      return new Response(
        JSON.stringify({ success: false, error: "PayPal not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PayPal: create new order with same details
    const accessToken = await getPayPalAccessToken();

    const orderBody = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: payment.currency || "ZAR",
            value: payment.amount.toFixed(2),
          },
          description: invoiceDesc,
          custom_id: payment.id,
        },
      ],
      ...(studentEmail ? { payer: { email_address: studentEmail } } : {}),
      application_context: {
        brand_name: "VAS Studio",
        landing_page: "BILLING",
        user_action: "PAY_NOW",
      },
    };

    const orderRes = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(orderBody),
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      console.error("PayPal retry order failed:", err);

      await supabase.from("office_desk.failed_enrollments").insert({
        tenant_id: payment.tenant_id,
        registration_attempt: { payment_id: payment.id, retry: true },
        payment_attempt: { method: "paypal" },
        error_code: "RETRY_FAILED",
        error_message: `PayPal retry failed: ${err.substring(0, 200)}`,
        payment_provider: "paypal",
      });

      return new Response(
        JSON.stringify({ success: false, error: "PayPal retry failed" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const order = await orderRes.json();

    if (order.status === "APPROVED") {
      // Auto-capture
      const capRes = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${order.id}/capture`, {
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
          newReference = captured.purchase_units?.[0]?.payments?.captures?.[0]?.id || order.id;
          retrySuccess = true;
        }
      }
    }
  }

  if (!retrySuccess) {
    return new Response(
      JSON.stringify({ success: false, error: "Payment retry did not succeed" }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const now = new Date().toISOString();

  // Update payment status
  const { error: updateError } = await supabase
    .schema("office_desk")
    .from("payments")
    .update({
      status: "confirmed",
      reference: newReference,
      paid_at: now,
      updated_at: now,
    })
    .eq("id", payment.id);

  if (updateError) {
    console.error("Payment update failed:", updateError);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to update payment status" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update related invoice
  if (payment.invoice_id) {
    await supabase
      .schema("office_desk")
      .from("invoices")
      .update({
        status: "paid",
        amount_paid: payment.amount,
        paid_at: now,
        updated_at: now,
      })
      .eq("id", payment.invoice_id);
  }

  // Update registration status
  if (payment.invoice_id) {
    const { data: invoice } = await supabase
      .schema("office_desk")
      .from("invoices")
      .select("registration_id")
      .eq("id", payment.invoice_id)
      .single();

    if (invoice?.registration_id) {
      const { data: reg } = await supabase
        .schema("office_desk")
        .from("registrations")
        .select("status")
        .eq("id", invoice.registration_id)
        .single();

      if (reg?.status === "pending_init") {
        await supabase
          .schema("office_desk")
          .from("registrations")
          .update({ status: "pending_review", updated_at: now })
          .eq("id", invoice.registration_id);
      }
    }
  }

  // Send notification (non-blocking)
  try {
    const notifyUrl = `${SUPABASE_URL}/functions/v1/office-desk-notify`;
    fetch(notifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "X-EF-Caller": "retry-payment",
        "X-EF-Timestamp": String(Date.now()),
        "X-EF-Signature": "internal",
      },
      body: JSON.stringify({
        action: "payment_retried",
        payment_id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        new_reference: newReference,
        retried_by: user.id,
        tenant_id: payment.tenant_id,
      }),
    }).catch((err) => console.error("Notification failed (non-blocking):", err));
  } catch (err) {
    console.error("Notification failed (non-blocking):", err);
  }

  return new Response(
    JSON.stringify({
      success: true,
      payment: {
        id: payment.id,
        status: "confirmed",
        reference: newReference,
        paid_at: now,
      },
      message: "Payment retry successful",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
