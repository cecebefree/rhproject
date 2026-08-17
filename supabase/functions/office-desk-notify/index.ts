// office-desk-notify — Non-blocking notification for Office Desk events (Row 75)
// Called from register-with-payment via EF-to-EF auth
// Logs to console + inserts into public.notifications for office/admin users

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  // Verify EF-to-EF auth headers or service role
  const caller = req.headers.get("X-EF-Caller");
  const authHeader = req.headers.get("Authorization");
  const isEF = caller === "register-with-payment";
  const isServiceRole = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;

  if (!isEF && !isServiceRole) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { action, registration_id, student_name, student_email, amount, payment_status, tenant_id } = body;

  if (action !== "new_registration") {
    return new Response(JSON.stringify({ received: true, skipped: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const title = `New Registration: ${student_name}`;
  const bodyText = `Student ${student_name} (${student_email}) registered for ${amount ? `R${amount}` : ""}. Payment: ${payment_status}. Registration ID: ${registration_id}`;

  // Log to console (always)
  console.log(`[office-desk-notify] ${title} — ${bodyText}`);

  // Find office/admin users in the tenant and notify them
  try {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("tenant_id", tenant_id)
      .in("role", ["office", "admin"]);

    if (profiles && profiles.length > 0) {
      const notifications = profiles.map((p) => ({
        user_id: p.id,
        tenant_id,
        type: "enrolment" as const,
        title,
        body: bodyText,
      }));

      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) {
        console.error("[office-desk-notify] Notification insert failed:", error.message);
      } else {
        console.log(`[office-desk-notify] Notified ${profiles.length} office desk user(s)`);
      }
    }
  } catch (err) {
    console.error("[office-desk-notify] Non-blocking error:", err);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
