// send-invoice-email — Send invoice email to client (Row 78)
// POST body: { invoice_id, recipient_email?, subject?, body? }
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

  const { invoice_id, recipient_email, subject, body: emailBody } = body;
  if (!invoice_id) {
    return new Response(JSON.stringify({ error: "invoice_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Verify invoice exists
  const { data: invoice, error: invErr } = await admin
    .schema("office_desk")
    .from("invoices")
    .select("id, tenant_id, lead_id, invoice_number, amount, currency, due_date")
    .eq("id", invoice_id)
    .is("deleted_at", null)
    .single();

  if (invErr || !invoice) {
    return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Verify sender belongs to same tenant
  const { data: profile } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", senderId)
    .single();

  if (!profile || profile.tenant_id !== invoice.tenant_id) {
    return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Resolve recipient email
  let toEmail = recipient_email as string;
  if (!toEmail && invoice.lead_id) {
    const { data: lead } = await admin
      .schema("front_desk")
      .from("leads")
      .select("email")
      .eq("id", invoice.lead_id)
      .single();
    toEmail = lead?.email;
  }

  if (!toEmail) {
    return new Response(JSON.stringify({ error: "No recipient email found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const subjectText = (subject as string) || `Invoice ${invoice.invoice_number || ""} from VAS Studio`;
  const bodyText = (emailBody as string) || `Invoice ${invoice.invoice_number || "N/A"} for ${invoice.currency} ${invoice.amount}`;

  // Send via Zadarma email API if configured
  const ZADARMA_API_KEY = Deno.env.get("ZADARMA_API_KEY");
  const ZADARMA_API_SECRET = Deno.env.get("ZADARMA_API_SECRET");
  let sent = false;

  if (ZADARMA_API_KEY && ZADARMA_API_SECRET) {
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const params = new URLSearchParams({
        to: toEmail,
        subject: subjectText,
        body: bodyText,
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

      sent = res.ok;
    } catch (err) {
      console.error("Email send failed:", err);
    }
  } else {
    // Development mode — log to console
    console.log(`[send-invoice-email] To: ${toEmail}, Subject: ${subjectText}`);
    sent = true;
  }

  // Log to email_logs
  const sentAt = new Date().toISOString();
  const { data: emailLog } = await admin
    .schema("front_desk")
    .from("email_logs")
    .insert({
      tenant_id: invoice.tenant_id,
      lead_id: invoice.lead_id,
      recipient_email: toEmail,
      subject: subjectText,
      body: bodyText,
      status: sent ? "sent" : "failed",
      sent_at: sent ? sentAt : null,
    })
    .select()
    .single();

  // Update invoice status to 'sent'
  if (sent) {
    await admin
      .schema("office_desk")
      .from("invoices")
      .update({ status: "sent", issued_at: sentAt })
      .eq("id", invoice_id);
  }

  return new Response(JSON.stringify({ success: sent, email_id: emailLog?.id, sent_at: sent ? sentAt : null }), {
    status: sent ? 200 : 502,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
