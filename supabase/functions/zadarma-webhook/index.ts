// zadarma-webhook — Receive call outcome events from Zadarma PBX (Row 65)
// POST body: { call_id, event, duration, timestamp }
// Validates X-Zadarma-Signature header

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-zadarma-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const ZADARMA_API_KEY = Deno.env.get("ZADARMA_API_KEY");
  const ZADARMA_API_SECRET = Deno.env.get("ZADARMA_API_SECRET");

  // Validate Zadarma signature
  const signature = req.headers.get("X-Zadarma-Signature");
  if (ZADARMA_API_SECRET && signature) {
    const bodyText = await req.text();
    const md5 = await crypto.subtle.digest("MD5", new TextEncoder().encode(`${ZADARMA_API_SECRET}:${bodyText}:${ZADARMA_API_SECRET}`));
    const expectedSig = Array.from(new Uint8Array(md5)).map(b => b.toString(16).padStart(2, "0")).join("");

    if (signature !== expectedSig) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Re-parse body since we consumed it for signature validation
    var body = JSON.parse(bodyText);
  } else {
    var body = await req.json();
  }

  const { call_id, event, duration } = body;
  if (!call_id || !event) {
    return new Response(JSON.stringify({ error: "call_id and event are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Map Zadarma event to outcome
  const eventMap: Record<string, string> = {
    answer: "answered",
    hangup: "answered",
    noanswer: "missed",
    busy: "declined",
    cancel: "missed",
    voicemail: "voicemail",
  };
  const outcome = eventMap[event] ?? "failed";

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Update call log
  const updatePayload: Record<string, unknown> = {
    outcome,
    updated_at: new Date().toISOString(),
  };
  if (duration !== undefined) updatePayload.duration_seconds = duration;

  const { error: updateErr } = await admin
    .schema("front_desk")
    .from("call_logs")
    .update(updatePayload)
    .eq("call_id", call_id);

  if (updateErr) {
    console.error("Failed to update call log:", updateErr);
    return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ status: "received" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
