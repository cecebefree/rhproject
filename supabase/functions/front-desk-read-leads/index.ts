// front-desk-read-leads — ITEM-23-DEP-B
// Front Desk reads for lead intake (Row 48).
// R1: admin-only role gate.
// R2: tenant-scoped via jwt_tenant_id().
// Defense-in-depth: service_role client with server-side tenant filter.
// Response: 200 rows ordered created_at DESC.

import { createClient } from "jsr:@supabase/supabase-js@2";

function resolveAuthContext(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { role: null, tenant_id: null, authenticated: false };
  }

  const token = authHeader.replace("Bearer ", "");
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { role: null, tenant_id: null, authenticated: false };
  }

  try {
    const payload = JSON.parse(atob(parts[1]));
    const role = payload.app_metadata?.role ?? null;
    const tenant_id = payload.app_metadata?.tenant_id ?? null;
    return { role, tenant_id, authenticated: true };
  } catch {
    return { role: null, tenant_id: null, authenticated: false };
  }
}

async function handleRequest(req: Request) {
  // 401 anon / missing
  const authCtx = resolveAuthContext(req);
  if (!authCtx.authenticated) {
    return new Response(
      JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // 500 D-15 NULL tenant
  if (!authCtx.tenant_id) {
    return new Response(
      JSON.stringify({ error: "d15_null_tenant" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Role gate admin-only (R1)
  if (authCtx.role !== "admin") {
    return new Response(
      JSON.stringify({ error: "forbidden" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // Service-role client with server-side tenant filter
  // defense-in-depth alongside RLS: service_role bypasses RLS
  // but server-side tenant filter prevents cross-tenant leaks.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    .eq("tenant_id", authCtx.tenant_id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ leads: leads ?? [], count: leads?.length ?? 0 }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" },
    });
  }
  return handleRequest(req);
});