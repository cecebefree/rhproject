// sync-website-lead — Bridge website forms → Front Desk CRM
// POST /functions/v1/sync-website-lead
//
// Public endpoint (no JWT required). Called by Lovable hosted forms.
// Creates a lead in front_desk.leads from website form submissions.
//
// Input: { name, email, phone?, message?, source_type, curriculum_interest?, timezone? }
// Output: { status: "received", lead_id } or error
//
// source_type values: contact_form | live_call_booking | enrollment_call_booking | teacher_application
//
// Dedup: if a lead with the same email already exists, returns 200 (idempotent).
// Tags are auto-assigned based on source_type.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const VALID_SOURCE_TYPES = new Set([
  "contact_form",
  "live_call_booking",
  "enrollment_call_booking",
  "teacher_application",
]);

const SOURCE_TAG_MAP: Record<string, string[]> = {
  contact_form: ["General Enquiry"],
  live_call_booking: ["Live Call Request"],
  enrollment_call_booking: ["Enrolment Call Request"],
  teacher_application: ["Teacher Application"],
};

const SOURCE_LABEL_MAP: Record<string, string> = {
  contact_form: "Contact Form",
  live_call_booking: "Live Call",
  enrollment_call_booking: "Enrollment Call",
  teacher_application: "Teacher Application",
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
    // Idempotent: lead already exists, return success
    return new Response(
      JSON.stringify({ status: "received", lead_id: existing.id, note: "lead_already_exists" }),
      { status: 200, headers: corsHeaders }
    );
  }

  // ── Build lead record ───────────────────────────────────
  const tags = SOURCE_TAG_MAP[sourceType] || ["General Enquiry"];
  const sourceLabel = SOURCE_LABEL_MAP[sourceType] || sourceType;

  // Build notes with curriculum interest and message
  const notesParts: string[] = [];
  if (curriculumInterest) notesParts.push(`Curriculum interest: ${curriculumInterest}`);
  if (message) notesParts.push(message);
  const notes = notesParts.length > 0 ? notesParts.join("\n") : null;

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
      status: "enquiry",
      time_zone: timezone,
      existing_profile: false,
    })
    .select("id")
    .single();

  if (insertErr) return reject(500, "lead_insert_failed", insertErr.message);

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
          call_format: typeof body.call_format === "string" ? body.call_format : "Encrypted video",
          timezone_window: typeof body.timezone_window === "string" ? body.timezone_window : "Local timezone",
          meeting_format: typeof body.call_format === "string" ? body.call_format : "Encrypted video",
          curriculum_interest: curriculumInterest || "Undecided",
          role_title: typeof body.role_title === "string" ? body.role_title : "a teaching position",
        },
      },
    }).catch((err) => {
      // Log but don't fail — lead is already created
      console.error(`[sync-website-lead] Auto-reply failed for ${email}:`, err);
    });
  }

  // ── Success ─────────────────────────────────────────────
  return new Response(
    JSON.stringify({ status: "received", lead_id: lead.id }),
    { status: 201, headers: corsHeaders }
  );
});
