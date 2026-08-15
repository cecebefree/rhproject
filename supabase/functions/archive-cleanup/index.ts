// archive-cleanup — Scheduled cleanup of old archived leads (Row 80)
// POST body: { retention_days?: number } (default 365)
// Cron: runs daily via pg_cron
// Deletes leads archived more than retention_days ago + their audit logs
// Authenticated: service_role only (cron invocation)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Allow both POST (manual) and GET (cron health check)
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Parse optional retention_days from POST body
  let retentionDays = 365;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body.retention_days && typeof body.retention_days === "number") {
        retentionDays = Math.max(30, Math.min(3650, body.retention_days));
      }
    } catch {
      // Use default
    }
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffISO = cutoffDate.toISOString();

  // Find leads archived before cutoff
  const { data: oldLeads, error: fetchErr } = await admin
    .schema("front_desk")
    .from("leads")
    .select("id, tenant_id")
    .not("archived_at", "is", null)
    .lt("archived_at", cutoffISO);

  if (fetchErr) {
    return new Response(JSON.stringify({ error: `Fetch failed: ${fetchErr.message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!oldLeads || oldLeads.length === 0) {
    return new Response(JSON.stringify({
      deleted: 0,
      retention_days: retentionDays,
      cutoff_date: cutoffISO,
      message: "No archived leads past retention period",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const leadIds = oldLeads.map((l) => l.id);

  // Delete audit logs first (FK dependency)
  const { error: auditDelErr } = await admin
    .schema("front_desk")
    .from("lead_archive_log")
    .delete()
    .in("lead_id", leadIds);

  if (auditDelErr) {
    console.error("Audit log deletion failed:", auditDelErr);
  }

  // Delete the leads themselves
  const { error: leadDelErr } = await admin
    .schema("front_desk")
    .from("leads")
    .delete()
    .in("id", leadIds);

  if (leadDelErr) {
    return new Response(JSON.stringify({ error: `Lead deletion failed: ${leadDelErr.message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    deleted: leadIds.length,
    retention_days: retentionDays,
    cutoff_date: cutoffISO,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
