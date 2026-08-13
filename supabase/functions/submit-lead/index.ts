// submit-lead — ITEM-23-DEP-C
// Sole public write path into public.leads (078: RLS default-deny, no policies).
// Contract V2: OPTIONS/405/400/403/201 matrix, fail-loud, no silent fallbacks.
// Schema verified against live probe 2026-07-27 (baseline + migration 079).
//
// DIVERGENCE NOTE (ruled 2026-07-27): _shared/cors.ts uses wildcard origin
// and a blanket method list. This EF is the project's only public endpoint
// and Contract V2 mandates origin-allowlisting, so CORS is self-contained
// here by design. Error body shape { error, detail? } intentionally matches
// _shared/error-envelope.ts, so response dialect stays uniform.
//
// _shared/turnstile.ts does not exist (probe-verified); verifier is inlined.


import { createClient } from "jsr:@supabase/supabase-js@2";


const ALLOWED_ORIGINS = (Deno.env.get("SUBMIT_LEAD_ALLOWED_ORIGINS") ?? "")
  .split(",").map((o) => o.trim()).filter(Boolean);


const ALLOWED_KEYS = new Set([
  "name", "email", "phone", "message", "tenant", "turnstileToken",
]);


function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0] ?? "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Content-Type": "application/json",
  };
}


// Body shape matches _shared/error-envelope.ts ErrorPayload.
function reject(status: number, code: string, headers: Record<string, string>, detail?: string) {
  return new Response(JSON.stringify({ error: code, ...(detail ? { detail } : {}) }), { status, headers });
}


// Inlined Turnstile verification. Fail-loud: missing secret throws (500),
// Cloudflare API failure returns false (door stays shut).
async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) throw new Error("TURNSTILE_SECRET_KEY not configured");


  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (remoteIp) form.append("remoteip", remoteIp);


  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form },
    );
    if (!res.ok) return false;


    const data = await res.json();
    return data.success === true;
  } catch (_err) {
    return false;
  }
}


Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get("origin"));


  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return reject(405, "method_not_allowed", headers);


  let body: Record<string, unknown>;
  try {
    body = await req.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) throw new Error();
  } catch {
    return reject(400, "invalid_json", headers);
  }


  for (const key of Object.keys(body)) {
    if (!ALLOWED_KEYS.has(key)) return reject(400, "unknown_field", headers, key);
  }


  const token = typeof body.turnstileToken === "string" ? body.turnstileToken.trim() : "";
  if (!token) return reject(400, "turnstile_token_required", headers);


  const humanOk = await verifyTurnstileToken(token, req.headers.get("cf-connecting-ip") ?? undefined);
  if (!humanOk) return reject(403, "turnstile_verification_failed", headers);


  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 120) return reject(400, "invalid_name", headers);


  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  const email = emailRaw.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return reject(400, "invalid_email", headers);
  }


  let phone: string | null = null;
  if (body.phone !== undefined) {
    if (typeof body.phone !== "string") return reject(400, "invalid_phone", headers);
    phone = body.phone.trim();
    if (phone.length === 0) phone = null;
    else if (phone.length > 32 || !/^[+()\-\s\d]+$/.test(phone)) return reject(400, "invalid_phone", headers);
  }


  let notes: string | null = null;
  if (body.message !== undefined) {
    if (typeof body.message !== "string") return reject(400, "invalid_message", headers);
    notes = body.message.trim().slice(0, 2000) || null;
  }


  const tenantSlug = typeof body.tenant === "string" ? body.tenant.trim().toLowerCase() : "";
  if (!tenantSlug) return reject(400, "invalid_tenant", headers);


  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );


  const { data: tenant, error: tenantErr } = await admin
    .from("tenant_devotional")
    .select("id")
    .eq("slug", tenantSlug)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();


  if (tenantErr) return reject(500, "tenant_lookup_failed", headers);
  if (!tenant) return reject(400, "invalid_tenant", headers);


  const { data: isRegistered, error: regErr } = await admin
    .rpc("email_is_registered", { p_email: email });
  if (regErr) return reject(500, "registration_check_failed", headers);


  const { error: insertErr } = await admin.schema("front_desk").from("leads").insert({
    tenant_id: tenant.id,
    name,
    email,
    phone,
    notes,
    existing_profile: isRegistered === true,
  });
  if (insertErr) return reject(500, "lead_insert_failed", headers);


  return new Response(JSON.stringify({ status: "received" }), { status: 201, headers });
});
