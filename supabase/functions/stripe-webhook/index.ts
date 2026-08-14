import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifyStripeSignature(
  body: string,
  signature: string
): Promise<boolean> {
  const [tPart, v1Part] = signature.split(",");
  const timestamp = tPart.split("=")[1];
  const providedSignature = v1Part.split("=")[1];

  const payload = `${timestamp}.${body}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(STRIPE_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signatureBytes = new Uint8Array(
    providedSignature.match(/[\da-f]{2}/gi)!.map((x) => parseInt(x, 16))
  );

  return await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(payload)
  );
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const body = await req.text();

  // Verify Stripe signature
  const isValid = await verifyStripeSignature(body, signature);
  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.type === "charge.succeeded") {
    const charge = event.data.object;
    const { metadata } = charge;

    // Validate required metadata fields
    if (!metadata?.student_email || !metadata?.registration_id) {
      return new Response("Missing required metadata", { status: 400 });
    }

    try {
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
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
        });
      }

      console.log("Payment attached:", reg);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
      console.error("Webhook processing error:", err);
      return new Response("Internal server error", { status: 500 });
    }
  }

  // Return success for other event types (Stripe expects 2xx)
  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
