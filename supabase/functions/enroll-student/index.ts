// enroll-student — Self-service enrollment for mobile students (Row 96)
// POST body: { class_id }
// Auth: JWT required (student identity from token)
// Creates: school_desk.enrollments row
// Uses service_role client (bypasses RLS — students cannot INSERT directly)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EnrollInput {
  class_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── 1. Auth ──────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing authorization" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const token = authHeader.replace("Bearer ", "");
  let userId: string;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    userId = payload.sub;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!userId) {
    return new Response(
      JSON.stringify({ error: "Invalid token: missing user ID" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── 2. Parse + validate ──────────────────────────────────
  let input: EnrollInput;
  try {
    input = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!input.class_id || typeof input.class_id !== "string") {
    return new Response(
      JSON.stringify({ error: "class_id is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── 3. Service-role client (bypasses RLS) ────────────────
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── 4. Verify course exists + is published ───────────────
  const { data: course, error: courseError } = await supabase
    .schema("school_desk")
    .from("courses")
    .select("id, tenant_id, status")
    .eq("id", input.class_id)
    .single();

  if (courseError || !course) {
    return new Response(
      JSON.stringify({ error: "Class not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (course.status !== "published") {
    return new Response(
      JSON.stringify({ error: "Class is not available for enrollment" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── 5. Check for existing active enrollment ──────────────
  const { data: existing } = await supabase
    .schema("school_desk")
    .from("enrollments")
    .select("id")
    .eq("course_id", input.class_id)
    .eq("student_id", userId)
    .maybeSingle();

  if (existing) {
    return new Response(
      JSON.stringify({ error: "Already enrolled in this class", enrollment_id: existing.id }),
      { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── 6. Create enrollment ─────────────────────────────────
  const { data: enrollment, error: enrollError } = await supabase
    .schema("school_desk")
    .from("enrollments")
    .insert({
      student_id: userId,
      course_id: input.class_id,
      purchased_at: new Date().toISOString(),
    })
    .select("id, purchased_at")
    .single();

  if (enrollError) {
    console.error("Enrollment insert failed:", enrollError);
    return new Response(
      JSON.stringify({ error: "Failed to create enrollment" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── 7. Return success ───────────────────────────────────
  return new Response(
    JSON.stringify({
      status: "enrolled",
      enrollment_id: enrollment.id,
      message: "Enrolled successfully",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
