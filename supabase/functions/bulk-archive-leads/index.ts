// bulk-archive-leads — Archive multiple leads in one call (Row 80)
// POST body: { lead_ids: string[], reason: ArchiveReason, notes?: string }
// Authenticated: caller_id extracted from JWT

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ArchiveReason = "enrolled" | "withdrawn" | "inactive" | "duplicate" | "other";

const VALID_REASONS: ArchiveReason[] = ["enrolled", "withdrawn", "inactive", "duplicate", "other"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader)
    return new Response("Missing authorization", { status: 401, headers: corsHeaders });

  const token = authHeader.replace("Bearer ", "");
  const payload = JSON.parse(atob(token.split(".")[1]));
  const userId = payload.sub;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { lead_ids, reason, notes } = body as {
    lead_ids?: string[];
    reason?: ArchiveReason;
    notes?: string;
  };

  if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
    return new Response(JSON.stringify({ error: "lead_ids array is required and must not be empty" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (lead_ids.length > 50) {
    return new Response(JSON.stringify({ error: "Maximum 50 leads per bulk archive" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!reason || !VALID_REASONS.includes(reason)) {
    return new Response(JSON.stringify({ error: `reason is required and must be one of: ${VALID_REASONS.join(", ")}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Verify caller profile
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, tenant_id, role")
    .eq("id", userId)
    .single();

  if (profileErr || !profile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!["admin", "front_desk"].includes(profile.role)) {
    return new Response(JSON.stringify({ error: "Only admin and front_desk roles can archive leads" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!profile.tenant_id) {
    return new Response(JSON.stringify({ error: "Caller tenant_id is null" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch all leads in one query
  const { data: leads, error: fetchErr } = await admin
    .schema("front_desk")
    .from("leads")
    .select("id, archived_at")
    .in("id", lead_ids)
    .eq("tenant_id", profile.tenant_id);

  if (fetchErr) {
    return new Response(JSON.stringify({ error: `Fetch failed: ${fetchErr.message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Partition into archivable vs skipped
  const archivable = (leads ?? []).filter((l) => !l.archived_at);
  const alreadyArchived = lead_ids.filter((id) => {
    const lead = leads?.find((l) => l.id === id);
    return lead && lead.archived_at;
  });
  const notFound = lead_ids.filter((id) => !leads?.some((l) => l.id === id));

  if (archivable.length === 0) {
    return new Response(JSON.stringify({
      archived: 0,
      skipped: alreadyArchived.length,
      not_found: notFound.length,
      already_archived_ids: alreadyArchived,
      not_found_ids: notFound,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Bulk archive in one query
  const idsToArchive = archivable.map((l) => l.id);
  const { error: archiveErr } = await admin
    .schema("front_desk")
    .from("leads")
    .update({
      archived_at: new Date().toISOString(),
      archive_reason: reason,
    })
    .in("id", idsToArchive);

  if (archiveErr) {
    return new Response(JSON.stringify({ error: `Archive failed: ${archiveErr.message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Insert audit log entries (one per archived lead)
  const auditEntries = archivable.map((l) => ({
    lead_id: l.id,
    tenant_id: profile.tenant_id,
    action: "archive" as const,
    reason,
    notes: notes || null,
    actor_id: userId,
  }));

  const { error: auditErr } = await admin
    .schema("front_desk")
    .from("lead_archive_log")
    .insert(auditEntries);

  if (auditErr) {
    console.error("Audit log insert failed:", auditErr);
  }

  return new Response(JSON.stringify({
    archived: archivable.length,
    skipped: alreadyArchived.length,
    not_found: notFound.length,
    already_archived_ids: alreadyArchived,
    not_found_ids: notFound,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
