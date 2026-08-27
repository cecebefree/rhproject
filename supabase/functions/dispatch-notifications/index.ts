import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

// Send email via Brevo
async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": Deno.env.get("BREVO_API_KEY") || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: [{ email: to }],
        from: { email: "noreply@redhouse.co.za", name: "Redhouse" },
        subject,
        htmlContent: body,
      }),
    });

    return response.ok;
  } catch (err) {
    console.error("Brevo email send failed:", err);
    return false;
  }
}

// Send SMS via Zadarma
// API docs: https://zadarma.com/en/support/api/
// Auth: userKey:signature (HMAC-SHA1)
async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  try {
    const userKey = Deno.env.get("ZADARMA_USER_KEY") || "";
    const secretKey = Deno.env.get("ZADARMA_SECRET_KEY") || "";

    if (!userKey || !secretKey) {
      console.error("Zadarma credentials not configured");
      return false;
    }

    // Zadarma API requires number without + prefix
    const cleanNumber = phoneNumber.replace(/^\+/, "");

    // Build signature (HMAC-SHA1 of the request path + params)
    const params = new URLSearchParams({
      number: cleanNumber,
      message: message,
    });

    const requestPath = `/v1/sms/send/?${params.toString()}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const messageData = encoder.encode(requestPath);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const response = await fetch(`https://api.zadarma.com/v1/sms/send/?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `${userKey}:${signature}`,
      },
    });

    const result = await response.json();

    if (result.status === "success") {
      console.log(`SMS sent to ${cleanNumber}, cost: ${result.cost} ${result.currency}`);
      return true;
    } else {
      console.error(`Zadarma SMS error: ${result.message}`);
      return false;
    }
  } catch (err) {
    console.error("Zadarma SMS send failed:", err);
    return false;
  }
}

// Cron job: Dispatch pending notifications every 5 minutes
export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Fetch pending notifications
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from("notifications")
      .select("id, student_id, subject, body, channels, metadata")
      .eq("status", "pending")
      .lt("retry_count", 3)
      .limit(50);

    if (fetchError) {
      throw new Error(`Fetch error: ${fetchError.message}`);
    }

    console.log(`Processing ${pendingNotifications?.length || 0} pending notifications`);

    for (const notification of pendingNotifications || []) {
      const { id, student_id, subject, body, channels, metadata } = notification;

      // Get student email/phone
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("email, phone")
        .eq("id", student_id)
        .single();

      if (studentError || !student) {
        console.error(`Student not found: ${student_id}`);
        continue;
      }

      let emailSent = false;
      let smsSent = false;

      // Send email via Brevo
      if (channels.includes("email") && student.email) {
        emailSent = await sendEmail(student.email, subject, body);
        if (emailSent) {
          console.log(`Email sent to ${student.email}`);
        } else {
          console.error(`Email failed for ${student.email}`);
        }
      }

      // Send SMS via Zadarma
      if (channels.includes("sms") && student.phone) {
        smsSent = await sendSMS(student.phone, body);
        if (smsSent) {
          console.log(`SMS sent to ${student.phone}`);
        } else {
          console.error(`SMS failed for ${student.phone}`);
        }
      }

      // Update notification status
      const success = emailSent || smsSent;
      const { error: updateError } = await supabase
        .from("notifications")
        .update({
          status: success ? "sent" : "failed",
          sent_at: success ? new Date().toISOString() : null,
          failed_at: !success ? new Date().toISOString() : null,
          retry_count: (notification.retry_count || 0) + 1,
          failure_reason: !success ? "Email/SMS send failed" : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        console.error(`Update error: ${updateError.message}`);
      }

      // Log audit
      await supabase.from("audit_log").insert({
        user_id: student_id,
        action: success ? "notification_sent" : "notification_send_failed",
        resource_type: "notification",
        resource_id: id,
        details: { channels, success },
        created_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ sent: pendingNotifications?.length || 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Dispatch error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
