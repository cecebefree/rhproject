// process-enrollment — Create profiles from form data
// POST /process-enrollment
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

    // Get pipeline with form data
    const { data: pipeline, error: pipeError } = await supabase
      .from("office_desk.enrollment_pipelines")
      .select(`
        *,
        form:office_desk.enrollment_forms(*)
      `)
      .eq("id", pipeline_id)
      .single();

    if (pipeError || !pipeline) {
      return reject(404, "Pipeline not found");
    }

    if (pipeline.stage !== "form_submitted") {
      return reject(400, `Pipeline is in stage '${pipeline.stage}', expected 'form_submitted'`);
    }

    // Get the submitted form
    const { data: forms } = await supabase
      .from("office_desk.enrollment_forms")
      .select("*")
      .eq("pipeline_id", pipeline_id)
      .eq("status", "submitted")
      .order("created_at", { ascending: false })
      .limit(1);

    if (!forms || forms.length === 0) {
      return reject(404, "No submitted form found for this pipeline");
    }

    const form = forms[0];
    const formData = form.form_data as Record<string, unknown>;
    const familyData = formData.family as Record<string, unknown>;
    const adults = formData.adults as Array<Record<string, unknown>>;
    const students = formData.students as Array<Record<string, unknown>>;

    const createdProfiles: Array<{ id: string; role: string; name: string }> = [];
    const errors: string[] = [];

    // 1. Create family account
    const familyCode = `FAM-${Date.now().toString(36).toUpperCase()}`;
    const { data: familyAccount, error: famError } = await supabase
      .from("office_desk.family_accounts")
      .insert({
        tenant_id: pipeline.tenant_id,
        family_code: familyCode,
        registration_reference: pipeline.registration_id,
        status: "active",
        contact_email: familyData.contact_email,
        contact_phone: familyData.contact_phone,
        address: familyData.address,
        payment_method: familyData.payment_method,
        pipeline_id: pipeline.id,
      })
      .select()
      .single();

    if (famError) {
      console.error("Family account creation failed:", famError);
      return reject(500, "Failed to create family account", famError.message);
    }

    // 2. Create adult profiles
    for (const adult of adults) {
      const adultName = `${adult.first_name} ${adult.last_name}`;

      // Check if profile already exists by email
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("name", adultName)
        .eq("tenant_id", pipeline.tenant_id)
        .single();

      if (existingProfile) {
        // Link existing profile to family
        await supabase
          .from("profiles")
          .update({ family_account_id: familyAccount.id })
          .eq("id", existingProfile.id);

        createdProfiles.push({ id: existingProfile.id, role: "family", name: adultName });
      } else {
        // Create new profile
        const { data: newProfile, error: profError } = await supabase
          .from("profiles")
          .insert({
            name: adultName,
            role: "family",
            tenant_id: pipeline.tenant_id,
            registration_status: "pending",
            family_account_id: familyAccount.id,
            enrollment_pipeline_id: pipeline.id,
          })
          .select()
          .single();

        if (profError) {
          errors.push(`Failed to create adult profile for ${adultName}: ${profError.message}`);
        } else {
          createdProfiles.push({ id: newProfile.id, role: "family", name: adultName });

          // Create auth user for adult
          const { error: authError } = await supabase.auth.admin.createUser({
            email: adult.email as string,
            email_confirm: true,
            user_metadata: {
              name: adultName,
              role: "family",
              tenant_id: pipeline.tenant_id,
            },
          });

          if (authError) {
            console.error(`Auth user creation failed for ${adult.email}:`, authError);
          }
        }
      }
    }

    // Set primary adult
    const primaryAdult = adults.find((a) => a.is_primary) || adults[0];
    const primaryProfile = createdProfiles.find(
      (p) => p.name === `${primaryAdult.first_name} ${primaryAdult.last_name}`
    );

    if (primaryProfile) {
      await supabase
        .from("office_desk.family_accounts")
        .update({ primary_adult_id: primaryProfile.id })
        .eq("id", familyAccount.id);
    }

    // 3. Create student profiles
    for (const student of students) {
      const studentName = `${student.first_name} ${student.last_name}`;

      const { data: newStudent, error: studError } = await supabase
        .from("profiles")
        .insert({
          name: studentName,
          role: "student",
          tenant_id: pipeline.tenant_id,
          registration_status: "pending",
          family_account_id: familyAccount.id,
          enrollment_pipeline_id: pipeline.id,
          date_of_birth: student.date_of_birth,
          curriculum: student.curriculum,
          grade: student.grade,
          intake: student.intake_group,
          zone: student.zone,
          class_section: student.class_section,
        })
        .select()
        .single();

      if (studError) {
        errors.push(`Failed to create student profile for ${studentName}: ${studError.message}`);
      } else {
        createdProfiles.push({ id: newStudent.id, role: "student", name: studentName });

        // Create auth user for student
        const studentEmail = `${studentName.toLowerCase().replace(/\s+/g, ".")}@redhouse.local`;
        const { error: authError } = await supabase.auth.admin.createUser({
          email: studentEmail,
          email_confirm: true,
          user_metadata: {
            name: studentName,
            role: "student",
            tenant_id: pipeline.tenant_id,
          },
        });

        if (authError) {
          console.error(`Auth user creation failed for ${studentName}:`, authError);
        }
      }
    }

    // Mark form as processed
    await supabase
      .from("office_desk.enrollment_forms")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", form.id);

    // Update pipeline stage
    const { error: updateError } = await supabase
      .from("office_desk.enrollment_pipelines")
      .update({
        stage: "profiles_created",
        family_account_id: familyAccount.id,
        stage_updated_at: new Date().toISOString(),
        stage_history: JSON.stringify([
          ...((pipeline.stage_history as unknown[]) || []),
          {
            stage: "profiles_created",
            timestamp: new Date().toISOString(),
            actor: "system",
            action: "profiles_created",
            profiles_count: createdProfiles.length,
            errors_count: errors.length,
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
      family_account_id: familyAccount.id,
      family_code: familyCode,
      profiles_created: createdProfiles,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("process-enrollment error:", err);
    return reject(500, "Internal server error", String(err));
  }
});
