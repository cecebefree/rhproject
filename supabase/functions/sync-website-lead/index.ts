// sync-website-lead — Bridge website forms → Front Desk CRM
// POST /functions/v1/sync-website-lead
//
// Public endpoint (no JWT required). Called by Lovable hosted forms.
// Creates a lead in front_desk.leads + front_desk.inquiries from website form submissions.
//
// Input: { name, email, phone?, message?, source_type, curriculum_interest?, timezone?,
//          country?, relation?, currency?, language?, faith?, role_title?, call_format?,
//          timezone_window?, preferred_date?, student_age? }
// Output: { status: "received", lead_id, ticket } or error
//
// source_type values: contact_form | live_call_booking | enrollment_call_booking | teacher_application
//
// Dedup: if a lead with the same email already exists, returns 200 (idempotent).
// Tags are auto-assigned based on source_type + extra fields.
// Ticket format: RH-{first 8 chars of UUID}
//
// Also inserts into front_desk.inquiries for SPA Front Desk view.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const VALID_SOURCE_TYPES = new Set([
  "contact_form",
  "live_call_booking",
  "enrollment_call_booking",
  "teacher_application",
  "registration",
]);

const SOURCE_TAG_MAP: Record<string, string[]> = {
  contact_form: ["General Enquiry"],
  live_call_booking: ["Live Call Request"],
  enrollment_call_booking: ["Enrolment Call Request"],
  teacher_application: ["Teacher Application"],
  registration: ["Registration"],
};

const SOURCE_LABEL_MAP: Record<string, string> = {
  contact_form: "Contact Form",
  live_call_booking: "Live Call",
  enrollment_call_booking: "Enrollment Call",
  teacher_application: "Teacher Application",
  registration: "Registration",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Content-Type": "application/json",
};

function reject(status: number, code: string, detail?: string) {
  return new Response(
    JSON.stringify({ error: code, ...(detail ? { detail } : {}) }),
    { status, headers: corsHeaders }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return reject(405, "method_not_allowed");

  // ── Parse body ──────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) throw new Error();
  } catch {
    return reject(400, "invalid_json");
  }

  // ── Validate email (required) ───────────────────────────
  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  const email = emailRaw.toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return reject(400, "invalid_email", "Valid email is required");
  }

  // ── Validate source_type (required) ─────────────────────
  const sourceType = typeof body.source_type === "string" ? body.source_type.trim() : "";
  if (!VALID_SOURCE_TYPES.has(sourceType)) {
    return reject(400, "invalid_source_type", `Must be one of: ${[...VALID_SOURCE_TYPES].join(", ")}`);
  }

  // ── Extract optional fields ─────────────────────────────
  let name: string | null = null;
  if (typeof body.name === "string") {
    name = body.name.trim().slice(0, 120) || null;
  }

  let phone: string | null = null;
  if (typeof body.phone === "string") {
    phone = body.phone.trim().slice(0, 32) || null;
  }

  let message: string | null = null;
  if (typeof body.message === "string") {
    message = body.message.trim().slice(0, 2000) || null;
  }

  let curriculumInterest: string | null = null;
  if (typeof body.curriculum_interest === "string") {
    curriculumInterest = body.curriculum_interest.trim().slice(0, 100) || null;
  }

  let timezone: string | null = null;
  if (typeof body.timezone === "string") {
    timezone = body.timezone.trim().slice(0, 64) || null;
  }

  // ── Extract extra fields (Registration, Careers, Call booking) ──
  let country: string | null = null;
  if (typeof body.country === "string") {
    country = body.country.trim().slice(0, 100) || null;
  }

  let relation: string | null = null;
  if (typeof body.relation === "string") {
    relation = body.relation.trim().slice(0, 50) || null;
  }

  let currency: string | null = null;
  if (typeof body.currency === "string") {
    currency = body.currency.trim().slice(0, 10) || null;
  }

  let language: string | null = null;
  if (typeof body.language === "string") {
    language = body.language.trim().slice(0, 50) || null;
  }

  let faith: string | null = null;
  if (typeof body.faith === "string") {
    faith = body.faith.trim().slice(0, 50) || null;
  }

  let roleTitle: string | null = null;
  if (typeof body.role_title === "string") {
    roleTitle = body.role_title.trim().slice(0, 100) || null;
  }

  let callFormat: string | null = null;
  if (typeof body.call_format === "string") {
    callFormat = body.call_format.trim().slice(0, 50) || null;
  }

  let timezoneWindow: string | null = null;
  if (typeof body.timezone_window === "string") {
    timezoneWindow = body.timezone_window.trim().slice(0, 50) || null;
  }

  let preferredDate: string | null = null;
  if (typeof body.preferred_date === "string") {
    preferredDate = body.preferred_date.trim().slice(0, 30) || null;
  }

  let studentAge: number | null = null;
  if (typeof body.student_age === "number" && body.student_age > 0 && body.student_age < 25) {
    studentAge = Math.floor(body.student_age);
  }

  let linkedIn: string | null = null;
  if (typeof body.linkedin === "string") {
    linkedIn = body.linkedin.trim().slice(0, 500) || null;
  }

  let coverNote: string | null = null;
  if (typeof body.cover_note === "string") {
    coverNote = body.cover_note.trim().slice(0, 2000) || null;
  }

  // ── Supabase admin client ───────────────────────────────
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // ── Resolve tenant ──────────────────────────────────────
  const { data: tenant, error: tenantErr } = await admin
    .from("tenant_devotional")
    .select("id")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (tenantErr) return reject(500, "tenant_lookup_failed", tenantErr.message);
  if (!tenant) return reject(500, "no_active_tenant", "No active tenant_devotional found");

  // ── Dedup check ─────────────────────────────────────────
  const { data: existing } = await admin
    .schema("front_desk")
    .from("leads")
    .select("id")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Idempotent: lead already exists, return success with ticket
    const existingTicket = `RH-${existing.id.slice(0, 8)}`;
    return new Response(
      JSON.stringify({ status: "received", lead_id: existing.id, ticket: existingTicket, note: "lead_already_exists" }),
      { status: 200, headers: corsHeaders }
    );
  }

  // ── Build lead record ───────────────────────────────────
  const tags = [...(SOURCE_TAG_MAP[sourceType] || ["General Enquiry"])];
  const sourceLabel = SOURCE_LABEL_MAP[sourceType] || sourceType;

  // Add extra tags based on fields
  if (curriculumInterest) tags.push(`curriculum:${curriculumInterest}`);
  if (country) tags.push(`country:${country}`);
  if (relation) tags.push(`relation:${relation}`);
  if (currency) tags.push(`currency:${currency}`);
  if (language) tags.push(`language:${language}`);
  if (faith) tags.push(`faith:${faith}`);
  if (roleTitle) tags.push(`role:${roleTitle}`);
  if (callFormat) tags.push(`format:${callFormat}`);
  if (timezoneWindow) tags.push(`window:${timezoneWindow}`);

  // Build notes with all available info
  const notesParts: string[] = [];
  if (studentAge) notesParts.push(`Student age: ${studentAge}`);
  if (curriculumInterest) notesParts.push(`Curriculum interest: ${curriculumInterest}`);
  if (preferredDate) notesParts.push(`Preferred date: ${preferredDate}`);
  if (linkedIn) notesParts.push(`LinkedIn/Portfolio: ${linkedIn}`);
  if (coverNote) notesParts.push(`Cover note: ${coverNote}`);
  if (message) notesParts.push(message);
  const notes = notesParts.length > 0 ? notesParts.join("\n") : null;

  // ── Generate ticket number ───────────────────────────────
  const ticketRaw = crypto.randomUUID();
  const ticket = `RH-${ticketRaw.slice(0, 8)}`;

  // ── Determine status based on source_type ────────────────
  const statusMap: Record<string, string> = {
    contact_form: "enquiry",
    live_call_booking: "qualified",
    enrollment_call_booking: "qualified",
    teacher_application: "enquiry",
    registration: "qualified",
  };
  const leadStatus = statusMap[sourceType] || "enquiry";

  // ── Determine callback status for call bookings ──────────
  const callbackStatus = (sourceType === "live_call_booking" || sourceType === "enrollment_call_booking")
    ? "pending" : null;

  // ── Insert lead ─────────────────────────────────────────
  const { data: lead, error: insertErr } = await admin
    .schema("front_desk")
    .from("leads")
    .insert({
      tenant_id: tenant.id,
      name,
      email,
      phone,
      notes,
      source: sourceLabel,
      source_type: sourceType,
      tags,
      status: leadStatus,
      time_zone: timezone,
      existing_profile: false,
      callback_scheduled_at: preferredDate || null,
      callback_status: callbackStatus,
    })
    .select("id")
    .single();

  if (insertErr) return reject(500, "lead_insert_failed", insertErr.message);

  // ── Insert into front_desk.inquiries (SPA view) ──────────
  const programInterestMap: Record<string, string> = {
    contact_form: curriculumInterest || "Other",
    live_call_booking: curriculumInterest || "Other",
    enrollment_call_booking: curriculumInterest || "Other",
    teacher_application: "Other",
  };
  const sourceMap: Record<string, string> = {
    contact_form: "website_form",
    live_call_booking: "callback_request",
    enrollment_call_booking: "callback_request",
    teacher_application: "website_form",
  };

  const inquiryEmail = email;
  // Skip if email already exists in inquiries (dedup)
  const { data: existingInquiry } = await admin
    .schema("front_desk")
    .from("inquiries")
    .select("id")
    .ilike("contact_email", inquiryEmail)
    .limit(1)
    .maybeSingle();

  if (!existingInquiry) {
    const inquiryInsert: Record<string, unknown> = {
      contact_email: inquiryEmail,
      contact_name: name || "",
      contact_phone: phone || null,
      country_residence: country || null,
      timezone: timezone || null,
      source: sourceMap[sourceType] || "website_form",
      program_interest: programInterestMap[sourceType] || "Other",
      message_body: notes || null,
      enrollment_status: "pending",
    };
    if (studentAge) inquiryInsert.age_or_child_age = studentAge;
    if (preferredDate) inquiryInsert.call_scheduled_at = preferredDate;

    await admin.schema("front_desk").from("inquiries").insert(inquiryInsert);
  }

  // ── Audit log ───────────────────────────────────────────
  await admin.schema("front_desk").from("lead_source_log").insert({
    lead_id: lead.id,
    tenant_id: tenant.id,
    source_type: sourceType,
    sync_method: "edge_function",
    email,
  });

  // ── Auto-reply email (fire-and-forget) ──────────────────
  // Don't block the response if email fails — lead is already created
  const autoReplyTemplateMap: Record<string, string> = {
    contact_form: "contact_form_acknowledgement",
    live_call_booking: "live_call_booking_acknowledgement",
    enrollment_call_booking: "enrollment_call_booking_acknowledgement",
    teacher_application: "teacher_application_acknowledgement",
  };

  const autoReplyTemplate = autoReplyTemplateMap[sourceType];
  if (autoReplyTemplate && name) {
    // Fire-and-forget: don't await
    admin.functions.invoke("send-auto-reply", {
      body: {
        recipient_email: email,
        recipient_name: name,
        template_key: autoReplyTemplate,
        data: {
          ticket,
          call_format: callFormat || "Encrypted video",
          timezone_window: timezoneWindow || "Local timezone",
          meeting_format: callFormat || "Encrypted video",
          curriculum_interest: curriculumInterest || "Undecided",
          role_title: roleTitle || "a teaching position",
        },
      },
    }).catch((err) => {
      // Log but don't fail — lead is already created
      console.error(`[sync-website-lead] Auto-reply failed for ${email}:`, err);
    });
  }

  // ── Success ─────────────────────────────────────────────
  return new Response(
    JSON.stringify({ status: "received", lead_id: lead.id, ticket }),
    { status: 201, headers: corsHeaders }
  );
});
