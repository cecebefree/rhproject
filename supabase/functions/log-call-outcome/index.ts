// log-call-outcome — Update call log with final outcome (Row 65)
// POST body: { call_id, duration_seconds, outcome, notes? }
// Authenticated: caller_id extracted from JWT

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Missing authorization", { status: 401, headers: corsHeaders });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { call_id, duration_seconds, outcome, notes } = body;
  if (!call_id || !outcome) {
    return new Response(JSON.stringify({ error: "call_id and outcome are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const validOutcomes = ["answered", "missed", "declined", "voicemail", "failed"];
  if (!validOutcomes.includes(outcome as string)) {
    return new Response(JSON.stringify({ error: `outcome must be one of: ${validOutcomes.join(", ")}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Verify call_id exists
  const { data: existing, error: lookupErr } = await admin
    .schema("front_desk")
    .from("call_logs")
    .select("id, call_id")
    .eq("call_id", call_id)
    .is("deleted_at", null)
    .single();

  if (lookupErr || !existing) {
    return new Response(JSON.stringify({ error: "Call log not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Update call log
  const updatePayload: Record<string, unknown> = {
    outcome,
    updated_at: new Date().toISOString(),
  };
  if (duration_seconds !== undefined) updatePayload.duration_seconds = duration_seconds;
  if (notes !== undefined) updatePayload.notes = notes;

  const { error: updateErr } = await admin
    .schema("front_desk")
    .from("call_logs")
    .update(updatePayload)
    .eq("call_id", call_id);

  if (updateErr) {
    return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ success: true, updated_at: updatePayload.updated_at }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
