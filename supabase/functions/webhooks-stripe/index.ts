// webhooks-stripe — Process Stripe charge events for registration payments (Row 102)
// POST /webhooks/stripe — unauthenticated, signature verification required
// Handles: charge.succeeded, charge.failed, charge.refunded

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// ═══════════════════════════════════════════════════════════
// SIGNATURE VERIFICATION
// ═══════════════════════════════════════════════════════════

async function verifyStripeSignature(
  body: string,
  signature: string
): Promise<boolean> {
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

    return await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(payload)
    );
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// IDEMPOTENCY — check + record event
// ═══════════════════════════════════════════════════════════

async function isEventProcessed(stripeEventId: string): Promise<boolean> {
  const { data } = await supabase
    .schema("office_desk")
    .from("stripe_events")
    .select("id")
    .eq("stripe_event_id", stripeEventId)
    .maybeSingle();
  return !!data;
}

async function recordEvent(
  stripeEventId: string,
  eventType: string,
  payload: Record<string, unknown>,
  status: string,
  errorMessage?: string
) {
  await supabase.schema("office_desk").from("stripe_events").insert({
    stripe_event_id: stripeEventId,
    event_type: eventType,
    payload,
    status,
    error_message: errorMessage || null,
  });
}

// ═══════════════════════════════════════════════════════════
// NOTIFICATION — alert office desk staff
// ═══════════════════════════════════════════════════════════

async function notifyOfficeDesk(params: {
  tenantId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const { tenantId, type, title, message, metadata } = params;

  // Get office desk users for this tenant
  const { data: officeUsers } = await supabase
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("role", ["office", "admin"]);

  if (!officeUsers?.length) return;

  // Create notification for each office desk user
  const notifications = officeUsers.map((u) => ({
    tenant_id: tenantId,
    user_id: u.id,
    type,
    title,
    body: message,
    data: metadata ?? {},
  }));

  await supabase.from("notifications").insert(notifications);
}

// ═══════════════════════════════════════════════════════════
// CHARGE.SUCCEEDED — mark registration paid
// ═══════════════════════════════════════════════════════════

async function handleChargeSucceeded(charge: Record<string, unknown>) {
  const chargeId = charge.id as string;
  const amount = (charge.amount as number) / 100; // cents → currency units
  const metadata = (charge.metadata ?? {}) as Record<string, string>;
  const registrationId = metadata.registration_id;

  console.log(`charge.succeeded: ${chargeId} (amount: ${amount})`);

  if (!registrationId) {
    console.log("No registration_id in charge metadata, skipping");
    return { received: true, skipped: true };
  }

  // Look up registration
  const { data: registration, error: regError } = await supabase
    .schema("office_desk")
    .from("registrations")
    .select("id, tenant_id, status, payment_status, student_name, course_name")
    .eq("id", registrationId)
    .single();

  if (regError || !registration) {
    console.error("Registration not found:", registrationId);
    return { received: true, error: "registration_not_found" };
  }

  // Update payment_status → paid, store charge ID
  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    payment_status: "paid",
    stripe_charge_id: chargeId,
    payment_attached_at: now,
    updated_at: now,
  };

  // Auto-transition: pending_init → pending_review (if payment is now paid)
  if (
    registration.status === "pending_init" &&
    registration.payment_status !== "paid"
  ) {
    updatePayload.status = "pending_review";
    console.log(
      `Auto-transitioning registration ${registrationId}: pending_init → pending_review`
    );
  }

  const { error: updateError } = await supabase
    .schema("office_desk")
    .from("registrations")
    .update(updatePayload)
    .eq("id", registrationId);

  if (updateError) {
    console.error("Registration update failed:", updateError);
    return { received: true, error: updateError.message };
  }

  // Notify office desk
  await notifyOfficeDesk({
    tenantId: registration.tenant_id,
    type: "payment_received",
    title: "Payment Received",
    message: `Payment received for ${registration.student_name} — ${registration.course_name ?? "course"} (R${amount.toFixed(2)})`,
    metadata: {
      registrationId,
      chargeId,
      amount,
      studentName: registration.student_name,
      courseName: registration.course_name,
    },
  });

  console.log(`Registration ${registrationId} marked as paid`);
  return { received: true };
}

// ═══════════════════════════════════════════════════════════
// CHARGE.FAILED — mark payment failed + alert office desk
// ═══════════════════════════════════════════════════════════

async function handleChargeFailed(charge: Record<string, unknown>) {
  const chargeId = charge.id as string;
  const metadata = (charge.metadata ?? {}) as Record<string, string>;
  const registrationId = metadata.registration_id;
  const failureMessage =
    (charge.failure_message as string) || "Payment failed";

  console.log(`charge.failed: ${chargeId} — ${failureMessage}`);

  if (!registrationId) {
    console.log("No registration_id in charge metadata, skipping");
    return { received: true, skipped: true };
  }

  // Update payment_status → failed
  const { error: updateError } = await supabase
    .schema("office_desk")
    .from("registrations")
    .update({
      payment_status: "failed",
      stripe_charge_id: chargeId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", registrationId);

  if (updateError) {
    console.error("Registration update failed:", updateError);
    return { received: true, error: updateError.message };
  }

  // Get registration details for notification
  const { data: registration } = await supabase
    .schema("office_desk")
    .from("registrations")
    .select("tenant_id, student_name, course_name")
    .eq("id", registrationId)
    .single();

  if (registration) {
    await notifyOfficeDesk({
      tenantId: registration.tenant_id,
      type: "payment_failed",
      title: "Payment Failed",
      message: `Payment failed for ${registration.student_name} — ${registration.course_name ?? "course"}. Reason: ${failureMessage}`,
      metadata: {
        registrationId,
        chargeId,
        failureMessage,
        studentName: registration.student_name,
        courseName: registration.course_name,
      },
    });
  }

  console.log(`Registration ${registrationId} marked as payment failed`);
  return { received: true };
}

// ═══════════════════════════════════════════════════════════
// CHARGE.REFUNDED — create refund record + update registration
// ═══════════════════════════════════════════════════════════

async function handleChargeRefunded(charge: Record<string, unknown>) {
  const chargeId = charge.id as string;
  const amountRefunded = (charge.amount_refunded as number) / 100;
  const metadata = (charge.metadata ?? {}) as Record<string, string>;
  const registrationId = metadata.registration_id;

  // Find the specific refund object (latest refund in the refunds array)
  const refunds = (charge.refunds as { data?: Array<Record<string, unknown>> })
    ?.data;
  const latestRefund = refunds?.[refunds.length - 1];

  const refundId = (latestRefund?.id as string) || `re_unknown_${Date.now()}`;
  const refundReason =
    (latestRefund?.reason as string) || "requested_by_customer";

  console.log(
    `charge.refunded: ${chargeId}, refund: ${refundId}, amount: ${amountRefunded}`
  );

  if (!registrationId) {
    console.log("No registration_id in charge metadata, skipping refund record");
    return { received: true, skipped: true };
  }

  // Insert refund record
  const { error: refundError } = await supabase
    .schema("office_desk")
    .from("refunds")
    .insert({
      stripe_refund_id: refundId,
      registration_id: registrationId,
      stripe_charge_id: chargeId,
      amount: amountRefunded,
      currency: (charge.currency as string) || "zar",
      reason: refundReason,
      status: "succeeded",
    });

  if (refundError) {
    console.error("Refund insert failed:", refundError);
    // Continue — still update registration
  }

  // Update registration payment_status → refunded
  const { error: updateError } = await supabase
    .schema("office_desk")
    .from("registrations")
    .update({
      payment_status: "refunded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", registrationId);

  if (updateError) {
    console.error("Registration update failed:", updateError);
    return { received: true, error: updateError.message };
  }

  // Get registration details for notification
  const { data: registration } = await supabase
    .schema("office_desk")
    .from("registrations")
    .select("tenant_id, student_name, course_name")
    .eq("id", registrationId)
    .single();

  if (registration) {
    await notifyOfficeDesk({
      tenantId: registration.tenant_id,
      type: "payment_refunded",
      title: "Refund Processed",
      message: `Refund of R${amountRefunded.toFixed(2)} processed for ${registration.student_name} — ${registration.course_name ?? "course"}`,
      metadata: {
        registrationId,
        chargeId,
        refundId,
        amountRefunded,
        reason: refundReason,
      },
    });
  }

  console.log(
    `Registration ${registrationId} refund recorded, status → refunded`
  );
  return { received: true };
}

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  // Require stripe-signature header
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", {
      status: 400,
      headers: corsHeaders,
    });
  }

  // Require webhook secret
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", {
      status: 500,
      headers: corsHeaders,
    });
  }

  // Read body (must read before verification)
  const body = await req.text();

  // Verify signature
  const isValid = await verifyStripeSignature(body, signature);
  if (!isValid) {
    console.error("Invalid Stripe signature");
    return new Response("Invalid signature", {
      status: 403,
      headers: corsHeaders,
    });
  }

  // Parse event
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(body);
  } catch (err) {
    console.error("Invalid JSON:", err);
    return new Response("Invalid JSON", {
      status: 400,
      headers: corsHeaders,
    });
  }

  const eventType = event.type as string;
  const stripeEventId = event.id as string;
  const charge = event.data?.object as Record<string, unknown>;

  console.log(`Webhook received: ${eventType} (${stripeEventId})`);

  // Idempotency check
  const alreadyProcessed = await isEventProcessed(stripeEventId);
  if (alreadyProcessed) {
    console.log(`Event ${stripeEventId} already processed, skipping`);
    return new Response(JSON.stringify({ status: "received", idempotent: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Process event
  try {
    let result: { received: boolean; skipped?: boolean; error?: string };

    switch (eventType) {
      case "charge.succeeded":
        result = await handleChargeSucceeded(charge);
        break;
      case "charge.failed":
        result = await handleChargeFailed(charge);
        break;
      case "charge.refunded":
        result = await handleChargeRefunded(charge);
        break;
      default:
        // Unknown event type — record and skip
        await recordEvent(stripeEventId, eventType, event, "skipped");
        console.log(`Unhandled event type: ${eventType}`);
        return new Response(JSON.stringify({ status: "received", skipped: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Record successful processing
    await recordEvent(stripeEventId, eventType, event, "processed");

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`Error processing ${eventType}:`, err);

    // Record error (Stripe will retry)
    await recordEvent(
      stripeEventId,
      eventType,
      event,
      "error",
      String(err)
    );

    return new Response("Internal server error", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
