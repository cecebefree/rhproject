import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYPAL_MODE = Deno.env.get("PAYPAL_MODE") || "sandbox"; // "sandbox" or "live"
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PAYPAL_VERIFY_URL =
  PAYPAL_MODE === "live"
    ? "https://www.paypal.com/cgi-bin/webscr"
    : "https://www.sandbox.paypal.com/cgi-bin/webscr";

interface PayPalIPN {
  payment_status: string;
  txn_id: string;
  custom: string; // Contains student_email and registration_id as JSON
  mc_gross: string;
  mc_currency: string;
  payer_email: string;
  receiver_email: string;
}

async function verifyIPN(rawBody: string): Promise<boolean> {
  const verifyPayload = `cmd=_notify-validate&${rawBody}`;

  const response = await fetch(PAYPAL_VERIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: verifyPayload,
  });

  const result = await response.text();
  return result === "VERIFIED";
}

function parseCustomField(custom: string): {
  student_email: string;
  registration_id: string;
} | null {
  try {
    const parsed = JSON.parse(custom);
    if (parsed.student_email && parsed.registration_id) {
      return {
        student_email: parsed.student_email,
        registration_id: parsed.registration_id,
      };
    }
    return null;
  } catch {
    // Try URL-encoded format: student_email=xxx&registration_id=yyy
    const params = new URLSearchParams(custom);
    const student_email = params.get("student_email");
    const registration_id = params.get("registration_id");
    if (student_email && registration_id) {
      return { student_email, registration_id };
    }
    return null;
  }
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const contentType = req.headers.get("content-type");
    if (
      !contentType?.includes("application/x-www-form-urlencoded") &&
      !contentType?.includes("multipart/form-data")
    ) {
      return new Response("Invalid content type", { status: 400 });
    }

    const body = await req.text();

    // Verify IPN with PayPal
    const isVerified = await verifyIPN(body);
    if (!isVerified) {
      console.error("IPN verification failed");
      return new Response("IPN verification failed", { status: 401 });
    }

    // Parse IPN data
    const params = new URLSearchParams(body);
    const payment_status = params.get("payment_status");
    const txn_id = params.get("txn_id");
    const custom = params.get("custom");

    // Only process completed payments
    if (payment_status !== "Completed") {
      console.log("Non-completed payment status:", payment_status);
      return new Response(JSON.stringify({ received: true, status: payment_status }), {
        status: 200,
      });
    }

    // Validate required fields
    if (!txn_id) {
      return new Response("Missing txn_id", { status: 400 });
    }

    if (!custom) {
      return new Response("Missing custom field", { status: 400 });
    }

    // Parse custom field for student_email and registration_id
    const customData = parseCustomField(custom);
    if (!customData) {
      return new Response("Invalid custom field format", { status: 400 });
    }

    const { student_email, registration_id } = customData;

    // Update registration with payment info
    const { data: reg, error } = await supabase
      .from("office_desk.registrations")
      .update({
        status: "active",
        payment_attached_at: new Date().toISOString(),
        paypal_transaction_id: txn_id,
      })
      .eq("student_email", student_email)
      .eq("id", registration_id)
      .select();

    if (error) {
      console.error("Payment attach failed:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }

    console.log("PayPal payment attached:", reg);

    // Row 63: Archive lead after successful payment attachment
    if (reg && reg.length > 0 && reg[0].lead_reference_id) {
      const { error: archiveError } = await supabase.rpc("archive_lead", {
        p_lead_id: reg[0].lead_reference_id,
        p_action: "archive",
        p_reason: "enrolled",
        p_notes: `Payment attached via PayPal txn ${txn_id}`,
      });

      if (archiveError) {
        console.error("Archive lead failed:", archiveError);
        // Non-fatal: payment attached but archive failed
      } else {
        console.log("Lead archived successfully:", reg[0].lead_reference_id);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response("Internal server error", { status: 500 });
  }
});
