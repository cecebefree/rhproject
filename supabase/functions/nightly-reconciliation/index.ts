// nightly-reconciliation — Automated nightly job for financial state reconciliation
// Scheduled via pg_cron at 00:00 UTC daily
// Uses service_role_key to bypass RLS

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

Deno.serve(async (req) => {
  if (handleCors(req)) return handleCors(req);

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Verify service-role auth
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
  const startTime = Date.now();

  let invoicesPaid = 0;
  let debitOrdersCharged = 0;
  let failedCharges = 0;
  const errors: string[] = [];

  try {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: Update paid invoices
    // Mark invoices as paid if a completed payment exists
    // ═══════════════════════════════════════════════════════════
    const { data: pendingInvoices, error: invErr } = await supabase
      .from("invoices")
      .select("id, family_account_id, amount")
      .eq("status", "pending");

    if (invErr) {
      console.error("[nightly-reconciliation] Failed to fetch pending invoices:", invErr.message);
      errors.push(`invoices_fetch: ${invErr.message}`);
    } else if (pendingInvoices && pendingInvoices.length > 0) {
      for (const invoice of pendingInvoices) {
        // Check if a completed payment exists for this invoice
        const { data: payment } = await supabase
          .from("payments")
          .select("id")
          .eq("invoice_id", invoice.id)
          .eq("status", "completed")
          .limit(1)
          .single();

        if (payment) {
          // Mark invoice as paid
          const { error: updateErr } = await supabase
            .from("invoices")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("id", invoice.id);

          if (updateErr) {
            console.error(`[nightly-reconciliation] Failed to update invoice ${invoice.id}:`, updateErr.message);
            errors.push(`invoice_update_${invoice.id}: ${updateErr.message}`);
            continue;
          }

          // Log to family_activity (immutable audit)
          await supabase.from("family_activity").insert({
            family_account_id: invoice.family_account_id,
            activity_type: "invoice_paid",
            details: {
              invoice_id: invoice.id,
              amount: invoice.amount,
              function_name: "nightly-reconciliation",
            },
          });

          invoicesPaid++;
        }
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Charge debit orders due today
    // ═══════════════════════════════════════════════════════════
    const today = new Date().toISOString().split("T")[0];

    const { data: dueDebitOrders, error: dboErr } = await supabase
      .from("debit_orders")
      .select("id, family_account_id, student_id, amount, frequency, next_debit_date, failed_attempts, max_retries")
      .lte("next_debit_date", today)
      .eq("status", "active");

    if (dboErr) {
      console.error("[nightly-reconciliation] Failed to fetch due debit orders:", dboErr.message);
      errors.push(`debit_orders_fetch: ${dboErr.message}`);
    } else if (dueDebitOrders && dueDebitOrders.length > 0) {
      for (const dbo of dueDebitOrders) {
        // Check family account is active
        const { data: family } = await supabase
          .from("family_accounts")
          .select("id, status")
          .eq("id", dbo.family_account_id)
          .single();

        if (!family || family.status !== "active") {
          console.log(`[nightly-reconciliation] Skipping debit order ${dbo.id} — family inactive`);
          continue;
        }

        // Create invoice for this charge
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        const { data: newInvoice, error: createInvErr } = await supabase
          .from("invoices")
          .insert({
            family_account_id: dbo.family_account_id,
            student_id: dbo.student_id,
            amount: dbo.amount,
            status: "pending",
            due_date: dueDate.toISOString().split("T")[0],
          })
          .select("id")
          .single();

        if (createInvErr) {
          console.error(`[nightly-reconciliation] Failed to create invoice for debit order ${dbo.id}:`, createInvErr.message);
          errors.push(`create_invoice_${dbo.id}: ${createInvErr.message}`);
          continue;
        }

        // Update next_debit_date based on frequency
        const nextDate = new Date(today);
        if (dbo.frequency === "monthly") {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (dbo.frequency === "term") {
          nextDate.setMonth(nextDate.getMonth() + 3);
        } else if (dbo.frequency === "annual") {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        }

        const { error: updateDboErr } = await supabase
          .from("debit_orders")
          .update({
            next_debit_date: nextDate.toISOString().split("T")[0],
            last_debit_date: today,
          })
          .eq("id", dbo.id);

        if (updateDboErr) {
          console.error(`[nightly-reconciliation] Failed to update debit order ${dbo.id}:`, updateDboErr.message);
          errors.push(`update_dbo_${dbo.id}: ${updateDboErr.message}`);
        }

        // Log to family_activity
        await supabase.from("family_activity").insert({
          family_account_id: dbo.family_account_id,
          activity_type: "debit_order_charged",
          details: {
            debit_order_id: dbo.id,
            amount: dbo.amount,
            frequency: dbo.frequency,
            invoice_id: newInvoice.id,
            function_name: "nightly-reconciliation",
          },
        });

        debitOrdersCharged++;
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Retry failed invoices (max 3 retries)
    // ═══════════════════════════════════════════════════════════
    const { data: failedInvoices, error: failErr } = await supabase
      .from("invoices")
      .select("id, family_account_id, amount")
      .eq("status", "failed")
      .lt("retry_count", 3);

    if (failErr) {
      console.error("[nightly-reconciliation] Failed to fetch failed invoices:", failErr.message);
      errors.push(`failed_invoices_fetch: ${failErr.message}`);
    } else if (failedInvoices && failedInvoices.length > 0) {
      for (const invoice of failedInvoices) {
        // Increment retry count
        const { error: retryErr } = await supabase
          .from("invoices")
          .update({
            retry_count: supabase.rpc ? 1 : 1, // Will use raw SQL below
          })
          .eq("id", invoice.id);

        // Use raw increment via RPC or direct update
        await supabase.rpc("increment_invoice_retry", { p_invoice_id: invoice.id });

        // Log retry attempt
        await supabase.from("family_activity").insert({
          family_account_id: invoice.family_account_id,
          activity_type: "invoice_retry",
          details: {
            invoice_id: invoice.id,
            amount: invoice.amount,
            function_name: "nightly-reconciliation",
          },
        });

        failedCharges++;
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Send notifications
    // ═══════════════════════════════════════════════════════════

    // Notify families of unpaid invoices (overdue > 7 days)
    const { data: overdueInvoices } = await supabase
      .from("invoices")
      .select("id, family_account_id, amount, due_date")
      .eq("status", "pending")
      .lt("due_date", today);

    if (overdueInvoices && overdueInvoices.length > 0) {
      for (const inv of overdueInvoices) {
        // Create in-app notification
        const { data: familyUser } = await supabase
          .from("users")
          .select("auth_user_id")
          .eq("family_account_id", inv.family_account_id)
          .eq("user_type", "adult")
          .limit(1)
          .single();

        if (familyUser) {
          await supabase.from("notifications").insert({
            user_id: familyUser.auth_user_id,
            tenant_id: "00000000-0000-0000-0000-000000000001",
            type: "system",
            title: "Payment Overdue",
            body: `Invoice for R${inv.amount} is overdue. Please settle to avoid service interruption.`,
          });
        }

        // Log to family_activity
        await supabase.from("family_activity").insert({
          family_account_id: inv.family_account_id,
          activity_type: "overdue_reminder_sent",
          details: {
            invoice_id: inv.id,
            amount: inv.amount,
            due_date: inv.due_date,
            function_name: "nightly-reconciliation",
          },
        });
      }
    }

    // ═══════════════════════════════════════════════════════════
    // Log to system_log
    // ═══════════════════════════════════════════════════════════
    const durationMs = Date.now() - startTime;

    await supabase.from("system_log").insert({
      function_name: "nightly-reconciliation",
      status: errors.length > 0 ? "warning" : "success",
      details: {
        invoices_paid: invoicesPaid,
        debit_orders_charged: debitOrdersCharged,
        failed_charges: failedCharges,
        duration_ms: durationMs,
        errors: errors.length > 0 ? errors : undefined,
      },
    });

    return jsonResponse({
      success: true,
      invoices_paid: invoicesPaid,
      debit_orders_charged: debitOrdersCharged,
      failed_charges: failedCharges,
      timestamp: new Date().toISOString(),
      duration_ms: durationMs,
    });
  } catch (err) {
    console.error("[nightly-reconciliation] Fatal error:", err);

    // Log failure
    await supabase.from("system_log").insert({
      function_name: "nightly-reconciliation",
      status: "error",
      details: { error: String(err) },
    });

    return jsonResponse({ error: "Reconciliation failed" }, 500);
  }
});
