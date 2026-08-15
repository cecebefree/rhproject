// call-lead — Initiate outbound call via Zadarma PBX (Row 65)
// POST body: { lead_id, phone_number }
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

  const token = authHeader.replace("Bearer ", "");
  const payload = JSON.parse(atob(token.split(".")[1]));
  const userId = payload.sub;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { lead_id, phone_number } = body;
  if (!lead_id || !phone_number) {
    return new Response(JSON.stringify({ error: "lead_id and phone_number are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Verify lead exists and caller is in same tenant
  const { data: lead, error: leadErr } = await admin
    .schema("front_desk")
    .from("leads")
    .select("id, tenant_id, phone")
    .eq("id", lead_id)
    .is("deleted_at", null)
    .single();

  if (leadErr || !lead) {
    return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Verify caller belongs to same tenant
  const { data: profile } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .single();

  if (!profile || profile.tenant_id !== lead.tenant_id) {
    return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const ZADARMA_API_KEY = Deno.env.get("ZADARMA_API_KEY");
  const ZADARMA_API_SECRET = Deno.env.get("ZADARMA_API_SECRET");

  if (!ZADARMA_API_KEY || !ZADARMA_API_SECRET) {
    return new Response(JSON.stringify({ error: "Zadarma credentials not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Build Zadarma API signature
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = new URLSearchParams({ callback_phone: phone_number });
  const sortedParams = Array.from(params.entries()).sort().map(([k, v]) => `${k}=${v}`).join("&");
  const md5 = await crypto.subtle.digest("MD5", new TextEncoder().encode(`${ZADARMA_API_KEY}:${sortedParams}:${ZADARMA_API_SECRET}:${timestamp}`));
  const signature = Array.from(new Uint8Array(md5)).map(b => b.toString(16).padStart(2, "0")).join("");

  // Call Zadarma API
  let zadarmaResult: Record<string, unknown>;
  try {
    const res = await fetch("https://api.zadarma.com/v1/call/init/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ZADARMA_API_KEY}:${signature}:${timestamp}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    zadarmaResult = await res.json();
  } catch (err) {
    // Log failed attempt
    await admin.schema("front_desk").from("call_logs").insert({
      tenant_id: lead.tenant_id,
      lead_id: lead.id,
      direction: "outbound",
      outcome: "failed",
      notes: `Zadarma API error: ${err}`,
    });
    return new Response(JSON.stringify({ success: false, error: "Zadarma API call failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const callId = (zadarmaResult as any)?.call_id;
  if (!callId) {
    await admin.schema("front_desk").from("call_logs").insert({
      tenant_id: lead.tenant_id,
      lead_id: lead.id,
      direction: "outbound",
      outcome: "failed",
      notes: `Zadarma error: ${JSON.stringify(zadarmaResult)}`,
    });
    return new Response(JSON.stringify({ success: false, error: "Failed to initiate call" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Insert call log
  const { data: callLog, error: insertErr } = await admin
    .schema("front_desk")
    .from("call_logs")
    .insert({
      tenant_id: lead.tenant_id,
      lead_id: lead.id,
      call_id: callId,
      direction: "outbound",
      outcome: "initiated",
    })
    .select()
    .single();

  if (insertErr) {
    console.error("Failed to insert call log:", insertErr);
  }

  return new Response(JSON.stringify({ success: true, call_id: callId, status: "ringing", log_id: callLog?.id }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
