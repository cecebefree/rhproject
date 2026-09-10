// submit-enrollment-form — Receive form submission, store form data
// POST /submit-enrollment-form
// Body: { form_token: string, form_data: object }
// verify_jwt: false (public — family submits via link)

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
    const { form_token, form_data } = await req.json();

    if (!form_token || !form_data) {
      return reject(400, "Missing required fields: form_token, form_data");
    }

    // Find pipeline by form token
    const { data: pipeline, error: pipeError } = await supabase
      .from("office_desk.enrollment_pipelines")
      .select("*")
      .eq("form_token", form_token)
      .single();

    if (pipeError || !pipeline) {
      return reject(404, "Invalid or expired form token");
    }

    if (pipeline.stage !== "form_sent") {
      return reject(400, `Pipeline is in stage '${pipeline.stage}', expected 'form_sent'`);
    }

    if (pipeline.status !== "active") {
      return reject(400, `Pipeline status is '${pipeline.status}', expected 'active'`);
    }

    // Validate required form_data fields
    const errors: string[] = [];

    if (pipeline.pipeline_type === "family") {
      if (!form_data.family?.family_name) errors.push("family.family_name is required");
      if (!form_data.family?.contact_email) errors.push("family.contact_email is required");
      if (!form_data.family?.contact_phone) errors.push("family.contact_phone is required");
      if (!form_data.family?.address?.street) errors.push("family.address.street is required");
      if (!form_data.family?.address?.city) errors.push("family.address.city is required");
      if (!form_data.family?.address?.province) errors.push("family.address.province is required");
      if (!form_data.adults?.length) errors.push("At least one adult is required");
      if (!form_data.students?.length) errors.push("At least one student is required");

      // Validate each adult
      form_data.adults?.forEach((adult: Record<string, unknown>, i: number) => {
        if (!adult.first_name) errors.push(`adults[${i}].first_name is required`);
        if (!adult.last_name) errors.push(`adults[${i}].last_name is required`);
        if (!adult.email) errors.push(`adults[${i}].email is required`);
        if (!adult.phone) errors.push(`adults[${i}].phone is required`);
        if (!adult.relationship) errors.push(`adults[${i}].relationship is required`);
      });

      // Validate each student
      form_data.students?.forEach((student: Record<string, unknown>, i: number) => {
        if (!student.first_name) errors.push(`students[${i}].first_name is required`);
        if (!student.last_name) errors.push(`students[${i}].last_name is required`);
        if (!student.date_of_birth) errors.push(`students[${i}].date_of_birth is required`);
        if (!student.grade) errors.push(`students[${i}].grade is required`);
        if (!student.curriculum) errors.push(`students[${i}].curriculum is required`);
      });
    }

    if (errors.length > 0) {
      return reject(400, "Validation failed", errors.join("; "));
    }

    // Store form data
    const { error: formError } = await supabase
      .from("office_desk.enrollment_forms")
      .insert({
        tenant_id: pipeline.tenant_id,
        pipeline_id: pipeline.id,
        form_type: pipeline.pipeline_type,
        form_data,
        status: "submitted",
      });

    if (formError) {
      console.error("Form storage failed:", formError);
      return reject(500, "Failed to store form data", formError.message);
    }

    // Update pipeline stage
    const { error: updateError } = await supabase
      .from("office_desk.enrollment_pipelines")
      .update({
        stage: "form_submitted",
        form_submitted_at: new Date().toISOString(),
        stage_updated_at: new Date().toISOString(),
        stage_history: JSON.stringify([
          ...((pipeline.stage_history as unknown[]) || []),
          {
            stage: "form_submitted",
            timestamp: new Date().toISOString(),
            actor: "family",
            action: "form_submitted",
          },
        ]),
      })
      .eq("id", pipeline.id);

    if (updateError) {
      console.error("Pipeline update failed:", updateError);
    }

    return jsonResp({
      status: "success",
      pipeline_id: pipeline.id,
      message: "Enrollment form submitted successfully",
    });
  } catch (err) {
    console.error("submit-enrollment-form error:", err);
    return reject(500, "Internal server error", String(err));
  }
});
