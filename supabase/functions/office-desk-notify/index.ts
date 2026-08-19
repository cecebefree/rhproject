// office-desk-notify — Row 86
// Called by trigger `on_registration_created` (migration 148/149)
// Sends email notification to office staff when a new registration is created
//
// Trigger payload: { event, table, record: { registration fields } }
// Logs to office_desk.notifications table
// Sends email via Zadarma API (fallback: console log)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const OFFICE_EMAIL = Deno.env.get("OFFICE_EMAIL") || "office@redhouse.edu";
const OFFICE_DASHBOARD_URL = Deno.env.get("OFFICE_DASHBOARD_URL") || "https://dashboard.redhouse.edu";
const ZADARMA_API_KEY = Deno.env.get("ZADARMA_API_KEY");
const ZADARMA_API_SECRET = Deno.env.get("ZADARMA_API_SECRET");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ═══════════════════════════════════════════════════════════
// EMAIL SENDING
// ═══════════════════════════════════════════════════════════

async function sendEmailViaZadarma(params: {
  to: string;
  subject: string;
  htmlBody: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!ZADARMA_API_KEY || !ZADARMA_API_SECRET) {
    console.log("[office-desk-notify] Zadarma not configured, logging email to console:");
    console.log(`  To: ${params.to}`);
    console.log(`  Subject: ${params.subject}`);
    console.log(`  Body length: ${params.htmlBody.length}`);
    return { success: true };
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const paramsEncoded = new URLSearchParams({
      to: params.to,
      subject: params.subject,
      body: params.htmlBody,
      from_name: "Redhouse Education",
      from_email: "noreply@redhouse.edu",
    });

    const sortedParams = Array.from(paramsEncoded.entries())
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join("&");

    const md5 = await crypto.subtle.digest(
      "MD5",
      new TextEncoder().encode(`${ZADARMA_API_KEY}:${sortedParams}:${ZADARMA_API_SECRET}:${timestamp}`)
    );
    const signature = Array.from(new Uint8Array(md5))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const res = await fetch("https://api.zadarma.com/v1/mail/send/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ZADARMA_API_KEY}:${signature}:${timestamp}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: paramsEncoded.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[office-desk-notify] Zadarma API error ${res.status}: ${errText}`);
      return { success: false, error: `Zadarma API error ${res.status}: ${errText}` };
    }

    return { success: true };
  } catch (err) {
    console.error("[office-desk-notify] Zadarma send failed:", err);
    return { success: false, error: String(err) };
  }
}

function buildEmailHtml(record: Record<string, unknown>): string {
  const familyEmail = record.family_email || "N/A";
  const childName = record.child_name || "N/A";
  const childDob = record.child_dob || "N/A";
  const intakeGroup = record.intake_group || "N/A";
  const paymentStatus = record.payment_status || "N/A";
  const chargeId = record.stripe_charge_id || record.paypal_transaction_id || "N/A";
  const registrationId = record.id || "N/A";
  const familyId = record.family_id || "N/A";
  const dashboardUrl = `${OFFICE_DASHBOARD_URL}/registrations/${registrationId}`;

  return `
    <h2>New Registration Received</h2>
    <p><strong>Family Email:</strong> ${familyEmail}</p>
    <p><strong>Child Name:</strong> ${childName}</p>
    <p><strong>Date of Birth:</strong> ${childDob}</p>
    <p><strong>Intake Group:</strong> ${intakeGroup}</p>
    <p><strong>Payment Status:</strong> ${paymentStatus}</p>
    <p><strong>Charge ID:</strong> ${chargeId}</p>
    <p><strong>Registration ID:</strong> ${registrationId}</p>
    <p><strong>Family ID:</strong> ${familyId}</p>
    <p><a href="${dashboardUrl}">View in Dashboard</a></p>
  `.trim();
}

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // Auth: service_role or EF-to-EF caller
  const caller = req.headers.get("X-EF-Caller");
  const authHeader = req.headers.get("Authorization");
  const isEF = caller === "website-lead-to-registration" || caller === "register-with-payment";
  const isServiceRole = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;

  if (!isEF && !isServiceRole) {
    return jsonResp({ error: "Unauthorized" }, 401);
  }

  // Parse payload
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResp({ error: "Invalid JSON" }, 400);
  }

  // Extract record — support both trigger format { event, table, record } and flat format
  const record = (body.record as Record<string, unknown>) || body;

  if (!record || typeof record !== "object") {
    return jsonResp({ error: "Missing record in payload" }, 400);
  }

  // Validate required fields
  const registrationId = record.id as string;
  const familyEmail = record.family_email as string;
  const childName = record.child_name as string;

  if (!registrationId) {
    return jsonResp({ error: "record.id (registration_id) is required" }, 400);
  }

  // Build email
  const subject = `New Registration: ${childName || "Unknown"} (${(record.intake_group as string) || "N/A"})`;
  const htmlBody = buildEmailHtml(record);

  console.log(`[office-desk-notify] Sending notification for registration ${registrationId}`);

  // Send email
  const emailResult = await sendEmailViaZadarma({
    to: OFFICE_EMAIL,
    subject,
    htmlBody,
  });

  // Log to office_desk.notifications
  const notificationStatus = emailResult.success ? "sent" : "failed";
  let notificationId: string | null = null;

  try {
    const { data: notification, error: insertErr } = await supabase
      .schema("office_desk")
      .from("notifications")
      .insert({
        registration_id: registrationId,
        notification_type: "new_registration",
        email_to: OFFICE_EMAIL,
        status: notificationStatus,
        error_message: emailResult.error || null,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("[office-desk-notify] Failed to log notification:", insertErr.message);
    } else {
      notificationId = notification.id;
      console.log(`[office-desk-notify] Notification logged: ${notificationId} (status: ${notificationStatus})`);
    }
  } catch (err) {
    console.error("[office-desk-notify] Notification insert error:", err);
  }

  // Response
  if (!emailResult.success) {
    return jsonResp(
      { success: false, error: emailResult.error, notification_id: notificationId },
      500
    );
  }

  return jsonResp({ success: true, notification_id: notificationId });
});
