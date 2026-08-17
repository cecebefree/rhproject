// confirm-payment-manual — Manual payment confirmation by office/admin (Row 79)
// POST body: { payment_id, notes? }
// Authenticated endpoint (JWT required, office/admin role)
// Updates office_desk.payments status from pending → confirmed

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  // Verify caller is office or admin
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, tenant_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) return new Response("Profile not found", { status: 404, headers: corsHeaders });
  if (!["office", "admin"].includes(profile.role)) {
    return new Response(
      JSON.stringify({ success: false, error: "Only office/admin can confirm payments" }),
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

  const { payment_id, notes } = body;
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

  // Verify status is pending
  if (payment.status !== "pending") {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Cannot confirm payment with status '${payment.status}'`,
      }),
      { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const now = new Date().toISOString();

  // Update payment status
  const { error: updateError } = await supabase
    .schema("office_desk")
    .from("payments")
    .update({
      status: "confirmed",
      paid_at: payment.paid_at || now,
      updated_at: now,
    })
    .eq("id", payment.id);

  if (updateError) {
    console.error("Payment update failed:", updateError);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to update payment" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update related invoice status to 'paid'
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

  // Update registration status: pending_init → pending_review (Pattern A)
  // Or just confirm payment for Pattern B (registration already approved)
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
        "X-EF-Caller": "confirm-payment-manual",
        "X-EF-Timestamp": String(Date.now()),
        "X-EF-Signature": "internal",
      },
      body: JSON.stringify({
        action: "payment_confirmed",
        payment_id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        confirmed_by: user.id,
        tenant_id: payment.tenant_id,
        notes: notes || null,
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
        paid_at: payment.paid_at || now,
      },
      message: "Payment confirmed successfully",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
