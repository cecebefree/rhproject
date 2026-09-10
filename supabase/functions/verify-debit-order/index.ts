// verify-debit-order — R5 minimum check to confirm account is open
// POST /verify-debit-order
// Body: { pipeline_id: string }
// verify_jwt: true (office/admin only)

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
    const { pipeline_id } = await req.json();

    if (!pipeline_id) {
      return reject(400, "Missing required field: pipeline_id");
    }

    // Get pipeline
    const { data: pipeline, error: pipeError } = await supabase
      .from("office_desk.enrollment_pipelines")
      .select("*")
      .eq("id", pipeline_id)
      .single();

    if (pipeError || !pipeline) {
      return reject(404, "Pipeline not found");
    }

    if (pipeline.stage !== "curriculum_selected") {
      return reject(400, `Pipeline is in stage '${pipeline.stage}', expected 'curriculum_selected'`);
    }

    // Get family account
    const { data: familyAccount } = await supabase
      .from("office_desk.family_accounts")
      .select("*")
      .eq("id", pipeline.family_account_id)
      .single();

    if (!familyAccount) {
      return reject(404, "Family account not found");
    }

    // R5 minimum verification
    // In production, this would call a payment provider API to verify the debit order
    // For now, we just check that payment_method is set and update the minimum
    const MINIMUM_AMOUNT = 5.0; // R5 — just confirms account is open

    if (!familyAccount.payment_method) {
      return reject(400, "No payment method set on family account");
    }

    // Update family account with minimum amount
    await supabase
      .from("office_desk.family_accounts")
      .update({
        debit_order_minimum: MINIMUM_AMOUNT,
      })
      .eq("id", familyAccount.id);

    // Update pipeline stage
    const { error: updateError } = await supabase
      .from("office_desk.enrollment_pipelines")
      .update({
        stage: "debit_verified",
        stage_updated_at: new Date().toISOString(),
        stage_history: JSON.stringify([
          ...((pipeline.stage_history as unknown[]) || []),
          {
            stage: "debit_verified",
            timestamp: new Date().toISOString(),
            actor: "system",
            action: "debit_order_verified",
            amount: MINIMUM_AMOUNT,
            payment_method: familyAccount.payment_method,
          },
        ]),
      })
      .eq("id", pipeline_id);

    if (updateError) {
      console.error("Pipeline update failed:", updateError);
    }

    return jsonResp({
      status: "success",
      pipeline_id,
      verified: true,
      minimum_amount: MINIMUM_AMOUNT,
      payment_method: familyAccount.payment_method,
    });
  } catch (err) {
    console.error("verify-debit-order error:", err);
    return reject(500, "Internal server error", String(err));
  }
});
