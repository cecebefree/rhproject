// registration-approve — Approve a registration and create auth user
// POST /registration-approve — authenticated (admin/office role)
// Body: { registration_id }
// Flow: pending_review → approved → active, creates auth user, sends approval email

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SITE_URL = Deno.env.get("SITE_URL") || "https://redhouse.lovable.app";

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify caller is admin or office
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResp({ error: "Missing authorization" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: caller, error: callerErr } = await supabase.auth.getUser(token);

    if (callerErr || !caller.user) {
      return jsonResp({ error: "Invalid token" }, 401);
    }

    const callerRole = caller.user.app_metadata?.role;
    if (callerRole !== "admin" && callerRole !== "office") {
      return jsonResp({ error: "Insufficient permissions" }, 403);
    }

    // Parse request body
    const { registration_id } = await req.json();
    if (!registration_id) {
      return jsonResp({ error: "Missing registration_id" }, 400);
    }

    // Fetch registration
    const { data: reg, error: regErr } = await supabase
      .schema("office_desk")
      .from("registrations")
      .select("*")
      .eq("id", registration_id)
      .single();

    if (regErr || !reg) {
      return jsonResp({ error: "Registration not found" }, 404);
    }

    if (reg.status !== "pending_review") {
      return jsonResp({ error: `Registration is ${reg.status}, not pending_review` }, 400);
    }

    // Generate temp password
    const tempPassword = `Rh${Date.now().toString(36)}!`;

    // Create auth user for parent (family role)
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: reg.student_email,
      password: tempPassword,
      email_confirm: true,
      app_metadata: {
        role: "family",
        tenant_id: reg.tenant_id,
      },
      user_metadata: {
        name: reg.student_name,
        registration_id: reg.id,
      },
    });

    if (authErr) {
      console.error("Failed to create auth user:", authErr);
      return jsonResp({ error: "Failed to create user account", detail: authErr.message }, 500);
    }

    console.log(`Created auth user ${authUser.user.id} for registration ${registration_id}`);

    // Update registration: approved → active
    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .schema("office_desk")
      .from("registrations")
      .update({
        status: "active",
        updated_at: now,
      })
      .eq("id", registration_id);

    if (updateErr) {
      console.error("Failed to update registration:", updateErr);
    }

    // Create profile
    const { error: profileErr } = await supabase
      .from("profiles")
      .upsert({
        id: authUser.user.id,
        tenant_id: reg.tenant_id,
        name: reg.student_name,
        email: reg.student_email,
        role: "family",
        updated_at: now,
      }, { onConflict: "id" });

    if (profileErr) {
      console.error("Failed to create profile:", profileErr);
    }

    // Send approval email (non-blocking)
    try {
      const emailUrl = `${SUPABASE_URL}/functions/v1/send-template-email`;
      fetch(emailUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          template: "registration_approved",
          to: reg.student_email,
          data: {
            student_name: reg.student_name,
            course_name: reg.course_name || "Redhouse",
            temp_password: tempPassword,
            login_url: `${SITE_URL}/login`,
            app_download_url: "https://redhouse.lovable.app/download",
          },
        }),
      }).catch((err) => console.error("Email failed (non-blocking):", err));
    } catch (err) {
      console.error("Email failed (non-blocking):", err);
    }

    return jsonResp({
      message: "Registration approved",
      registration_id: reg.id,
      user_id: authUser.user.id,
      temp_password: tempPassword,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResp({ error: "Internal server error" }, 500);
  }
});
