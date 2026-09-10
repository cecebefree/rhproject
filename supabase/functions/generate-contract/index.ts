// generate-contract — Auto-generate PDF contract from template
// POST /generate-contract
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

// Generate HTML contract template (will be converted to PDF client-side or via helper)
function generateContractHTML(data: {
  familyName: string;
  studentNames: string[];
  curriculum: string;
  grade: string;
  fees: string;
  paymentMethod: string;
  contractDate: string;
  contractId: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #1a5276; border-bottom: 2px solid #1a5276; padding-bottom: 10px; }
    h2 { color: #2c3e50; margin-top: 24px; }
    .header { text-align: center; margin-bottom: 32px; }
    .contract-id { color: #888; font-size: 12px; }
    .section { margin: 16px 0; padding: 12px; background: #f9f9f9; border-left: 4px solid #1a5276; }
    .signature-box { margin-top: 48px; border-top: 1px solid #ddd; padding-top: 24px; }
    .signature-line { border-bottom: 1px solid #333; width: 300px; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #1a5276; color: white; }
    .footer { margin-top: 48px; font-size: 11px; color: #888; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Redhouse Enrollment Contract</h1>
    <p class="contract-id">Contract ID: ${data.contractId}</p>
    <p>Date: ${data.contractDate}</p>
  </div>

  <div class="section">
    <h2>1. Parties</h2>
    <p><strong>School:</strong> Redhouse (Pty) Ltd</p>
    <p><strong>Family:</strong> ${data.familyName}</p>
    <p><strong>Student(s):</strong> ${data.studentNames.join(", ")}</p>
  </div>

  <div class="section">
    <h2>2. Enrollment Details</h2>
    <table>
      <tr><th>Item</th><th>Details</th></tr>
      <tr><td>Curriculum</td><td>${data.curriculum}</td></tr>
      <tr><td>Grade</td><td>${data.grade}</td></tr>
      <tr><td>Payment Method</td><td>${data.paymentMethod}</td></tr>
      <tr><td>Monthly Fees</td><td>${data.fees}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>3. Terms and Conditions</h2>
    <p>3.1. The School agrees to provide educational services to the Student(s) in accordance with the selected curriculum.</p>
    <p>3.2. The Family agrees to pay the agreed fees on time according to the selected payment method.</p>
    <p>3.3. Either party may terminate this agreement with 30 days written notice.</p>
    <p>3.4. The School reserves the right to suspend services in case of non-payment.</p>
    <p>3.5. Student behavior must comply with the School's code of conduct.</p>
  </div>

  <div class="section">
    <h2>4. Payment Authorization</h2>
    <p>By signing this contract, the Family authorizes the School to:</p>
    <p>4.1. Process payments via the selected payment method.</p>
    <p>4.2. Adjust fees annually with 60 days written notice.</p>
    <p>4.3. Charge late payment fees as per the School's fee schedule.</p>
  </div>

  <div class="signature-box">
    <h2>Signatures</h2>
    <p><strong>Family Representative:</strong></p>
    <div class="signature-line"></div>
    <p>Name: _________________________ Date: _____________</p>
    <br><br>
    <p><strong>School Representative:</strong></p>
    <div class="signature-line"></div>
    <p>Name: _________________________ Date: _____________</p>
  </div>

  <div class="footer">
    <p>This contract is governed by the laws of the Republic of South Africa.</p>
    <p>Redhouse (Pty) Ltd | registration@redhouse.co.za</p>
  </div>
</body>
</html>`;
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

    // Get pipeline with family account and form data
    const { data: pipeline, error: pipeError } = await supabase
      .from("office_desk.enrollment_pipelines")
      .select("*")
      .eq("id", pipeline_id)
      .single();

    if (pipeError || !pipeline) {
      return reject(404, "Pipeline not found");
    }

    if (pipeline.stage !== "profiles_created") {
      return reject(400, `Pipeline is in stage '${pipeline.stage}', expected 'profiles_created'`);
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

    // Get student profiles linked to this family
    const { data: students } = await supabase
      .from("profiles")
      .select("name, curriculum, grade")
      .eq("family_account_id", pipeline.family_account_id)
      .eq("role", "student");

    const studentNames = students?.map((s) => s.name) || [];
    const curriculum = students?.[0]?.curriculum || "Not assigned";
    const grade = students?.[0]?.grade || "Not assigned";

    // Generate contract
    const contractId = `CTR-${Date.now().toString(36).toUpperCase()}`;
    const contractHTML = generateContractHTML({
      familyName: familyAccount.family_code,
      studentNames,
      curriculum,
      grade,
      fees: "To be determined",
      paymentMethod: familyAccount.payment_method || "To be determined",
      contractDate: new Date().toLocaleDateString("en-ZA"),
      contractId,
    });

    // Store contract record
    const { data: contract, error: contractError } = await supabase
      .from("office_desk.contracts")
      .insert({
        tenant_id: pipeline.tenant_id,
        pipeline_id: pipeline.id,
        family_account_id: familyAccount.id,
        contract_type: pipeline.pipeline_type === "family" ? "enrollment" : "teacher",
        version: 1,
        template_version: "1.0",
        pdf_storage_path: `contracts/${pipeline.id}/${contractId}.html`,
        status: "draft",
      })
      .select()
      .single();

    if (contractError) {
      console.error("Contract creation failed:", contractError);
      return reject(500, "Failed to create contract", contractError.message);
    }

    // Upload HTML to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("contracts")
      .upload(`${pipeline.id}/${contractId}.html`, contractHTML, {
        contentType: "text/html",
        upsert: true,
      });

    if (uploadError) {
      console.error("Contract upload failed:", uploadError);
      // Non-fatal — contract record exists
    }

    // Link contract to pipeline
    await supabase
      .from("office_desk.enrollment_pipelines")
      .update({ contract_id: contract.id })
      .eq("id", pipeline_id);

    return jsonResp({
      status: "success",
      contract_id: contract.id,
      contract_html: contractHTML,
      storage_path: `contracts/${pipeline.id}/${contractId}.html`,
    });
  } catch (err) {
    console.error("generate-contract error:", err);
    return reject(500, "Internal server error", String(err));
  }
});
