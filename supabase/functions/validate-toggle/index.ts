// validate-toggle — Verify family can toggle student access per-module
// Core curriculum cannot be paused if it's the only active module
// Enrichment and clubs can be paused independently
// Requires authenticated parent/guardian

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  if (handleCors(req)) return handleCors(req);

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Authenticate user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing Authorization header" }, 401);
  }

  const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

  if (userError || !user) {
    return jsonResponse({ error: "Invalid token" }, 401);
  }

  // Service-role client for data operations (bypasses RLS)
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const { family_account_id, student_id, module, action } = await req.json();

    // ═══════════════════════════════════════════════════════════
    // INPUT VALIDATION
    // ═══════════════════════════════════════════════════════════
    if (!family_account_id || typeof family_account_id !== "string") {
      return jsonResponse({ error: "Missing or invalid family_account_id" }, 400);
    }
    if (!student_id || typeof student_id !== "string") {
      return jsonResponse({ error: "Missing or invalid student_id" }, 400);
    }
    if (!module || !["core", "enrichment", "clubs"].includes(module)) {
      return jsonResponse({ error: "module must be 'core', 'enrichment', or 'clubs'" }, 400);
    }
    if (!action || !["pause", "resume"].includes(action)) {
      return jsonResponse({ error: "action must be 'pause' or 'resume'" }, 400);
    }

    // ═══════════════════════════════════════════════════════════
    // AUTHORIZATION: Verify user is parent/guardian of family
    // ═══════════════════════════════════════════════════════════
    const { data: familyUser, error: famErr } = await supabase
      .from("users")
      .select("id, family_account_id, user_type")
      .eq("auth_user_id", user.id)
      .eq("family_account_id", family_account_id)
      .eq("user_type", "adult")
      .single();

    if (famErr || !familyUser) {
      return jsonResponse({ error: "Unauthorized: not a parent/guardian of this family" }, 403);
    }

    // ═══════════════════════════════════════════════════════════
    // VALIDATION: Family account status + contract
    // ═══════════════════════════════════════════════════════════
    const { data: family, error: faErr } = await supabase
      .from("family_accounts")
      .select("id, status, contract_end_date")
      .eq("id", family_account_id)
      .single();

    if (faErr || !family) {
      return jsonResponse({ error: "Family account not found" }, 404);
    }

    if (family.status !== "active") {
      return jsonResponse({
        allowed: false,
        reason: "family_inactive",
        active_modules: [],
        paused_modules: [],
      });
    }

    if (!family.contract_end_date || new Date(family.contract_end_date) < new Date()) {
      return jsonResponse({
        allowed: false,
        reason: "contract_expired",
        active_modules: [],
        paused_modules: [],
      });
    }

    // ═══════════════════════════════════════════════════════════
    // VALIDATION: Student belongs to family
    // ═══════════════════════════════════════════════════════════
    const { data: student, error: stuErr } = await supabase
      .from("students")
      .select("id, family_account_id, status")
      .eq("id", student_id)
      .eq("family_account_id", family_account_id)
      .single();

    if (stuErr || !student) {
      return jsonResponse({ error: "Student not found in this family" }, 404);
    }

    // ═══════════════════════════════════════════════════════════
    // VALIDATION: Invoice payment status
    // ═══════════════════════════════════════════════════════════
    const { data: latestInvoice } = await supabase
      .from("invoices")
      .select("id, status, due_date")
      .eq("family_account_id", family_account_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (latestInvoice && latestInvoice.status === "failed") {
      // Check if within 7-day grace period
      const graceEnd = new Date(latestInvoice.due_date);
      graceEnd.setDate(graceEnd.getDate() + 7);

      if (new Date() > graceEnd) {
        return jsonResponse({
          allowed: false,
          reason: "payment_overdue",
          active_modules: [],
          paused_modules: [],
        });
      }
    }

    // ═══════════════════════════════════════════════════════════
    // MODULE LOGIC: Cannot pause core if it's the only active module
    // ═══════════════════════════════════════════════════════════
    const { data: studentModules } = await supabase
      .from("student_modules")
      .select("module, status")
      .eq("student_id", student_id);

    const modules = studentModules || [];
    const activeModules = modules.filter((m) => m.status === "active").map((m) => m.module);
    const pausedModules = modules.filter((m) => m.status === "paused").map((m) => m.module);

    // If pausing core, check if it's the only active module
    if (module === "core" && action === "pause") {
      if (activeModules.length <= 1 && activeModules.includes("core")) {
        return jsonResponse({
          allowed: false,
          reason: "cannot_pause_only_active_module",
          active_modules: activeModules,
          paused_modules: pausedModules,
        });
      }
    }

    // ═══════════════════════════════════════════════════════════
    // EXECUTE TOGGLE
    // ═══════════════════════════════════════════════════════════
    const newStatus = action === "pause" ? "paused" : "active";

    // Check if module record exists
    const existingModule = modules.find((m) => m.module === module);

    if (existingModule) {
      // Update existing
      const { error: updateErr } = await supabase
        .from("student_modules")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("student_id", student_id)
        .eq("module", module);

      if (updateErr) {
        console.error("[validate-toggle] Update failed:", updateErr.message);
        return jsonResponse({ error: "Failed to update module status" }, 500);
      }
    } else {
      // Insert new
      const { error: insertErr } = await supabase
        .from("student_modules")
        .insert({
          student_id,
          module,
          status: newStatus,
          tenant_id: family.tenant_id,
        });

      if (insertErr) {
        console.error("[validate-toggle] Insert failed:", insertErr.message);
        return jsonResponse({ error: "Failed to create module record" }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // LOG TO FAMILY_ACTIVITY (immutable audit)
    // ═══════════════════════════════════════════════════════════
    await supabase.from("family_activity").insert({
      family_account_id,
      activity_type: "student_module_toggled",
      details: {
        student_id,
        module,
        action,
        new_status: newStatus,
        function_name: "validate-toggle",
      },
    });

    // ═══════════════════════════════════════════════════════════
    // RETURN UPDATED STATE
    // ═══════════════════════════════════════════════════════════
    const updatedActive = action === "pause"
      ? activeModules.filter((m) => m !== module)
      : [...new Set([...activeModules, module])];
    const updatedPaused = action === "pause"
      ? [...new Set([...pausedModules, module])]
      : pausedModules.filter((m) => m !== module);

    return jsonResponse({
      allowed: true,
      reason: "success",
      active_modules: updatedActive,
      paused_modules: updatedPaused,
    });
  } catch (err) {
    console.error("[validate-toggle] Error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
