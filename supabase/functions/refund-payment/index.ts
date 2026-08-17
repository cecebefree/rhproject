// refund-payment — Refund confirmed payment via Stripe/PayPal (Row 79)
// POST body: { payment_id, refund_reason, refund_amount? }
// Authenticated endpoint (JWT required, office/admin role)
// Updates office_desk.payments status from confirmed → refunded

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
      JSON.stringify({ success: false, error: "Only office/admin can refund payments" }),
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

  const { payment_id, refund_reason, refund_amount } = body;
  if (!payment_id || !refund_reason) {
    return new Response(
      JSON.stringify({ success: false, error: "payment_id and refund_reason are required" }),
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

  // Verify status is confirmed
  if (payment.status !== "confirmed") {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Cannot refund payment with status '${payment.status}'`,
      }),
      { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify reference exists (charge/transaction ID)
  if (!payment.reference) {
    return new Response(
      JSON.stringify({ success: false, error: "No payment reference (charge ID) to refund" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const amountToRefund = (refund_amount as number) || payment.amount;
  let refundReference = "";

  // ─── STRIPE REFUND ──────────────────────────────────────
  if (payment.payment_method === "card") {
    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Stripe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amountCents = Math.round(amountToRefund * 100);
    const params = new URLSearchParams({
      charge: payment.reference,
      amount: String(amountCents),
      reason: "requested_by_customer",
    });

    const refundRes = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!refundRes.ok) {
      const err = await refundRes.text();
      console.error("Stripe refund failed:", err);
      return new Response(
        JSON.stringify({ success: false, error: "Stripe refund failed" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const refund = await refundRes.json();
    refundReference = refund.id;
  }

  // ─── PAYPAL REFUND ──────────────────────────────────────
  if (payment.payment_method === "paypal") {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
      return new Response(
        JSON.stringify({ success: false, error: "PayPal not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getPayPalAccessToken();

    const refundRes = await fetch(
      `${getPayPalBaseUrl()}/v2/payments/captures/${payment.reference}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: {
            value: amountToRefund.toFixed(2),
            currency_code: payment.currency || "ZAR",
          },
          note_to_payer: refund_reason,
        }),
      }
    );

    if (!refundRes.ok) {
      const err = await refundRes.text();
      console.error("PayPal refund failed:", err);
      return new Response(
        JSON.stringify({ success: false, error: "PayPal refund failed" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const refund = await refundRes.json();
    refundReference = refund.id;
  }

  const now = new Date().toISOString();

  // Update payment status
  const { error: updateError } = await supabase
    .schema("office_desk")
    .from("payments")
    .update({
      status: "refunded",
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

  // Update related invoice status
  if (payment.invoice_id) {
    await supabase
      .schema("office_desk")
      .from("invoices")
      .update({
        status: "cancelled",
        updated_at: now,
      })
      .eq("id", payment.invoice_id);
  }

  // Update registration status → withdrawn
  if (payment.invoice_id) {
    const { data: invoice } = await supabase
      .schema("office_desk")
      .from("invoices")
      .select("registration_id")
      .eq("id", payment.invoice_id)
      .single();

    if (invoice?.registration_id) {
      await supabase
        .schema("office_desk")
        .from("registrations")
        .update({ status: "withdrawn", updated_at: now })
        .eq("id", invoice.registration_id);
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
        "X-EF-Caller": "refund-payment",
        "X-EF-Timestamp": String(Date.now()),
        "X-EF-Signature": "internal",
      },
      body: JSON.stringify({
        action: "payment_refunded",
        payment_id: payment.id,
        amount: amountToRefund,
        currency: payment.currency,
        refund_reference: refundReference,
        refund_reason,
        refunded_by: user.id,
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
        status: "refunded",
        refund_reference: refundReference,
      },
      message: "Refund processed successfully",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
