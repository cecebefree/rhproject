// send-enrollment-form — Generate form link and send email to family
// POST /send-enrollment-form
// Body: { pipeline_id: string }
// verify_jwt: true (office/admin only)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:5173";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function reject(status: number, error: string, detail?: string): Response {
  return jsonResp({ error, ...(detail ? { detail } : {}) }, status);
}

async function sendEmail(to: string, subject: string, htmlBody: string): Promise<boolean> {
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
        htmlContent: htmlBody,
      }),
    });
    return response.ok;
  } catch (err) {
    console.error("Brevo email send failed:", err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return reject(405, "Method not allowed");
  }

  try {
    const { pipeline_id } = await req.json();

    if (!pipeline_id) {
      return reject(400, "Missing required field: pipeline_id");
    }

    // Get pipeline + registration details
    const { data: pipeline, error: pipeError } = await supabase
      .from("office_desk.enrollment_pipelines")
      .select(`
        *,
        registration:office_desk.registrations(*)
      `)
      .eq("id", pipeline_id)
      .single();

    if (pipeError || !pipeline) {
      return reject(404, "Pipeline not found");
    }

    if (pipeline.stage !== "registration_confirmed") {
      return reject(400, `Pipeline is in stage '${pipeline.stage}', expected 'registration_confirmed'`);
    }

    const registration = pipeline.registration as Record<string, unknown>;
    const familyEmail = registration?.student_email as string;
    const studentName = registration?.student_name as string;

    if (!familyEmail) {
      return reject(400, "Registration has no email address");
    }

    // Build enrollment form URL
    const formUrl = `${SITE_URL}/enroll?token=${pipeline.form_token}`;

    // Send email
    const emailSubject = "Complete Your Redhouse Enrollment";
    const emailBody = `
      <h2>Welcome to Redhouse, ${studentName}!</h2>
      <p>Thank you for registering. To complete your enrollment, please fill out the enrollment form below.</p>
      <p>This form collects additional information needed to set up your family account, student profiles, and class assignments.</p>
      <p><strong>No expiry</strong> — complete at your own pace. Our team will follow up if needed.</p>
      <p style="margin: 24px 0;">
        <a href="${formUrl}" style="background-color: #1a5276; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Complete Enrollment Form
        </a>
      </p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="color: #666; word-break: break-all;">${formUrl}</p>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;">
      <p style="color: #888; font-size: 12px;">This is an automated email from Redhouse. If you did not register, please ignore this message.</p>
    `;

    const emailSent = await sendEmail(familyEmail, emailSubject, emailBody);

    // Update pipeline stage
    const { error: updateError } = await supabase
      .from("office_desk.enrollment_pipelines")
      .update({
        stage: "form_sent",
        form_sent_at: new Date().toISOString(),
        stage_updated_at: new Date().toISOString(),
        stage_history: JSON.stringify([
          ...((pipeline.stage_history as unknown[]) || []),
          {
            stage: "form_sent",
            timestamp: new Date().toISOString(),
            actor: "system",
            action: "form_email_sent",
            email_sent: emailSent,
          },
        ]),
      })
      .eq("id", pipeline_id);

    if (updateError) {
      console.error("Pipeline update failed:", updateError);
    }

    return jsonResp({
      status: "success",
      form_url: formUrl,
      email_sent: emailSent,
      email_to: familyEmail,
    });
  } catch (err) {
    console.error("send-enrollment-form error:", err);
    return reject(500, "Internal server error", String(err));
  }
});
