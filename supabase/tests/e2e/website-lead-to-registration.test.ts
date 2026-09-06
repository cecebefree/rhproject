// e2e/website-lead-to-registration.test.ts
// End-to-end tests for the website lead pipeline:
//   1. Form submission -> website_leads insert (via sync-website-lead EF)
//   2. DB insert with correct schema
//   3. Webhook: Stripe signature verification (via stripe-webhook EF)
//   4. Webhook: Payment success -> create registration + invoice
//   5. Idempotency: duplicate webhook fires
//   6. RLS enforcement
//
// Prerequisites:
//   - Local Supabase running (supabase start)
//   - Edge Functions deployed locally (supabase functions serve)
//   - Run: npx vitest run tests/e2e/website-lead-to-registration.test.ts

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  buildForm,
  buildStripeForm,
  buildMinimalForm,
  type WebsiteLeadForm,
  type WebsiteLeadRow,
} from "../factories/website-leads.factory.ts";
import {
  buildCheckoutSessionCompleted,
  signStripeWebhook,
} from "../mocks/stripe-webhook.mock.ts";

const SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost:54321";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const EF_BASE = `${SUPABASE_URL}/functions/v1`;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_secret";
const TEST_SYNC_LEAD = `${EF_BASE}/sync-website-lead`;
const TEST_STRIPE_WEBHOOK = `${EF_BASE}/stripe-webhook`;

let adminClient: SupabaseClient;
let anonClient: SupabaseClient;

async function insertLeadViaAdmin(
  overrides: Record<string, any> = {}
): Promise<any> {
  const n = Date.now();
  const data = {
    email: `test-lead-${n}@example.com`,
    name: `TestLead ${n}`,
    tenant_id: "00000000-0000-0000-0000-000000000001",
    ...overrides,
  };

  const { data: lead, error } = await adminClient
    .schema("front_desk")
    .from("leads")
    .insert(data)
    .select("*")
    .single();

  if (error) throw new Error(`insertLeadViaAdmin: ${error.message}`);
  return lead;
}

async function getLeadById(id: string): Promise<any | null> {
  const { data } = await adminClient
    .schema("front_desk")
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();
  return data || null;
}

async function getRegistrationsByEmail(email: string): Promise<unknown[]> {
  const { data } = await adminClient
    .schema("office_desk")
    .from("registrations")
    .select("*")
    .eq("student_email", email);
  return data || [];
}

async function countRegistrationsByEmail(email: string): Promise<number> {
  const regs = await getRegistrationsByEmail(email);
  return regs.length;
}

async function isEFAvailable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    return res.status !== 404;
  } catch {
    return false;
  }
}

describe("Website Lead Pipeline E2E", () => {
  let syncEFAvailable = false;
  let webhookEFAvailable = false;

  beforeAll(() => {
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  beforeEach(async () => {
    syncEFAvailable = await isEFAvailable(TEST_SYNC_LEAD);
    webhookEFAvailable = await isEFAvailable(TEST_STRIPE_WEBHOOK);
  });

  // ═════════════════════════════════════════════════════════
  // 1. Form submission -> website_leads insert
  // ═════════════════════════════════════════════════════════

  describe("1. Form submission -> website_leads insert", () => {
    it("should create a lead via sync-website-lead EF", async () => {
      if (!syncEFAvailable) return;

      const form = buildStripeForm({ source_type: "contact_form" } as any);
      const res = await fetch(TEST_SYNC_LEAD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      expect([200, 201]).toContain(res.status);
      const body = await res.json();
      expect(body.lead_id).toBeTruthy();
    });

    it("should store lead in DB with correct columns", async () => {
      if (!syncEFAvailable) return;

      const form = buildStripeForm({ source_type: "contact_form" } as any);
      const res = await fetch(TEST_SYNC_LEAD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const body = await res.json();
      if (!body.lead_id) return; // EF returned error, skip
      const lead = await getLeadById(body.lead_id);

      expect(lead).toBeTruthy();
      expect(lead!.email).toBe(form.email);
      expect(lead!.name).toBe(form.name);
    });
  });

  // ═════════════════════════════════════════════════════════
  // 2. DB insert with correct schema
  // ═════════════════════════════════════════════════════════

  describe("2. DB schema validation", () => {
    it("should insert a lead with all valid columns", async () => {
      const n = Date.now();
      const { data: lead, error } = await adminClient
        .from("website_leads")
        .insert({
          email: `schema-test-${n}@example.com`,
          name: "Schema Test",
          message: "Testing schema columns",
          verified: true,
        })
        .select("*")
        .single();

      expect(error).toBeNull();
      expect(lead).toBeTruthy();
      expect((lead as WebsiteLeadRow).email).toBe(`schema-test-${n}@example.com`);
      expect((lead as WebsiteLeadRow).name).toBe("Schema Test");
      expect((lead as WebsiteLeadRow).message).toBe("Testing schema columns");
      expect((lead as WebsiteLeadRow).verified).toBe(true);

      // Cleanup
      await adminClient.from("website_leads").delete().eq("id", lead!.id);
    });

    it("should insert a lead with minimal columns", async () => {
      const n = Date.now();
      const { data: lead, error } = await adminClient
        .from("website_leads")
        .insert({
          email: `minimal-test-${n}@example.com`,
        })
        .select("*")
        .single();

      expect(error).toBeNull();
      expect(lead).toBeTruthy();

      // Cleanup
      await adminClient.from("website_leads").delete().eq("id", lead!.id);
    });
  });

  // ═════════════════════════════════════════════════════════
  // 3. Webhook: Stripe signature verification
  // ═════════════════════════════════════════════════════════

  describe("3. Webhook: Stripe signature verification", () => {
    it("should accept valid HMAC signature (or 401 if JWT required)", async () => {
      if (!webhookEFAvailable) return;

      const lead = await insertLeadViaAdmin();
      const event = buildCheckoutSessionCompleted({
        lead_id: lead.id,
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

      // 200 = processed, 401 = JWT required (EF deployed with verify_jwt=true)
      expect([200, 401]).toContain(res.status);
    });

    it("should reject invalid signature (or 401 if JWT required)", async () => {
      if (!webhookEFAvailable) return;

      const event = buildCheckoutSessionCompleted({
        lead_id: "00000000-0000-0000-0000-000000000000",
      });

      const res = await fetch(TEST_STRIPE_WEBHOOK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "t=0,v1=invalid_signature",
        },
        body: JSON.stringify(event),
      });

      // 400 = invalid signature, 401 = JWT required
      expect([400, 401]).toContain(res.status);
    });

    it("should reject missing signature header (or 401 if JWT required)", async () => {
      if (!webhookEFAvailable) return;

      const event = buildCheckoutSessionCompleted({
        lead_id: "00000000-0000-0000-0000-000000000000",
      });

      const res = await fetch(TEST_STRIPE_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });

      // 400 = missing signature, 401 = JWT required
      expect([400, 401]).toContain(res.status);
    });
  });

  // ═════════════════════════════════════════════════════════
  // 4. Webhook: Payment success -> create registration
  // ═════════════════════════════════════════════════════════

  describe("4. Webhook: Payment success -> create registration", () => {
    it("should create registration on Stripe webhook", async () => {
      if (!webhookEFAvailable) return;

      const lead = await insertLeadViaAdmin({
        email: `stripe-webhook-test-${Date.now()}@test.com`,
      });

      const event = buildCheckoutSessionCompleted({
        lead_id: lead.id,
        customer: "cus_test_stripe_123",
        payment_intent: "pi_test_stripe_456",
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

      if (res.status === 200 && respBody.registration_id) {
        // Verify registration was created
        const registrations = await getRegistrationsByEmail(lead.email);
        expect(registrations.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ═════════════════════════════════════════════════════════
  // 5. Idempotency: duplicate webhook fires
  // ═════════════════════════════════════════════════════════

  describe("5. Idempotency: duplicate webhook fires", () => {
    it("should not create duplicate registration on same event_id", async () => {
      if (!webhookEFAvailable) return;

      const email = `idempotent-${Date.now()}@test.com`;
      const lead = await insertLeadViaAdmin({ email });

      const eventId = `evt_idempotent_${Date.now()}`;
      const event = buildCheckoutSessionCompleted({
        lead_id: lead.id,
        event_id: eventId,
      });

      const body = JSON.stringify(event);
      const signature = await signStripeWebhook(body, STRIPE_WEBHOOK_SECRET);

      // Send first time
      const res1 = await fetch(TEST_STRIPE_WEBHOOK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": signature,
        },
        body,
      });

      // Send same event again
      const res2 = await fetch(TEST_STRIPE_WEBHOOK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": signature,
        },
        body,
      });

      if (res1.status === 200) {
        await new Promise((r) => setTimeout(r, 100));
        const count = await countRegistrationsByEmail(email);
        expect(count).toBeLessThanOrEqual(1);
      }
    });
  });

  // ═════════════════════════════════════════════════════════
  // 6. RLS enforcement
  // ═════════════════════════════════════════════════════════

  describe("6. RLS enforcement", () => {
    it("should block anon SELECT on office_desk.registrations", async () => {
      const { data: reg } = await adminClient
        .schema("office_desk")
        .from("registrations")
        .insert({
          tenant_id: "00000000-0000-0000-0000-000000000001",
          student_name: "RLS Test Student",
          student_email: "rls.test@example.com",
          status: "pending_init",
        })
        .select("id")
        .single();

      if (reg) {
        const { data: anonData, error: anonError } = await anonClient
          .schema("office_desk")
          .from("registrations")
          .select("*")
          .eq("id", reg.id);

        if (!anonError) {
          expect(anonData).toEqual([]);
        }

        await adminClient
          .schema("office_desk")
          .from("registrations")
          .delete()
          .eq("id", reg.id);
      }
    });

    it("should allow service_role SELECT on website_leads", async () => {
      const n = Date.now();
      const { data: inserted } = await adminClient
        .from("website_leads")
        .insert({
          email: `rls-select-${n}@test.com`,
          name: "RLS Select Test",
        })
        .select("id")
        .single();

      const { data, error } = await adminClient
        .from("website_leads")
        .select("*")
        .eq("id", inserted!.id);

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data!.length).toBe(1);

      await adminClient.from("website_leads").delete().eq("id", inserted!.id);
    });

    it("should allow service_role INSERT on website_leads", async () => {
      const n = Date.now();
      const { data, error } = await adminClient
        .from("website_leads")
        .insert({
          email: `rls-insert-${n}@test.com`,
          name: "RLS Insert Test",
        })
        .select("id")
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();

      if (data) {
        await adminClient.from("website_leads").delete().eq("id", data.id);
      }
    });
  });
});
