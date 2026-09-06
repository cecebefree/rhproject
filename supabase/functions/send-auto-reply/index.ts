// send-auto-reply — Public auto-reply emails for website form submissions
// POST /functions/v1/send-auto-reply
//
// No JWT required. Called by other service_role EFs (sync-website-lead, etc.)
// Sends acknowledgement emails for: contact form, call booking, teacher application.
//
// Input: { recipient_email, recipient_name, template_key, data?: {...} }
// Output: { status: "sent" } or { status: "error" }

import { createClient } from "jsr:@supabase/supabase-js@2";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const FROM_EMAIL = "admissions@redhouse.school";
const FROM_NAME = "Redhouse Admissions";

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Content-Type": "application/json",
};

// ═══════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════

function getHeader(): string {
  return `<tr><td style="background-color:#273946;padding:32px 40px;text-align:center;">
<h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:600;font-family:'EB Garamond',serif;">Redhouse</h1>
<p style="color:#E8A020;margin:8px 0 0;font-size:13px;letter-spacing:0.12em;font-family:'Source Sans 3',sans-serif;">GLOBAL PRIVATE ONLINE EDUCATION</p></td></tr>`;
}

function getFooter(): string {
  return `<tr><td style="background-color:#f8f7f6;padding:24px 40px;border-top:1px solid rgba(195,199,204,0.3);">
<p style="color:#54626c;margin:0 0 8px;font-size:13px;text-align:center;font-family:'Source Sans 3',sans-serif;">
This is an automated message from Redhouse Admissions. Please do not reply to this email.</p>
<p style="color:#54626c;margin:0;font-size:12px;text-align:center;font-family:'Source Sans 3',sans-serif;">
Redhouse — Global Private Online Education</p></td></tr>`;
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

interface TemplateDef {
  subject: string;
  body: string;
  requiredFields: string[];
}

const TEMPLATES: Record<string, TemplateDef> = {
  contact_form_acknowledgement: {
    subject: "We received your enquiry — Redhouse",
    requiredFields: ["recipient_name"],
    body: `
<h2 style="color:#273946;margin:0 0 16px;font-size:22px;font-family:'EB Garamber',serif;">Thank you for reaching out</h2>
<p style="color:#54626c;margin:0 0 16px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
Dear {{recipient_name}},</p>
<p style="color:#54626c;margin:0 0 24px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
We have received your enquiry and a member of our admissions team will personally review your message and respond within <strong>one working day</strong>.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf9f6;border-radius:6px;margin:0 0 24px;border:1px solid rgba(195,199,204,0.3);">
<tr><td style="padding:20px;">
<p style="color:#54626c;margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.12px;font-family:'Source Sans 3',sans-serif;font-weight:600;">What happens next</p>
<p style="color:#273946;margin:0;font-size:15px;line-height:1.8;font-family:'Source Sans 3',sans-serif;">
A personal response from our admissions office — never a template.<br>
If you have provided a phone number, we may also reach out by phone or encrypted video call.</p>
</td></tr></table>
<p style="color:#54626c;margin:0 0 24px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
In the meantime, you may find it helpful to explore:</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="48%" style="padding-right:2%;">
<a href="https://redhouse.lovable.app/core/cambridge" style="display:block;background-color:#faf9f6;border:1px solid rgba(195,199,204,0.3);border-radius:6px;padding:16px;text-decoration:none;">
<p style="color:#273946;margin:0 0 4px;font-size:14px;font-weight:600;font-family:'Source Sans 3',sans-serif;">Cambridge Curriculum</p>
<p style="color:#54626c;margin:0;font-size:12px;font-family:'Source Sans 3',sans-serif;">Grades 3–12</p></a>
</td>
<td width="48%" style="padding-left:2%;">
<a href="https://redhouse.lovable.app/core/ib" style="display:block;background-color:#faf9f6;border:1px solid rgba(195,199,204,0.3);border-radius:6px;padding:16px;text-decoration:none;">
<p style="color:#273946;margin:0 0 4px;font-size:14px;font-weight:600;font-family:'Source Sans 3',sans-serif;">IB Curriculum</p>
<p style="color:#54626c;margin:0;font-size:12px;font-family:'Source Sans 3',sans-serif;">Grades 3–12</p></a>
</td>
</tr></table>
<p style="color:#54626c;margin:24px 0 0;font-size:14px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
Warm regards,<br><strong>The Redhouse Admissions Team</strong></p>`,
  },

  live_call_booking_acknowledgement: {
    subject: "Your call request — Redhouse",
    requiredFields: ["recipient_name"],
    body: `
<h2 style="color:#273946;margin:0 0 16px;font-size:22px;font-family:'EB Garamond',serif;">Call request received</h2>
<p style="color:#54626c;margin:0 0 16px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
Dear {{recipient_name}},</p>
<p style="color:#54626c;margin:0 0 24px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
Thank you for requesting a brief introductory call with our admissions office. We will confirm your <strong>15-minute slot within one working day</strong>.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf9f6;border-radius:6px;margin:0 0 24px;border:1px solid rgba(195,199,204,0.3);">
<tr><td style="padding:20px;">
<p style="color:#54626c;margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;font-family:'Source Sans 3',sans-serif;font-weight:600;">Call details</p>
<p style="color:#273946;margin:0;font-size:15px;line-height:1.8;font-family:'Source Sans 3',sans-serif;">
<strong>Format:</strong> {{call_format}}<br>
<strong>Preferred window:</strong> {{timezone_window}}<br>
<strong>Curriculum interest:</strong> {{curriculum_interest}}</p>
</td></tr></table>
<p style="color:#54626c;margin:0 0 16px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
If you need to reschedule, simply reply to the confirmation email once received.</p>
<p style="color:#54626c;margin:0;font-size:14px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
Warm regards,<br><strong>The Redhouse Admissions Team</strong></p>`,
  },

  enrollment_call_booking_acknowledgement: {
    subject: "Your enrolment meeting request — Redhouse",
    requiredFields: ["recipient_name"],
    body: `
<h2 style="color:#273946;margin:0 0 16px;font-size:22px;font-family:'EB Garamond',serif;">Enrolment meeting requested</h2>
<p style="color:#54626c;margin:0 0 16px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
Dear {{recipient_name}},</p>
<p style="color:#54626c;margin:0 0 24px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
Thank you for requesting a private enrolment meeting with our head of admissions. We will confirm your <strong>one-hour slot within one working day</strong>.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf9f6;border-radius:6px;margin:0 0 24px;border:1px solid rgba(195,199,204,0.3);">
<tr><td style="padding:20px;">
<p style="color:#54626c;margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;font-family:'Source Sans 3',sans-serif;font-weight:600;">Meeting details</p>
<p style="color:#273946;margin:0;font-size:15px;line-height:1.8;font-family:'Source Sans 3',sans-serif;">
<strong>Format:</strong> {{meeting_format}}<br>
<strong>Preferred window:</strong> {{timezone_window}}<br>
<strong>Curriculum interest:</strong> {{curriculum_interest}}</p>
</td></tr></table>
<p style="color:#54626c;margin:0 0 16px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
This is a private, unhurried conversation — we look forward to learning about your family's needs.</p>
<p style="color:#54626c;margin:0;font-size:14px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
Warm regards,<br><strong>The Redhouse Admissions Team</strong></p>`,
  },

  teacher_application_acknowledgement: {
    subject: "Application received — Teachers & Careers at Redhouse",
    requiredFields: ["recipient_name", "role_title"],
    body: `
<h2 style="color:#273946;margin:0 0 16px;font-size:22px;font-family:'EB Garamond',serif;">Thank you for your application</h2>
<p style="color:#54626c;margin:0 0 16px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
Dear {{recipient_name}},</p>
<p style="color:#54626c;margin:0 0 24px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
We have received your application for <strong>{{role_title}}</strong> at Redhouse. Every application is read personally by the head of faculty.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf9f6;border-radius:6px;margin:0 0 24px;border:1px solid rgba(195,199,204,0.3);">
<tr><td style="padding:20px;">
<p style="color:#54626c;margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;font-family:'Source Sans 3',sans-serif;font-weight:600;">What to expect</p>
<p style="color:#273946;margin:0;font-size:15px;line-height:1.8;font-family:'Source Sans 3',sans-serif;">
Your application will be reviewed within <strong>5 working days</strong>.<br>
Shortlisted candidates will be contacted for an interview.<br>
We offer free full online training for qualifying teachers.</p>
</td></tr></table>
<p style="color:#54626c;margin:0 0 16px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
If you have additional materials to share, simply reply to this email.</p>
<p style="color:#54626c;margin:0;font-size:14px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
Warm regards,<br><strong>The Redhouse Faculty Team</strong></p>`,
  },

  registration_confirmation: {
    subject: "Registration confirmed — Redhouse",
    requiredFields: ["recipient_name", "student_name", "course_name"],
    body: `
<h2 style="color:#273946;margin:0 0 16px;font-size:22px;font-family:'EB Garamond',serif;">Registration confirmed</h2>
<p style="color:#54626c;margin:0 0 16px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
Dear {{recipient_name}},</p>
<p style="color:#54626c;margin:0 0 24px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
We are pleased to confirm the registration of <strong>{{student_name}}</strong> for <strong>{{course_name}}</strong> at Redhouse.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf9f6;border-radius:6px;margin:0 0 24px;border:1px solid rgba(195,199,204,0.3);">
<tr><td style="padding:20px;">
<p style="color:#54626c;margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;font-family:'Source Sans 3',sans-serif;font-weight:600;">What happens next</p>
<p style="color:#273946;margin:0;font-size:15px;line-height:1.8;font-family:'Source Sans 3',sans-serif;">
A contract will be generated for your review and signature.<br>
You will receive access details once the contract is signed.<br>
Our team will be in touch with any further instructions.</p>
</td></tr></table>
<p style="color:#54626c;margin:0;font-size:14px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
Warm regards,<br><strong>The Redhouse Admissions Team</strong></p>`,
  },

  contract_created: {
    subject: "Your contract is ready — Redhouse",
    requiredFields: ["recipient_name", "student_name", "contract_title"],
    body: `
<h2 style="color:#273946;margin:0 0 16px;font-size:22px;font-family:'EB Garamond',serif;">Contract ready for review</h2>
<p style="color:#54626c;margin:0 0 16px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
Dear {{recipient_name}},</p>
<p style="color:#54626c;margin:0 0 24px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
A contract has been generated for <strong>{{student_name}}</strong> — <strong>{{contract_title}}</strong>.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf9f6;border-radius:6px;margin:0 0 24px;border:1px solid rgba(195,199,204,0.3);">
<tr><td style="padding:20px;">
<p style="color:#54626c;margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;font-family:'Source Sans 3',sans-serif;font-weight:600;">Next steps</p>
<p style="color:#273946;margin:0;font-size:15px;line-height:1.8;font-family:'Source Sans 3',sans-serif;">
Please review the contract terms at your earliest convenience.<br>
Once signed, your student's enrolment will be confirmed.<br>
Contact us if you have any questions.</p>
</td></tr></table>
<p style="color:#54626c;margin:0;font-size:14px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
Warm regards,<br><strong>The Redhouse Admissions Team</strong></p>`,
  },

  payment_received: {
    subject: "Payment received — Redhouse",
    requiredFields: ["recipient_name", "student_name", "amount", "payment_date"],
    body: `
<h2 style="color:#273946;margin:0 0 16px;font-size:22px;font-family:'EB Garamond',serif;">Payment received</h2>
<p style="color:#54626c;margin:0 0 16px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
Dear {{recipient_name}},</p>
<p style="color:#54626c;margin:0 0 24px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
We have received a payment of <strong>{{amount}}</strong> for <strong>{{student_name}}</strong>.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf9f6;border-radius:6px;margin:0 0 24px;border:1px solid rgba(195,199,204,0.3);">
<tr><td style="padding:20px;">
<p style="color:#54626c;margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;font-family:'Source Sans 3',sans-serif;font-weight:600;">Payment details</p>
<p style="color:#273946;margin:0;font-size:15px;line-height:1.8;font-family:'Source Sans 3',sans-serif;">
<strong>Amount:</strong> {{amount}}<br>
<strong>Date:</strong> {{payment_date}}<br>
<strong>Student:</strong> {{student_name}}</p>
</td></tr></table>
<p style="color:#54626c;margin:0;font-size:14px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
Warm regards,<br><strong>The Redhouse Admissions Team</strong></p>`,
  },

  debit_order_failed: {
    subject: "Debit order failed — Action required — Redhouse",
    requiredFields: ["recipient_name", "student_name", "amount", "failure_reason"],
    body: `
<h2 style="color:#e53e3e;margin:0 0 16px;font-size:22px;font-family:'EB Garamond',serif;">Debit order failed</h2>
<p style="color:#54626c;margin:0 0 16px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
Dear {{recipient_name}},</p>
<p style="color:#54626c;margin:0 0 24px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
We were unable to process a debit order of <strong>{{amount}}</strong> for <strong>{{student_name}}</strong>.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border-radius:6px;margin:0 0 24px;border:1px solid rgba(229,62,62,0.3);">
<tr><td style="padding:20px;">
<p style="color:#e53e3e;margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;font-family:'Source Sans 3',sans-serif;font-weight:600;">Failure details</p>
<p style="color:#273946;margin:0;font-size:15px;line-height:1.8;font-family:'Source Sans 3',sans-serif;">
<strong>Amount:</strong> {{amount}}<br>
<strong>Student:</strong> {{student_name}}<br>
<strong>Reason:</strong> {{failure_reason}}</p>
</td></tr></table>
<p style="color:#54626c;margin:0 0 16px;font-size:16px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
Please update your payment method or contact us to resolve this issue. If not resolved, future debit attempts may also fail.</p>
<p style="color:#54626c;margin:0;font-size:14px;line-height:1.6;font-family:'Source Sans 3',sans-serif;">
Warm regards,<br><strong>The Redhouse Admissions Team</strong></p>`,
  },
};

// ═══════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════

function renderTemplate(html: string, data: Record<string, string>): string {
  let rendered = html;
  for (const [key, value] of Object.entries(data)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value ?? "");
  }
  // Clean up any remaining placeholders
  rendered = rendered.replaceAll(/\{\{[^}]+\}\}/g, "");
  return rendered;
}

function renderSubject(subject: string, data: Record<string, string>): string {
  let rendered = subject;
  for (const [key, value] of Object.entries(data)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value ?? "");
  }
  return rendered;
}

// ═══════════════════════════════════════════════════════════
// SENDGRID
// ═══════════════════════════════════════════════════════════

async function sendViaSendGrid(to: string, subject: string, html: string) {
  if (!SENDGRID_API_KEY) {
    console.log(`[send-auto-reply] Dev mode — would send to ${to}: ${subject}`);
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
// HANDLER
// ═══════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: corsHeaders });
  }

  // ── Parse body ──────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) throw new Error();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: corsHeaders });
  }

  // ── Validate ────────────────────────────────────────────
  const templateKey = typeof body.template_key === "string" ? body.template_key.trim() : "";
  if (!templateKey || !TEMPLATES[templateKey]) {
    return new Response(
      JSON.stringify({ error: "invalid_template_key", detail: `Valid: ${Object.keys(TEMPLATES).join(", ")}` }),
      { status: 400, headers: corsHeaders }
    );
  }

  const recipientEmail = typeof body.recipient_email === "string" ? body.recipient_email.trim() : "";
  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return new Response(
      JSON.stringify({ error: "invalid_recipient_email" }),
      { status: 400, headers: corsHeaders }
    );
  }

  const recipientName = typeof body.recipient_name === "string" ? body.recipient_name.trim() : "there";
  const templateData = (body.data ?? {}) as Record<string, string>;
  templateData.recipient_name = recipientName;

  // ── Render ──────────────────────────────────────────────
  const template = TEMPLATES[templateKey];
  const missingFields = template.requiredFields.filter((f) => !templateData[f]);
  if (missingFields.length > 0) {
    return new Response(
      JSON.stringify({ error: "missing_fields", detail: missingFields.join(", ") }),
      { status: 400, headers: corsHeaders }
    );
  }

  const html = wrapBody(renderTemplate(template.body, templateData));
  const subject = renderSubject(template.subject, templateData);

  // ── Send ────────────────────────────────────────────────
  const result = await sendViaSendGrid(recipientEmail, subject, html);

  // ── Log ─────────────────────────────────────────────────
  // Log to email_logs (same table as send-template-email)
  // Resolve tenant from the recipient or default to first active tenant
  const { data: tenant } = await supabase
    .from("tenant_devotional")
    .select("id")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (tenant) {
    await supabase.from("email_logs").insert({
      tenant_id: tenant.id,
      template_id: templateKey,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      subject,
      status: result.ok ? "sent" : "failed",
      provider_message_id: result.messageId || null,
      error_message: result.error || null,
      metadata: templateData,
    });
  }

  // ── Response ────────────────────────────────────────────
  if (result.ok) {
    return new Response(
      JSON.stringify({ status: "sent", template: templateKey, to: recipientEmail }),
      { status: 200, headers: corsHeaders }
    );
  } else {
    return new Response(
      JSON.stringify({ error: "send_failed", detail: result.error }),
      { status: 500, headers: corsHeaders }
    );
  }
});
