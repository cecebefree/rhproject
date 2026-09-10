// approve-enrollment — Final approval, grant access to system
// POST /approve-enrollment
// Body: { pipeline_id: string, notes?: string }
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
    const { pipeline_id, notes } = await req.json();

    if (!pipeline_id) {
      return reject(400, "Missing required field: pipeline_id");
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
      return reject(403, "Only office or admin roles can approve enrollments");
    }

    // Get pipeline
    const { data: pipeline, error: pipeError } = await supabase
      .from("office_desk.enrollment_pipelines")
      .select("*")
      .eq("id", pipeline_id)
      .single();

    if (pipeError || !pipeline) {
      return reject(404, "Pipeline not found");
    }

    if (pipeline.stage !== "human_review") {
      return reject(400, `Pipeline is in stage '${pipeline.stage}', expected 'human_review'`);
    }

    // Update pipeline to approved
    const { error: updateError } = await supabase
      .from("office_desk.enrollment_pipelines")
      .update({
        stage: "access_approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes,
        access_approved_at: new Date().toISOString(),
        access_approved_by: user.id,
        stage_updated_at: new Date().toISOString(),
        stage_history: JSON.stringify([
          ...((pipeline.stage_history as unknown[]) || []),
          {
            stage: "access_approved",
            timestamp: new Date().toISOString(),
            actor: user.id,
            action: "enrollment_approved",
            notes,
          },
        ]),
      })
      .eq("id", pipeline_id);

    if (updateError) {
      console.error("Pipeline update failed:", updateError);
      return reject(500, "Failed to update pipeline", updateError.message);
    }

    // Grant access to all profiles linked to this pipeline
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, role")
      .eq("enrollment_pipeline_id", pipeline_id);

    const now = new Date().toISOString();
    const accessUpdates: Array<Promise<unknown>> = [];

    if (profiles) {
      for (const prof of profiles) {
        accessUpdates.push(
          supabase
            .from("profiles")
            .update({
              registration_status: "approved",
              access_granted_at: now,
              onboarding_completed_at: now,
            })
            .eq("id", prof.id)
        );
      }
    }

    await Promise.all(accessUpdates);

    // Move to active stage
    await supabase
      .from("office_desk.enrollment_pipelines")
      .update({
        stage: "active",
        status: "completed",
        stage_updated_at: now,
        stage_history: JSON.stringify([
          ...((pipeline.stage_history as unknown[]) || []),
          {
            stage: "active",
            timestamp: now,
            actor: "system",
            action: "pipeline_completed",
          },
        ]),
      })
      .eq("id", pipeline_id);

    // Send welcome email to family
    const { data: familyAccount } = await supabase
      .from("office_desk.family_accounts")
      .select("contact_email, family_code")
      .eq("id", pipeline.family_account_id)
      .single();

    if (familyAccount?.contact_email) {
      const emailSubject = "Welcome to Redhouse — Enrollment Approved!";
      const emailBody = `
        <h2>Welcome to Redhouse!</h2>
        <p>Your enrollment has been approved. Here are your details:</p>
        <div style="background: #f0f0f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Family Code:</strong> ${familyAccount.family_code}</p>
          <p><strong>Status:</strong> Active</p>
        </div>
        <p>You can now log in to the Redhouse portal and mobile app using your registered email address.</p>
        <p>If you have any questions, please contact us at registration@redhouse.co.za</p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #888; font-size: 12px;">This is an automated email from Redhouse.</p>
      `;
      await sendEmail(familyAccount.contact_email, emailSubject, emailBody);
    }

    return jsonResp({
      status: "success",
      pipeline_id,
      profiles_approved: profiles?.length || 0,
      message: "Enrollment approved and access granted",
    });
  } catch (err) {
    console.error("approve-enrollment error:", err);
    return reject(500, "Internal server error", String(err));
  }
});
