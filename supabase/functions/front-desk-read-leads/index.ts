// front-desk-read-leads — ITEM-23-DEP-B
// Front Desk reads for lead intake (Row 48).
// R1: admin-only role gate.
// R2: tenant-scoped via jwt_tenant_id().
// Defense-in-depth: service_role client with server-side tenant filter.
// Response: 200 rows ordered created_at DESC.
//
// Row 57: Added EF-to-EF auth support for inter-desk calls.

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  verifyEFSignature,
  authorizeEFCall,
  writeEfCallLog,
  getCallerIP,
  getServiceSecret,
  getPreviousServiceSecret,
  type EFAuthContext,
} from "../_shared/ef-auth.ts";

interface AuthContext {
  role: string | null;
  tenant_id: string | null;
  authenticated: boolean;
  isEF: boolean;
  efContext?: EFAuthContext;
}

function resolveAuthContext(req: Request): AuthContext {
  // Check for EF-to-EF auth first
  const efCaller = req.headers.get("X-EF-Caller");
  if (efCaller) {
    // Will be verified in handleRequest
    return { role: null, tenant_id: null, authenticated: false, isEF: true };
  }

  // Fall back to user JWT auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { role: null, tenant_id: null, authenticated: false, isEF: false };
  }

  const token = authHeader.replace("Bearer ", "");
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { role: null, tenant_id: null, authenticated: false, isEF: false };
  }

  try {
    const payload = JSON.parse(atob(parts[1]));
    const role = payload.app_metadata?.role ?? null;
    const tenant_id = payload.app_metadata?.tenant_id ?? null;
    return { role, tenant_id, authenticated: true, isEF: false };
  } catch {
    return { role: null, tenant_id: null, authenticated: false, isEF: false };
  }
}

async function handleRequest(req: Request) {
  const url = new URL(req.url);
  const authCtx = resolveAuthContext(req);
  const callerIP = getCallerIP(req);

  // Handle EF-to-EF auth
  if (authCtx.isEF) {
    try {
      const efSecret = getServiceSecret("front_desk");
      const efSecretPrev = getPreviousServiceSecret("front_desk");
      const efContext = await verifyEFSignature(req, efSecret, efSecretPrev);

      // Authorize the call
      authorizeEFCall(efContext, "front_desk", "read_leads");

      // Get tenant_id from EF context (must be in request body)
      const body = await req.arrayBuffer();
      let tenantId = efContext.tenantId;

      if (!tenantId) {
        return new Response(
          JSON.stringify({ error: "missing_tenant_id" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Service-role client with server-side tenant filter
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: leads, error } = await supabase
        .schema("front_desk").from("leads")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(200);

      // Log the call (non-blocking)
      await writeEfCallLog({
        tenant_id: tenantId,
        caller: efContext.caller,
        receiver: "front_desk",
        action: "read_leads",
        method: req.method,
        path: url.pathname,
        status_code: error ? 500 : 200,
        caller_ip: callerIP,
        signature_valid: efContext.signatureValid,
        replay_check_passed: efContext.replayCheckPassed,
        request_hash: undefined,
        error_msg: error?.message,
      });

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
    } catch (err) {
      // EF auth failed
      const errorMessage = err instanceof Response
        ? await err.text()
        : "ef_auth_failed";

      return new Response(
        errorMessage,
        {
          status: err instanceof Response ? err.status : 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // Handle user JWT auth (existing logic)
  if (!authCtx.authenticated) {
    return new Response(
      JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!authCtx.tenant_id) {
    return new Response(
      JSON.stringify({ error: "d15_null_tenant" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (authCtx.role !== "admin") {
    return new Response(
      JSON.stringify({ error: "forbidden" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: leads, error } = await supabase
    .schema("front_desk").from("leads")
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
