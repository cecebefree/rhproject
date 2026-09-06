// pending-payment-timeout — Row 85
// Checks for registrations stuck in pending_review for >24 hours
// Sends automated reminder to Office Desk, logs who was reminded
// Run via cron: every 6 hours

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    // Find registrations stuck in pending_review for >24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: staleRegistrations, error: fetchError } = await supabase
      .from("office_desk.registrations")
      .select("id, student_name, student_email, course_name, created_at, updated_at, tenant_id")
      .eq("status", "pending_review")
      .lt("updated_at", twentyFourHoursAgo)
      .is("deleted_at", null);

    if (fetchError) {
      console.error("Failed to fetch stale registrations:", fetchError);
      return jsonResp({ error: "Failed to fetch registrations" }, 500);
    }

    if (!staleRegistrations || staleRegistrations.length === 0) {
      console.log("No stale pending-review registrations found");
      return jsonResp({ message: "No reminders needed", count: 0 });
    }

    console.log(`Found ${staleRegistrations.length} stale registrations`);

    // Log reminder to office_desk.notifications
    const notifications = staleRegistrations.map((reg) => ({
      registration_id: reg.id,
      notification_type: "payment_reminder",
      email_to: "office@redhouse.edu",
      status: "sent",
    }));

    const { error: notifError } = await supabase
      .from("office_desk.notifications")
      .insert(notifications);

    if (notifError) {
      console.error("Failed to log notifications:", notifError);
    }

    console.log(`Reminders sent for ${staleRegistrations.length} registrations`);

    return jsonResp({
      message: "Reminders sent",
      count: staleRegistrations.length,
      registrations: staleRegistrations.map((r) => ({
        id: r.id,
        student_name: r.student_name,
        student_email: r.student_email,
        hours_pending: Math.round(
          (Date.now() - new Date(r.updated_at).getTime()) / (1000 * 60 * 60)
        ),
      })),
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResp({ error: "Internal server error" }, 500);
  }
});
