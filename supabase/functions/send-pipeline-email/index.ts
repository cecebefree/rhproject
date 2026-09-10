// send-pipeline-email — Send stage-specific email via Brevo
// POST /send-pipeline-email
// Body: { pipeline_id: string, stage: string }
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

function getEmailTemplate(stage: string, data: Record<string, unknown>): { subject: string; body: string } | null {
  const familyName = (data.family_name as string) || "there";
  const studentName = (data.student_name as string) || "your child";
  const formUrl = (data.form_url as string) || "";
  const contractUrl = (data.contract_url as string) || "";
  const familyCode = (data.family_code as string) || "";
  const className = (data.class_name as string) || "";

  const templates: Record<string, { subject: string; body: string }> = {
    registration_confirmed: {
      subject: "Welcome to Redhouse — Registration Received",
      body: `
        <h2>Welcome to Redhouse, ${familyName}!</h2>
        <p>Thank you for registering ${studentName}. We've received your registration and our team will be in touch shortly.</p>
        <p><strong>What happens next:</strong></p>
        <ol>
          <li>You'll receive an enrollment form link to complete your family profile</li>
          <li>Our office team will review your submission</li>
          <li>We'll set up your family account and student profiles</li>
          <li>Once approved, you'll get full access to the Redhouse portal</li>
        </ol>
        <p>If you have any questions, reply to this email or contact us at registration@redhouse.co.za</p>
      `,
    },
    form_sent: {
      subject: "Complete Your Redhouse Enrollment",
      body: `
        <h2>Hi ${familyName},</h2>
        <p>It's time to complete your enrollment for ${studentName}.</p>
        <p>Please fill out the enrollment form — it collects additional information needed to set up your family account and class assignments.</p>
        <p><strong>No expiry</strong> — complete at your own pace.</p>
        <p style="margin: 24px 0;">
          <a href="${formUrl}" style="background-color: #1a5276; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Complete Enrollment Form
          </a>
        </p>
        <p>If the button doesn't work, copy this link: ${formUrl}</p>
      `,
    },
    form_submitted: {
      subject: "Enrollment Received — Review in Progress",
      body: `
        <h2>Thank you, ${familyName}!</h2>
        <p>We've received your enrollment form for ${studentName}. Our office team is now reviewing your submission.</p>
        <p><strong>Expected timeline:</strong> 2-3 business days for profile setup.</p>
        <p>We'll notify you once your family account is ready.</p>
      `,
    },
    profiles_created: {
      subject: "Your Family Account is Ready",
      body: `
        <h2>Great news, ${familyName}!</h2>
        <p>Your family account has been set up. Here are your details:</p>
        <div style="background: #f0f0f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Family Code:</strong> ${familyCode}</p>
        </div>
        <p><strong>Next step:</strong> Your enrollment contract is being generated and will be sent to you shortly for review and signature.</p>
      `,
    },
    contract_sent: {
      subject: "Your Enrollment Contract is Ready",
      body: `
        <h2>Hi ${familyName},</h2>
        <p>Your enrollment contract is ready for review. Please open the link below to review and sign.</p>
        <p style="margin: 24px 0;">
          <a href="${contractUrl}" style="background-color: #1a5276; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Review & Sign Contract
          </a>
        </p>
        <p>You can sign digitally or download, sign, and re-upload.</p>
      `,
    },
    contract_signed: {
      subject: "Contract Received — Thank You",
      body: `
        <h2>Thank you, ${familyName}!</h2>
        <p>We've received your signed contract for ${studentName}.</p>
        <p><strong>Next step:</strong> Our team will now assign curriculum, classes, and schedule. We'll notify you once complete.</p>
      `,
    },
    curriculum_selected: {
      subject: "Curriculum & Schedule Assigned",
      body: `
        <h2>Hi ${familyName},</h2>
        <p>${studentName}'s curriculum and schedule have been assigned:</p>
        <div style="background: #f0f0f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Class:</strong> ${className}</p>
        </div>
        <p><strong>Next step:</strong> Payment verification and final approval.</p>
      `,
    },
    debit_verified: {
      subject: "Payment Verified",
      body: `
        <h2>Hi ${familyName},</h2>
        <p>Your payment method has been verified. ${studentName}'s enrollment is now in final review.</p>
        <p>We'll notify you once access is approved.</p>
      `,
    },
    access_approved: {
      subject: "Welcome to Redhouse — Enrollment Approved!",
      body: `
        <h2>Welcome to Redhouse, ${familyName}!</h2>
        <p>${studentName}'s enrollment has been approved. You now have full access to:</p>
        <ul>
          <li>Redhouse Portal (web)</li>
          <li>Redhouse Mobile App</li>
          <li>Class schedules and materials</li>
        </ul>
        <p>Log in with your registered email address.</p>
        <p>Welcome to the Redhouse family!</p>
      `,
    },
  };

  return templates[stage] || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return reject(405, "Method not allowed");
  }

  try {
    const { pipeline_id, stage } = await req.json();

    if (!pipeline_id || !stage) {
      return reject(400, "Missing required fields: pipeline_id, stage");
    }

    // Get pipeline with family account and registration
    const { data: pipeline, error: pipeError } = await supabase
      .from("office_desk.enrollment_pipelines")
      .select("*")
      .eq("id", pipeline_id)
      .single();

    if (pipeError || !pipeline) {
      return reject(404, "Pipeline not found");
    }

    // Get family account
    const { data: familyAccount } = await supabase
      .from("office_desk.family_accounts")
      .select("contact_email, family_code")
      .eq("id", pipeline.family_account_id)
      .single();

    // Get registration for student info
    const { data: registration } = await supabase
      .from("office_desk.registrations")
      .select("student_name, course_name")
      .eq("id", pipeline.registration_id)
      .single();

    // Get student profile for class info
    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("class_section, grade")
      .eq("enrollment_pipeline_id", pipeline_id)
      .eq("role", "student")
      .single();

    const templateData: Record<string, unknown> = {
      family_name: familyAccount?.family_code || "Family",
      student_name: registration?.student_name || "Student",
      family_code: familyAccount?.family_code,
      form_url: `${SITE_URL}/enroll?token=${pipeline.form_token}`,
      contract_url: pipeline.contract_id ? `${SITE_URL}/contract?token=${pipeline.contract_id}` : "",
      class_name: studentProfile ? `Grade ${studentProfile.grade} - ${studentProfile.class_section}` : "",
    };

    const template = getEmailTemplate(stage, templateData);
    if (!template) {
      return reject(400, `No email template found for stage: ${stage}`);
    }

    if (!familyAccount?.contact_email) {
      return reject(400, "No contact email on family account");
    }

    const emailSent = await sendEmail(familyAccount.contact_email, template.subject, template.body);

    return jsonResp({
      status: "success",
      pipeline_id,
      stage,
      email_sent: emailSent,
      email_to: familyAccount.contact_email,
    });
  } catch (err) {
    console.error("send-pipeline-email error:", err);
    return reject(500, "Internal server error", String(err));
  }
});
