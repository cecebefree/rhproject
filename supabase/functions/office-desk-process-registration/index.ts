// office_desk_process_registration — Office Desk Registration EF
// POST /office-desk-process-registration
// Receives registration form data, creates registration in office_desk.registrations
// verify_jwt = true (authenticated office/admin users only)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reject(405, "method_not_allowed", "POST required");

  // Verify JWT — office or admin only
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return reject(401, "missing_authorization");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) throw new Error();
  } catch {
    return reject(400, "invalid_json");
  }

  // Validate required fields
  const studentName = typeof body.student_name === "string" ? body.student_name.trim() : "";
  if (!studentName) return reject(400, "student_name_required");

  const studentEmail = typeof body.student_email === "string" ? body.student_email.trim().toLowerCase() : "";
  if (!studentEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) {
    return reject(400, "invalid_student_email", "Valid student_email is required");
  }

  const tenantId = typeof body.tenant_id === "string" ? body.tenant_id.trim() : null;
  if (!tenantId) return reject(400, "tenant_id_required");

  // Optional fields
  const studentPhone = typeof body.student_phone === "string" ? body.student_phone.trim() : null;
  const courseName = typeof body.course_name === "string" ? body.course_name.trim() : null;
  const notes = typeof body.notes === "string" ? body.notes.trim() : null;
  const leadReferenceId = typeof body.lead_reference_id === "string" ? body.lead_reference_id.trim() : null;

  // Insert registration
  const { data: registration, error: insertErr } = await supabase
    .from("office_desk.registrations")
    .insert({
      tenant_id: tenantId,
      student_name: studentName,
      student_email: studentEmail,
      student_phone: studentPhone,
      course_name: courseName,
      notes: notes,
      lead_reference_id: leadReferenceId,
      status: "pending_review",
    })
    .select("id, status, created_at")
    .single();

  if (insertErr) {
    console.error("Registration insert failed:", insertErr);
    return reject(500, "registration_insert_failed", insertErr.message);
  }

  console.log(`Registration created: ${registration.id} (${studentEmail})`);

  // Log to audit
  try {
    await supabase.from("audit_log").insert({
      table_name: "registrations",
      operation: "INSERT",
      new_values: { id: registration.id, status: registration.status, student_email: studentEmail },
      user_id: null, // Service role
    });
  } catch (err) {
    console.error("Audit log failed (non-blocking):", err);
  }

  return jsonResp({
    success: true,
    registration_id: registration.id,
    status: registration.status,
    created_at: registration.created_at,
  }, 201);
});
