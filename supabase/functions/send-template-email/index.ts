// send-template-email — Send templated emails via SendGrid (Row 103)
// POST /functions/v1/send-template-email (authenticated)
// Input: { template_id, recipient_email, recipient_name, data: {...} }
// Output: { status: 'sent', message_id } or { status: 'error', reason }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const FROM_EMAIL = "noreply@redhouse.edu";
const FROM_NAME = "Redhouse LMS";
const RATE_LIMIT = 1000;

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════
// EMBEDDED TEMPLATES (Edge Runtime can't read files at runtime)
// ═══════════════════════════════════════════════════════════

function getHeader(): string {
  return `<tr><td style="background-color:#1a365d;padding:32px 40px;text-align:center;">
<h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:600;">Redhouse</h1>
<p style="color:#a0c4e8;margin:8px 0 0;font-size:14px;">LMS</p></td></tr>`;
}

function getFooter(): string {
  return `<tr><td style="background-color:#f7fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
<p style="color:#a0aec0;margin:0;font-size:13px;text-align:center;">
This is an automated message from Redhouse LMS. Please do not reply to this email.</p></td></tr>`;
}

function wrapBody(bodyContent: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
${getHeader()}
<tr><td style="padding:40px;">${bodyContent}</td></tr>
${getFooter()}
</table></td></tr></table></body></html>`;
}

const TEMPLATES: Record<string, { subject: string; body: string; requiredFields: string[] }> = {
  registration_approved: {
    subject: "Registration Approved — {{course_name}}",
    requiredFields: ["recipient_name", "student_name", "course_name"],
    body: `<h2 style="color:#1a365d;margin:0 0 16px;font-size:20px;">Registration Approved</h2>
<p style="color:#4a5568;margin:0 0 16px;font-size:16px;line-height:1.6;">Dear {{recipient_name}},</p>
<p style="color:#4a5568;margin:0 0 24px;font-size:16px;line-height:1.6;">
We're pleased to inform you that <strong>{{student_name}}</strong>'s registration for <strong>{{course_name}}</strong> has been approved.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7fafc;border-radius:6px;margin:0 0 24px;">
<tr><td style="padding:20px;">
<p style="color:#718096;margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Details</p>
<p style="color:#2d3748;margin:0;font-size:15px;line-height:1.8;">
<strong>Student:</strong> {{student_name}}<br>
<strong>Course:</strong> {{course_name}}<br>
<strong>Start Date:</strong> {{start_date}}<br>
<strong>Instructor:</strong> {{instructor_name}}</p>
</td></tr></table>
<p style="color:#4a5568;margin:0 0 24px;font-size:16px;line-height:1.6;">
Please log in to your portal to view the full schedule and any materials required.</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="{{portal_url}}" style="display:inline-block;background-color:#1a365d;color:#ffffff;padding:12px 32px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">Go to Portal</a>
</td></tr></table>`,
  },

  grade_posted: {
    subject: "Grade Posted for {{student_name}} — {{course_name}}",
    requiredFields: ["recipient_name", "student_name", "course_name", "assignment_name", "score", "max_score"],
    body: `<h2 style="color:#1a365d;margin:0 0 16px;font-size:20px;">Grade Posted</h2>
<p style="color:#4a5568;margin:0 0 16px;font-size:16px;line-height:1.6;">Dear {{recipient_name}},</p>
<p style="color:#4a5568;margin:0 0 24px;font-size:16px;line-height:1.6;">
A new grade has been posted for <strong>{{student_name}}</strong>.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7fafc;border-radius:6px;margin:0 0 24px;">
<tr><td style="padding:20px;">
<p style="color:#718096;margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Grade Details</p>
<p style="color:#2d3748;margin:0;font-size:15px;line-height:1.8;">
<strong>Student:</strong> {{student_name}}<br>
<strong>Course:</strong> {{course_name}}<br>
<strong>Assignment:</strong> {{assignment_name}}<br>
<strong>Score:</strong> {{score}} / {{max_score}} ({{percentage}}%)<br>
<strong>Class Average:</strong> {{class_average}}%</p>
</td></tr></table>
<p style="color:#4a5568;margin:0 0 24px;font-size:16px;line-height:1.6;">
Keep up the great work! Log in to view detailed feedback.</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="{{portal_url}}" style="display:inline-block;background-color:#1a365d;color:#ffffff;padding:12px 32px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">View Grades</a>
</td></tr></table>`,
  },

  attendance_alert: {
    subject: "Attendance Update — {{student_name}}",
    requiredFields: ["recipient_name", "student_name", "course_name", "class_date", "status"],
    body: `<h2 style="color:#1a365d;margin:0 0 16px;font-size:20px;">Attendance Update</h2>
<p style="color:#4a5568;margin:0 0 16px;font-size:16px;line-height:1.6;">Dear {{recipient_name}},</p>
<p style="color:#4a5568;margin:0 0 24px;font-size:16px;line-height:1.6;">
We wanted to let you know about <strong>{{student_name}}</strong>'s attendance.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7fafc;border-radius:6px;margin:0 0 24px;">
<tr><td style="padding:20px;">
<p style="color:#718096;margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Attendance Details</p>
<p style="color:#2d3748;margin:0;font-size:15px;line-height:1.8;">
<strong>Student:</strong> {{student_name}}<br>
<strong>Course:</strong> {{course_name}}<br>
<strong>Date:</strong> {{class_date}}<br>
<strong>Status:</strong> <span style="color:{{status_color}};font-weight:600;">{{status}}</span></p>
</td></tr></table>
<p style="color:#4a5568;margin:0 0 24px;font-size:16px;line-height:1.6;">
If you have any questions, please contact the school office.</p>`,
  },

  payment_confirmation: {
    subject: "Payment Confirmation — {{invoice_number}}",
    requiredFields: ["recipient_name", "invoice_number", "course_name", "amount", "currency"],
    body: `<h2 style="color:#1a365d;margin:0 0 16px;font-size:20px;">Payment Confirmation</h2>
<p style="color:#4a5568;margin:0 0 16px;font-size:16px;line-height:1.6;">Dear {{recipient_name}},</p>
<p style="color:#4a5568;margin:0 0 24px;font-size:16px;line-height:1.6;">
We've received your payment. Here are the details:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7fafc;border-radius:6px;margin:0 0 24px;">
<tr><td style="padding:20px;">
<p style="color:#718096;margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Payment Details</p>
<p style="color:#2d3748;margin:0;font-size:15px;line-height:1.8;">
<strong>Invoice:</strong> {{invoice_number}}<br>
<strong>Course:</strong> {{course_name}}<br>
<strong>Amount:</strong> {{currency}} {{amount}}<br>
<strong>Date:</strong> {{payment_date}}<br>
<strong>Status:</strong> <span style="color:#38a169;font-weight:600;">Paid</span></p>
</td></tr></table>
<p style="color:#4a5568;margin:0 0 24px;font-size:16px;line-height:1.6;">
Thank you for your payment. A receipt has been sent to your email.</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="{{portal_url}}" style="display:inline-block;background-color:#1a365d;color:#ffffff;padding:12px 32px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">View Invoice</a>
</td></tr></table>`,
  },

  message_received: {
    subject: "New Message from {{sender_name}}",
    requiredFields: ["recipient_name", "sender_name", "student_name", "message_snippet"],
    body: `<h2 style="color:#1a365d;margin:0 0 16px;font-size:20px;">New Message</h2>
<p style="color:#4a5568;margin:0 0 16px;font-size:16px;line-height:1.6;">Dear {{recipient_name}},</p>
<p style="color:#4a5568;margin:0 0 24px;font-size:16px;line-height:1.6;">
You have a new message from <strong>{{sender_name}}</strong> regarding <strong>{{student_name}}</strong>.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7fafc;border-left:4px solid #1a365d;border-radius:6px;margin:0 0 24px;">
<tr><td style="padding:20px;">
<p style="color:#718096;margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Message Preview</p>
<p style="color:#2d3748;margin:0;font-size:15px;line-height:1.6;font-style:italic;">
"{{message_snippet}}"</p>
</td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="{{portal_url}}" style="display:inline-block;background-color:#1a365d;color:#ffffff;padding:12px 32px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">Read Full Message</a>
</td></tr></table>`,
  },

  enrollment_confirmation: {
    subject: "Enrollment Confirmed — {{course_name}}",
    requiredFields: ["recipient_name", "course_name", "start_date", "instructor_name"],
    body: `<h2 style="color:#1a365d;margin:0 0 16px;font-size:20px;">Enrollment Confirmed</h2>
<p style="color:#4a5568;margin:0 0 16px;font-size:16px;line-height:1.6;">Dear {{recipient_name}},</p>
<p style="color:#4a5568;margin:0 0 24px;font-size:16px;line-height:1.6;">
Your enrollment in <strong>{{course_name}}</strong> has been confirmed. Welcome to the class!</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7fafc;border-radius:6px;margin:0 0 24px;">
<tr><td style="padding:20px;">
<p style="color:#718096;margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Enrollment Details</p>
<p style="color:#2d3748;margin:0;font-size:15px;line-height:1.8;">
<strong>Course:</strong> {{course_name}}<br>
<strong>Start Date:</strong> {{start_date}}<br>
<strong>Schedule:</strong> {{schedule}}<br>
<strong>Instructor:</strong> {{instructor_name}}<br>
<strong>Location:</strong> {{location}}</p>
</td></tr></table>
<p style="color:#4a5568;margin:0 0 24px;font-size:16px;line-height:1.6;">
We look forward to seeing you in class. Log in to view your schedule and any pre-course materials.</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="{{portal_url}}" style="display:inline-block;background-color:#1a365d;color:#ffffff;padding:12px 32px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">View My Schedule</a>
</td></tr></table>`,
  },
};

// ═══════════════════════════════════════════════════════════
// TEMPLATE RENDERING
// ═══════════════════════════════════════════════════════════

function renderTemplate(html: string, data: Record<string, string>): string {
  let rendered = html;
  for (const [key, value] of Object.entries(data)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value ?? "");
  }
  rendered = rendered.replaceAll(/\{\{[^}]+\}\}/g, "");
  return rendered;
}

// ═══════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════

async function checkRateLimit(tenantId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("email_logs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "sent")
    .gte("created_at", oneHourAgo);
  return (count ?? 0) < RATE_LIMIT;
}

// ═══════════════════════════════════════════════════════════
// SENDGRID
// ═══════════════════════════════════════════════════════════

async function sendViaSendGrid(to: string, subject: string, html: string) {
  if (!SENDGRID_API_KEY) {
    console.log(`[send-template-email] Dev mode — would send to ${to}: ${subject}`);
    return { ok: true, messageId: `dev_${Date.now()}` };
  }

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    });

    if (res.ok || res.status === 202) {
      return { ok: true, messageId: res.headers.get("x-message-id") || `sg_${Date.now()}` };
    }

    const errBody = await res.text();
    console.error(`SendGrid error ${res.status}:`, errBody);
    return { ok: false, error: errBody };
  } catch (err) {
    console.error("SendGrid request failed:", err);
    return { ok: false, error: String(err) };
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // Verify JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Missing authorization", { status: 401, headers: corsHeaders });
  }

  const token = authHeader.replace("Bearer ", "");
  let userId: string;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    userId = payload.sub;
  } catch {
    return new Response(JSON.stringify({ status: "error", reason: "Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get caller profile
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, tenant_id, role")
    .eq("id", userId)
    .single();

  if (profileErr || !profile) {
    return new Response(JSON.stringify({ status: "error", reason: "Profile not found" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ status: "error", reason: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { template_id, recipient_email, recipient_name, data } = body;

  // Validate template_id
  if (!template_id || !TEMPLATES[template_id as string]) {
    return new Response(
      JSON.stringify({
        status: "error",
        reason: `Invalid template_id. Valid: ${Object.keys(TEMPLATES).join(", ")}`,
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validate recipient
  if (!recipient_email) {
    return new Response(
      JSON.stringify({ status: "error", reason: "recipient_email is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const template = TEMPLATES[template_id as string];
  const templateData = (data ?? {}) as Record<string, string>;

  if (recipient_name && !templateData.recipient_name) {
    templateData.recipient_name = recipient_name as string;
  }

  const missingFields = template.requiredFields.filter((f) => !templateData[f]);
  if (missingFields.length > 0) {
    return new Response(
      JSON.stringify({ status: "error", reason: `Missing required fields: ${missingFields.join(", ")}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Rate limit
  if (!(await checkRateLimit(profile.tenant_id))) {
    await supabase.from("email_logs").insert({
      tenant_id: profile.tenant_id,
      template_id: template_id as string,
      recipient_email,
      recipient_name: recipient_name || null,
      subject: "[rate limited]",
      status: "rate_limited",
      metadata: templateData,
    });
    return new Response(
      JSON.stringify({ status: "error", reason: "Rate limit exceeded (1000/hour)" }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Render
  const html = wrapBody(renderTemplate(template.body, templateData));
  const subject = renderSubject(template.subject, templateData);

  // Send
  const result = await sendViaSendGrid(recipient_email as string, subject, html);

  // Log
  const { data: emailLog } = await supabase
    .from("email_logs")
    .insert({
      tenant_id: profile.tenant_id,
      template_id: template_id as string,
      recipient_email,
      recipient_name: recipient_name || null,
      subject,
      status: result.ok ? "sent" : "failed",
      provider_message_id: result.messageId || null,
      error_message: result.error || null,
      metadata: templateData,
    })
    .select("id")
    .single();

  if (result.ok) {
    return new Response(
      JSON.stringify({ status: "sent", message_id: result.messageId, email_log_id: emailLog?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } else {
    return new Response(
      JSON.stringify({ status: "error", reason: result.error || "Send failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function renderSubject(subject: string, data: Record<string, string>): string {
  let rendered = subject;
  for (const [key, value] of Object.entries(data)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value ?? "");
  }
  return rendered;
}
