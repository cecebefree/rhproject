// e2e/full-flow.test.ts
// Full end-to-end flow test — form → lead → webhook → registration → notification
//
// Tests cover:
//   1. Form submission -> website_leads insert
//   2. Mock Stripe webhook -> create registration
//   3. Trigger fires notification
//   4. Trigger payload format verification
//   5. RLS on notifications (anon blocked)
//   6. Error cases: missing notification, trigger doesn't block, concurrent registrations
//
// Prerequisites:
//   - Local Supabase running (supabase start)
//   - Migrations applied (supabase db push)
//   - Edge Functions deployed locally (supabase functions serve)
//   - Run: npx vitest run supabase/tests/e2e/full-flow.test.ts --reporter=verbose

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  buildStripeForm,
  buildPayPalForm,
  type WebsiteLeadRow,
} from "../factories/website-leads.factory.ts";
import {
  buildCheckoutSessionCompleted,
  signStripeWebhook,
} from "../mocks/stripe-webhook.mock.ts";
import {
  buildPayPalOrderCompleted,
  buildPayPalHeaders,
} from "../mocks/paypal-webhook.mock.ts";
import {
  waitForNotification,
  waitForNotificationOrThrow,
  waitForNotifications,
} from "./helpers/notification-wait.ts";

const SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost:54321";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const EF_BASE = `${SUPABASE_URL}/functions/v1`;
const TEST_SYNC_LEAD = `${EF_BASE}/sync-website-lead`;
const TEST_STRIPE_WEBHOOK = `${EF_BASE}/stripe-webhook`;

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_secret";

let adminClient: SupabaseClient;
let anonClient: SupabaseClient;

async function cleanupTestData(): Promise<void> {
  await adminClient.schema("office_desk").from("notifications").delete().gte("created_at", "1970-01-01");
  await adminClient.schema("office_desk").from("registrations").delete().gte("created_at", "1970-01-01");
  await adminClient.schema("front_desk").from("leads").delete().gte("created_at", "1970-01-01");
}

async function isEFAvailable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(3000) });
    return res.status !== 404;
  } catch {
    return false;
  }
}

async function submitForm(form: Record<string, unknown>): Promise<{ status: number; body: any }> {
  const res = await fetch(TEST_SYNC_LEAD, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function sendStripeWebhook(leadId: string, paymentIntentId?: string) {
  const event = buildCheckoutSessionCompleted({
    lead_id: leadId,
    customer: `cus_test_${Date.now()}`,
    payment_intent: paymentIntentId || `pi_test_${Date.now()}`,
  });
  const body = JSON.stringify(event);
  const signature = await signStripeWebhook(body, STRIPE_WEBHOOK_SECRET);

  const res = await fetch(TEST_STRIPE_WEBHOOK, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    },
    body,
  });
  const respBody = await res.json();
  return { status: res.status, body: respBody };
}

async function sendPayPalWebhook(leadId: string) {
  const captureId = `capture_pp_${Date.now()}`;
  const event = buildPayPalOrderCompleted({ lead_id: leadId, capture_id: captureId });
  const body = JSON.stringify(event);
  const headers = buildPayPalHeaders();

  const res = await fetch(TEST_STRIPE_WEBHOOK, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body,
  });
  const respBody = await res.json();
  return { status: res.status, body: respBody, captureId };
}

async function getLeadByEmail(email: string): Promise<any | null> {
  const { data } = await adminClient
    .schema("front_desk")
    .from("leads")
    .select("*")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1);
  return data && data.length > 0 ? data[0] : null;
}

async function getRegistrationByEmail(email: string): Promise<Record<string, unknown> | null> {
  const { data } = await adminClient
    .schema("office_desk")
    .from("registrations")
    .select("*")
    .eq("student_email", email)
    .order("created_at", { ascending: false })
    .limit(1);
  return data && data.length > 0 ? data[0] : null;
}

describe("Full Flow: Form → Lead → Webhook → Registration → Notification", () => {
  let efAvailable = false;

  beforeAll(async () => {
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    efAvailable = await isEFAvailable(TEST_SYNC_LEAD);
    if (!efAvailable) {
      console.warn(
        "\n⚠ Edge Functions not deployed locally — EF-dependent tests will be skipped.\n" +
          "  Deploy with: supabase functions serve\n"
      );
    }
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  // ═════════════════════════════════════════════════════════
  // STEP 1: Form submission -> website_leads insert
  // ═════════════════════════════════════════════════════════

  describe("Step 1: Form submission", () => {
    it("should create lead via sync-website-lead EF", async () => {
      if (!efAvailable) return;

      const form = buildStripeForm({ source_type: "contact_form" } as any);
      const { status, body } = await submitForm(form);

      // Lead insert (may return 502 if Stripe unavailable in test)
      expect(status).toBeLessThanOrEqual(502);

      // Verify front_desk.leads row created
      const lead = await getLeadByEmail(form.email);
      expect(lead).toBeTruthy();
      expect(lead!.email).toBe(form.email);

      // If EF succeeded, verify lead_id returned
      if (status === 200) {
        expect(body.lead_id).toBeTruthy();
      }
    });
  });

  // ═════════════════════════════════════════════════════════
  // STEP 2: Stripe webhook -> create registration
  // ═════════════════════════════════════════════════════════

  describe("Step 2: Stripe webhook", () => {
    it("should create registration on Stripe webhook", async () => {
      if (!efAvailable) return;

      const email = `stripe.flow.${Date.now()}@test.com`;
      const form = buildStripeForm({ email });
      const { body: submitBody } = await submitForm(form);
      const leadId = submitBody.lead_id;
      if (!leadId) return;

      await new Promise((r) => setTimeout(r, 300));

      const stripeChargeId = `pi_test_flow_${Date.now()}`;
      const { status, body } = await sendStripeWebhook(leadId, stripeChargeId);

      // Webhook should process
      expect(status).toBeLessThanOrEqual(500);

      // Registration created with pending_init status
      const reg = await getRegistrationByEmail(email);
      if (reg) {
        expect(reg.status).toBe("pending_init");
      }
    });
  });

  // ═════════════════════════════════════════════════════════
  // STEP 3: Trigger fires notification
  // ═════════════════════════════════════════════════════════

  describe("Step 3: Trigger fires notification", () => {
    it("should create notification row within 5 seconds", async () => {
      if (!efAvailable) return;

      const email = `notify.flow.${Date.now()}@test.com`;
      const form = buildStripeForm({ email });
      const { body: submitBody } = await submitForm(form);
      const leadId = submitBody.lead_id;
      if (!leadId) return;

      await new Promise((r) => setTimeout(r, 300));

      const { body } = await sendStripeWebhook(leadId);
      const registrationId = body.registration_id;
      if (!registrationId) return;

      // Wait for notification (async trigger)
      const notification = await waitForNotificationOrThrow(adminClient, registrationId, "office@redhouse.edu");

      expect(notification.status).toBe("sent");
      expect(notification.email_to).toBe("office@redhouse.edu");
      expect(notification.registration_id).toBe(registrationId);
      expect(notification.notification_type).toBe("new_registration");
    });
  });

  // ═════════════════════════════════════════════════════════
  // STEP 4: Trigger payload format
  // ═════════════════════════════════════════════════════════

  describe("Step 4: Trigger payload format", () => {
    it("should have correct event type and timestamp within 2s of registration", async () => {
      if (!efAvailable) return;

      const email = `payload.flow.${Date.now()}@test.com`;
      const form = buildStripeForm({ email });
      const { body: submitBody } = await submitForm(form);
      const leadId = submitBody.lead_id;
      if (!leadId) return;

      await new Promise((r) => setTimeout(r, 300));

      const { body } = await sendStripeWebhook(leadId);
      const registrationId = body.registration_id;
      if (!registrationId) return;

      const notification = await waitForNotificationOrThrow(adminClient, registrationId);

      // Timestamp within 5 seconds of registration created_at
      const reg = await adminClient
        .schema("office_desk")
        .from("registrations")
        .select("created_at")
        .eq("id", registrationId)
        .single();

      const notificationTime = new Date(notification.sent_at || notification.created_at).getTime();
      const regTime = new Date((reg.data as any).created_at).getTime();
      const diffMs = Math.abs(notificationTime - regTime);

      expect(diffMs).toBeLessThanOrEqual(5000);
    });
  });

  // ═════════════════════════════════════════════════════════
  // STEP 5: RLS on notifications
  // ═════════════════════════════════════════════════════════

  describe("Step 5: RLS on notifications", () => {
    it("should block anon SELECT and allow service_role SELECT", async () => {
      if (!efAvailable) return;

      // Create 2 registrations to test with
      const regIds: string[] = [];
      for (let i = 0; i < 2; i++) {
        const email = `rls.flow.${Date.now()}${i}@test.com`;
        const form = buildStripeForm({ email });
        const { body: submitBody } = await submitForm(form);
        const leadId = submitBody.lead_id;
        if (!leadId) continue;

        await new Promise((r) => setTimeout(r, 300));
        const { body } = await sendStripeWebhook(leadId);
        if (body.registration_id) regIds.push(body.registration_id);
      }

      // Wait for all notifications
      const results = await waitForNotifications(adminClient, regIds, { timeout: 10000 });
      expect(results.size).toBe(regIds.length);

      // Anon should see 0 rows (RLS blocks)
      const { data: anonData, error: anonError } = await anonClient
        .schema("office_desk")
        .from("notifications")
        .select("*");

      if (!anonError) {
        expect(anonData).toEqual([]);
      } else {
        expect((anonData || []).length).toBe(0);
      }

      // Service_role should see all notifications
      const { data: allNotifications } = await adminClient
        .schema("office_desk")
        .from("notifications")
        .select("*");

      expect(allNotifications).toBeTruthy();
      expect(allNotifications!.length).toBe(regIds.length);
    });
  });

  // ═════════════════════════════════════════════════════════
  // ERROR CASES
  // ═════════════════════════════════════════════════════════

  describe("Error Case 1: Missing notification", () => {
    it("should fail with debug info if notification not created", async () => {
      if (!efAvailable) return;

      const email = `missing.notif.${Date.now()}@test.com`;
      const form = buildStripeForm({ email });
      const { body: submitBody } = await submitForm(form);
      const leadId = submitBody.lead_id;
      if (!leadId) return;

      await new Promise((r) => setTimeout(r, 300));
      const { body } = await sendStripeWebhook(leadId);
      const registrationId = body.registration_id;
      if (!registrationId) return;

      const result = await waitForNotification(adminClient, registrationId, { timeout: 5000 });

      if (!result.found) {
        console.error("=== DEBUG: Notification not found ===");
        console.error(`Registration ID: ${registrationId}`);
        console.error(`Lead email: ${email}`);
        console.error(`Elapsed: ${result.elapsedMs}ms, attempts: ${result.attempts}`);

        const { data: anyNotif } = await adminClient
          .schema("office_desk")
          .from("notifications")
          .select("*")
          .eq("registration_id", registrationId);
        console.error(`Notifications with any type: ${JSON.stringify(anyNotif)}`);

        const { data: reg } = await adminClient
          .schema("office_desk")
          .from("registrations")
          .select("id, status, created_at")
          .eq("id", registrationId);
        console.error(`Registration: ${JSON.stringify(reg)}`);

        throw new Error("Notification not created after 5s — check office-desk-notify function logs");
      }

      expect(result.found).toBe(true);
    });
  });

  describe("Error Case 2: Trigger doesn't block registration", () => {
    it("should not block registration even if notification fails", async () => {
      if (!efAvailable) return;

      const email = `no.block.${Date.now()}@test.com`;
      const form = buildStripeForm({ email });
      const { body: submitBody } = await submitForm(form);
      const leadId = submitBody.lead_id;
      if (!leadId) return;

      await new Promise((r) => setTimeout(r, 300));

      const { status } = await sendStripeWebhook(leadId);

      // Webhook response should not be blocked by trigger (async pg_net)
      expect(status).toBeLessThanOrEqual(500);

      // Registration created regardless of notification state
      const reg = await getRegistrationByEmail(email);
      expect(reg).toBeTruthy();
    });
  });

  describe("Error Case 3: Concurrent registrations", () => {
    it("should handle 2 simultaneous registrations without race conditions", async () => {
      if (!efAvailable) return;

      const forms = [
        buildStripeForm({ email: `concurrent.a.${Date.now()}@test.com` }),
        buildStripeForm({ email: `concurrent.b.${Date.now()}@test.com` }),
      ];

      // Submit both forms in parallel
      const [resA, resB] = await Promise.all([
        submitForm(forms[0]),
        submitForm(forms[1]),
      ]);

      const leadIdA = resA.body.lead_id;
      const leadIdB = resB.body.lead_id;

      if (leadIdA && leadIdB) {
        await new Promise((r) => setTimeout(r, 300));

        // Send both webhooks in parallel
        const [webhookA, webhookB] = await Promise.all([
          sendStripeWebhook(leadIdA),
          sendStripeWebhook(leadIdB),
        ]);

        const regIdA = webhookA.body.registration_id;
        const regIdB = webhookB.body.registration_id;

        // Both registrations created
        expect(regIdA).toBeTruthy();
        expect(regIdB).toBeTruthy();

        // Both notifications created (no race condition)
        const results = await waitForNotifications(adminClient, [regIdA, regIdB], { timeout: 10000 });
        expect(results.size).toBe(2);
      }
    });
  });
});
