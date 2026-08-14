// create-payment-session — Stripe Checkout Session creation (Row 72)
// POST /v1/checkout/sessions via Stripe API
// Input: registration_id, amount, currency, description
// Output: { session_id, payment_url }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const APP_URL = Deno.env.get("APP_URL") || "http://localhost:5173";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface PaymentRequestInput {
  registration_id: string;
  amount: number;
  currency: string;
  description?: string;
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  // Validate Stripe key
  if (!STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY not configured");
    return new Response(
      JSON.stringify({ error: "Payment system not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify authentication
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Missing authorization", {
      status: 401,
      headers: corsHeaders,
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response("Unauthorized", {
      status: 401,
      headers: corsHeaders,
    });
  }

  // Parse input
  let input: PaymentRequestInput;
  try {
    input = await req.json();
  } catch {
    return new Response("Invalid JSON", {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { registration_id, amount, currency, description } = input;

  // Validate required fields
  if (!registration_id || !amount || !currency) {
    return new Response(
      JSON.stringify({ error: "registration_id, amount, and currency are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (amount <= 0) {
    return new Response(
      JSON.stringify({ error: "amount must be positive" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify registration exists and user has access
  const { data: registration, error: regError } = await supabase
    .from("office_desk.registrations")
    .select("id, tenant_id, student_name, student_email")
    .eq("id", registration_id)
    .single();

  if (regError || !registration) {
    return new Response(
      JSON.stringify({ error: "Registration not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify user is teacher in same tenant
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return new Response(
      JSON.stringify({ error: "Profile not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (profile.role !== "teacher" && profile.role !== "admin") {
    return new Response(
      JSON.stringify({ error: "Only teachers can create payment requests" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (profile.tenant_id !== registration.tenant_id) {
    return new Response(
      JSON.stringify({ error: "Registration not in your tenant" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Create Stripe Checkout Session
  try {
    const amountInCents = Math.round(amount * 100);

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "payment",
        "payment_method_types[0]": "card",
        "line_items[0][price_data][currency]": currency.toLowerCase(),
        "line_items[0][price_data][unit_amount]": amountInCents.toString(),
        "line_items[0][price_data][product_data][name]":
          description || `Payment for ${registration.student_name}`,
        "line_items[0][quantity]": "1",
        "success_url": `${APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        "cancel_url": `${APP_URL}/payment-cancel?session_id={CHECKOUT_SESSION_ID}`,
        "metadata[registration_id]": registration_id,
        "metadata[tenant_id]": registration.tenant_id,
        "metadata[student_email]": registration.student_email,
        "metadata[created_by]": user.id,
      }).toString(),
    });

    if (!stripeResponse.ok) {
      const stripeError = await stripeResponse.text();
      console.error("Stripe API error:", stripeError);
      return new Response(
        JSON.stringify({ error: "Failed to create payment session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const session = await stripeResponse.json();

    // Store payment request in database
    const { data: paymentRequest, error: insertError } = await supabase
      .from("school_desk.payment_requests")
      .insert({
        tenant_id: registration.tenant_id,
        registration_id: registration_id,
        amount: amount,
        currency: currency,
        description: description || null,
        stripe_session_id: session.id,
        stripe_payment_url: session.url,
        status: "pending",
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store payment request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Payment request created:", paymentRequest.id, "Session:", session.id);

    return new Response(
      JSON.stringify({
        success: true,
        payment_request_id: paymentRequest.id,
        session_id: session.id,
        payment_url: session.url,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Payment session creation error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
