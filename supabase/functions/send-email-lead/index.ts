// send-email-lead — Send email to lead and log it (Row 65)
// POST body: { lead_id, subject, body }
// Authenticated: sender_id extracted from JWT

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
  const senderId = payload.sub;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { lead_id, subject, body: emailBody } = body;
  if (!lead_id || !subject || !emailBody) {
    return new Response(JSON.stringify({ error: "lead_id, subject, and body are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Verify lead exists and sender is in same tenant
  const { data: lead, error: leadErr } = await admin
    .schema("front_desk")
    .from("leads")
    .select("id, tenant_id, email, name")
    .eq("id", lead_id)
    .is("deleted_at", null)
    .single();

  if (leadErr || !lead) {
    return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (!lead.email) {
    return new Response(JSON.stringify({ error: "Lead has no email address" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Verify sender belongs to same tenant
  const { data: profile } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", senderId)
    .single();

  if (!profile || profile.tenant_id !== lead.tenant_id) {
    return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Insert email log with status=sent (optimistic — will update to failed on error)
  const sentAt = new Date().toISOString();
  const { data: emailLog, error: insertErr } = await admin
    .schema("front_desk")
    .from("email_logs")
    .insert({
      tenant_id: lead.tenant_id,
      lead_id: lead.id,
      recipient_email: lead.email,
      subject: subject as string,
      body: emailBody as string,
      status: "sent",
      sent_at: sentAt,
    })
    .select()
    .single();

  if (insertErr) {
    return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Attempt to send via Zadarma email API or fallback to console log
  const ZADARMA_API_KEY = Deno.env.get("ZADARMA_API_KEY");
  const ZADARMA_API_SECRET = Deno.env.get("ZADARMA_API_SECRET");

  if (ZADARMA_API_KEY && ZADARMA_API_SECRET) {
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const params = new URLSearchParams({
        to: lead.email,
        subject: subject as string,
        body: emailBody as string,
        from_name: "VAS Studio",
        from_email: "hello@vasstudio.co",
      });
      const sortedParams = Array.from(params.entries()).sort().map(([k, v]) => `${k}=${v}`).join("&");
      const md5 = await crypto.subtle.digest("MD5", new TextEncoder().encode(`${ZADARMA_API_KEY}:${sortedParams}:${ZADARMA_API_SECRET}:${timestamp}`));
      const signature = Array.from(new Uint8Array(md5)).map(b => b.toString(16).padStart(2, "0")).join("");

      const res = await fetch("https://api.zadarma.com/v1/mail/send/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ZADARMA_API_KEY}:${signature}:${timestamp}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!res.ok) {
        throw new Error(`Zadarma email API returned ${res.status}`);
      }
    } catch (err) {
      // Update status to failed
      await admin.schema("front_desk").from("email_logs").update({ status: "failed" }).eq("id", emailLog.id);
      return new Response(JSON.stringify({ success: false, error: `Email send failed: ${err}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } else {
    // No Zadarma email configured — log to console for development
    console.log(`[send-email-lead] To: ${lead.email}, Subject: ${subject}, Body length: ${(emailBody as string).length}`);
  }

  return new Response(JSON.stringify({ success: true, email_id: emailLog.id, sent_at: sentAt }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
