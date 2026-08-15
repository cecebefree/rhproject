import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ═══════════════════════════════════════════════════════════
// LOGGING — write failed webhook attempts for debugging
// ═══════════════════════════════════════════════════════════
async function logWebhookEvent(
  eventType: string,
  payload: Record<string, unknown>,
  errorMessage?: string,
) {
  try {
    await supabase.from("supabase.log_events").insert({
      event_type: eventType,
      payload,
      error_message: errorMessage || null,
    });
  } catch (err) {
    console.error("Failed to log webhook event:", err);
  }
}

async function verifyStripeSignature(
  body: string,
  signature: string
): Promise<boolean> {
  try {
    const parts = signature.split(",");
    if (parts.length !== 2) return false;

    const [tPart, v1Part] = parts;
    const timestamp = tPart?.split("=")[1];
    const providedSignature = v1Part?.split("=")[1];

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
// CHECKOUT.SESSION.COMPLETED — Row 76 payment confirmation
// ═══════════════════════════════════════════════════════════
async function handleCheckoutSessionCompleted(session: Record<string, unknown>) {
  const sessionId = session.id as string;
  const paymentIntent = session.payment_intent as string | null;
  const amountTotal = session.amount_total as number | null;
  const currency = session.currency as string | null;
  const metadata = session.metadata as Record<string, string> | null;

  console.log(`Processing checkout.session.completed: ${sessionId}`);

  // 1. Idempotency check — find existing payment request
  const { data: existingRequest, error: lookupError } = await supabase
    .from("school_desk.payment_requests")
    .select("id, status, registration_id, tenant_id")
    .eq("stripe_session_id", sessionId)
    .single();

  if (lookupError) {
    console.error("Payment request lookup failed:", lookupError);
    await logWebhookEvent("checkout.session.completed", session, lookupError.message);
    return { success: false, error: "Payment request not found" };
  }

  // 2. Already processed — skip (idempotent)
  if (existingRequest.status === "paid") {
    console.log(`Payment ${sessionId} already processed, skipping`);
    return { success: true, alreadyProcessed: true };
  }

  // 3. Update payment_request → status='paid', paid_at=NOW()
  const { error: updateError } = await supabase
    .from("school_desk.payment_requests")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_id: paymentIntent,
    })
    .eq("id", existingRequest.id);

  if (updateError) {
    console.error("Payment request update failed:", updateError);
    await logWebhookEvent("checkout.session.completed", session, updateError.message);
    return { success: false, error: updateError.message };
  }

  console.log(`Payment request ${existingRequest.id} updated to paid`);

  // 4. Create office_desk.payment record
  try {
    const { error: paymentError } = await supabase
      .from("office_desk.payments")
      .insert({
        tenant_id: existingRequest.tenant_id,
        registration_id: existingRequest.registration_id,
        amount: (amountTotal || 0) / 100,
        currency: currency || "usd",
        stripe_payment_id: paymentIntent,
        status: "completed",
        metadata: JSON.stringify({ stripe_session_id: sessionId }),
      });

    if (paymentError) {
      console.error("Payment record creation failed:", paymentError);
      await logWebhookEvent("checkout.session.completed", session, paymentError.message);
      // Non-fatal: payment request is updated, payment record is secondary
    } else {
      console.log("Payment record created successfully");
    }
  } catch (err) {
    console.error("Payment record error:", err);
    await logWebhookEvent("checkout.session.completed", session, String(err));
  }

  // 5. Update registration status if registration_id exists
  if (existingRequest.registration_id) {
    try {
      const { error: regError } = await supabase
        .from("office_desk.registrations")
        .update({
          status: "active",
          payment_attached_at: new Date().toISOString(),
          stripe_charge_id: paymentIntent,
        })
        .eq("id", existingRequest.registration_id);

      if (regError) {
        console.error("Registration update failed:", regError);
        // Non-fatal: payment is primary
      } else {
        console.log("Registration updated to active");
      }
    } catch (err) {
      console.error("Registration update error:", err);
    }
  }

  // 6. Archive lead if lead_reference_id exists
  if (existingRequest.registration_id) {
    try {
      const { data: reg } = await supabase
        .from("office_desk.registrations")
        .select("lead_reference_id")
        .eq("id", existingRequest.registration_id)
        .single();

      if (reg?.lead_reference_id) {
        const { error: archiveError } = await supabase.rpc("archive_lead", {
          p_lead_id: reg.lead_reference_id,
          p_action: "archive",
          p_reason: "enrolled",
          p_notes: `Payment completed via Stripe session ${sessionId}`,
        });

        if (archiveError) {
          console.error("Archive lead failed:", archiveError);
          // Non-fatal
        } else {
          console.log("Lead archived successfully:", reg.lead_reference_id);
        }
      }
    } catch (err) {
      console.error("Archive lead error:", err);
    }
  }

  return { success: true };
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400, headers: corsHeaders });
  }

  const body = await req.text();

  // Verify Stripe signature
  const isValid = await verifyStripeSignature(body, signature);
  if (!isValid) {
    await logWebhookEvent("stripe.webhook.signature_invalid", { body: body.substring(0, 500) }, "Invalid signature");
    return new Response("Invalid signature", { status: 401, headers: corsHeaders });
  }

  const event = JSON.parse(body);

  console.log(`Webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const result = await handleCheckoutSessionCompleted(event.data.object);
        return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
      }

      case "charge.succeeded": {
        const charge = event.data.object;
        const { metadata } = charge;

        // Validate required metadata fields
        if (!metadata?.student_email || !metadata?.registration_id) {
          return new Response("Missing required metadata", { status: 400, headers: corsHeaders });
        }

        // Lookup registration by student_email + registration_id and attach payment
        const { data: reg, error } = await supabase
          .from("office_desk.registrations")
          .update({
            status: "active",
            payment_attached_at: new Date().toISOString(),
            stripe_charge_id: charge.id,
          })
          .eq("student_email", metadata.student_email)
          .eq("id", metadata.registration_id)
          .select();

        if (error) {
          console.error("Payment attach failed:", error);
          await logWebhookEvent("charge.succeeded", event.data.object, error.message);
          return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
        }

        console.log("Payment attached:", reg);

        // Row 63: Archive lead after successful payment attachment
        if (reg && reg.length > 0 && reg[0].lead_reference_id) {
          const { error: archiveError } = await supabase.rpc("archive_lead", {
            p_lead_id: reg[0].lead_reference_id,
            p_action: "archive",
            p_reason: "enrolled",
            p_notes: `Payment attached via Stripe charge ${charge.id}`,
          });

          if (archiveError) {
            console.error("Archive lead failed:", archiveError);
          } else {
            console.log("Lead archived successfully:", reg[0].lead_reference_id);
          }
        }

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
      }

      default:
        // Return success for other event types (Stripe expects 2xx)
        return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    await logWebhookEvent(event.type, event.data.object, String(err));
    return new Response("Internal server error", { status: 500, headers: corsHeaders });
  }
});
