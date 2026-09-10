// sign-contract — Capture digital signature or mark PDF uploaded
// POST /sign-contract
// Body: { contract_id: string, signature_method: 'digital' | 'pdf_upload', signature_data?: object }
// verify_jwt: false (public — family signs via link)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function reject(status: number, error: string, detail?: string): Response {
  return jsonResp({ error, ...(detail ? { detail } : {}) }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return reject(405, "Method not allowed");
  }

  try {
    const { contract_id, signature_method, signature_data } = await req.json();

    if (!contract_id || !signature_method) {
      return reject(400, "Missing required fields: contract_id, signature_method");
    }

    if (!["digital", "pdf_upload"].includes(signature_method)) {
      return reject(400, "signature_method must be 'digital' or 'pdf_upload'");
    }

    // Get contract
    const { data: contract, error: contractError } = await supabase
      .from("office_desk.contracts")
      .select("*")
      .eq("id", contract_id)
      .single();

    if (contractError || !contract) {
      return reject(404, "Contract not found");
    }

    if (contract.status !== "sent" && contract.status !== "draft") {
      return reject(400, `Contract status is '${contract.status}', expected 'sent' or 'draft'`);
    }

    // Get client IP for audit
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    // Update contract with signature
    const { error: updateError } = await supabase
      .from("office_desk.contracts")
      .update({
        status: "signed",
        signature_method,
        signed_at: new Date().toISOString(),
        signature_data: {
          ...signature_data,
          ip_address: clientIp,
          user_agent: req.headers.get("user-agent"),
          signed_at: new Date().toISOString(),
        },
      })
      .eq("id", contract_id);

    if (updateError) {
      console.error("Contract update failed:", updateError);
      return reject(500, "Failed to update contract", updateError.message);
    }

    // Update pipeline stage if contract is linked
    if (contract.pipeline_id) {
      const { data: pipeline } = await supabase
        .from("office_desk.enrollment_pipelines")
        .select("stage, stage_history")
        .eq("id", contract.pipeline_id)
        .single();

      if (pipeline && pipeline.stage === "contract_sent") {
        await supabase
          .from("office_desk.enrollment_pipelines")
          .update({
            stage: "contract_signed",
            stage_updated_at: new Date().toISOString(),
            stage_history: JSON.stringify([
              ...((pipeline.stage_history as unknown[]) || []),
              {
                stage: "contract_signed",
                timestamp: new Date().toISOString(),
                actor: "family",
                action: "contract_signed",
                signature_method,
              },
            ]),
          })
          .eq("id", contract.pipeline_id);
      }
    }

    return jsonResp({
      status: "success",
      contract_id,
      signed_at: new Date().toISOString(),
      signature_method,
    });
  } catch (err) {
    console.error("sign-contract error:", err);
    return reject(500, "Internal server error", String(err));
  }
});
