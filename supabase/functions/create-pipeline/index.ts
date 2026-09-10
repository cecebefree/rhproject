// create-pipeline — Initialize enrollment pipeline from registration
// POST /create-pipeline
// Body: { registration_id: string, pipeline_type: 'family' | 'teacher' }
// verify_jwt: true (office/admin only)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return reject(405, "Method not allowed");
  }

  try {
    const { registration_id, pipeline_type } = await req.json();

    if (!registration_id || !pipeline_type) {
      return reject(400, "Missing required fields: registration_id, pipeline_type");
    }

    if (!["family", "teacher"].includes(pipeline_type)) {
      return reject(400, "pipeline_type must be 'family' or 'teacher'");
    }

    // Verify caller is office or admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return reject(401, "Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return reject(401, "Invalid or expired token");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile || !["office", "admin"].includes(profile.role)) {
      return reject(403, "Only office or admin roles can create pipelines");
    }

    // Get registration details
    const { data: registration, error: regError } = await supabase
      .from("office_desk.registrations")
      .select("*")
      .eq("id", registration_id)
      .single();

    if (regError || !registration) {
      return reject(404, "Registration not found");
    }

    // Check if pipeline already exists for this registration
    const { data: existingPipeline } = await supabase
      .from("office_desk.enrollment_pipelines")
      .select("id, status")
      .eq("registration_id", registration_id)
      .eq("pipeline_type", pipeline_type)
      .in("status", ["active", "on_hold"])
      .single();

    if (existingPipeline) {
      return reject(409, "Active pipeline already exists for this registration", existingPipeline.id);
    }

    // Generate unique form token
    const formToken = crypto.randomUUID();

    // Create pipeline
    const { data: pipeline, error: pipelineError } = await supabase
      .from("office_desk.enrollment_pipelines")
      .insert({
        tenant_id: profile.tenant_id,
        registration_id,
        lead_id: registration.lead_reference_id,
        pipeline_type,
        stage: "registration_confirmed",
        form_token: formToken,
        stage_history: JSON.stringify([
          {
            stage: "registration_confirmed",
            timestamp: new Date().toISOString(),
            actor: user.id,
            action: "pipeline_created",
          },
        ]),
      })
      .select()
      .single();

    if (pipelineError) {
      console.error("Pipeline creation failed:", pipelineError);
      return reject(500, "Failed to create pipeline", pipelineError.message);
    }

    // Update registration with pipeline link
    await supabase
      .from("office_desk.registrations")
      .update({ pipeline_id: pipeline.id })
      .eq("id", registration_id);

    return jsonResp({
      status: "success",
      pipeline_id: pipeline.id,
      form_token: formToken,
      stage: pipeline.stage,
    });
  } catch (err) {
    console.error("create-pipeline error:", err);
    return reject(500, "Internal server error", String(err));
  }
});
