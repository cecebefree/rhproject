// flows/front-desk-invoice.spec.ts
// FLOW 2: Front Desk → Invoice → Payment

import { test, expect } from "@playwright/test";
import {
  seedTestData,
  cleanupTestData,
  supabaseAdmin,
  TEST_USERS,
  TEST_TENANT_ID,
} from "../helpers/db";
import { loginViaAPI } from "../helpers/auth";
import { simulateStripeWebhook, sendTemplateEmail } from "../helpers/payment";
import { assertEmailSent, assertRegistrationExists } from "../helpers/assertions";

const LEAD_EMAIL = "lead-parent-e2e@example.com";
const LEAD_NAME = "E2E Lead Parent";

test.describe("FLOW 2: Front Desk → Invoice → Payment", () => {
  let officeToken: string;

  test.beforeAll(async () => {
    await seedTestData();
    officeToken = await loginViaAPI(
      TEST_USERS.office.email,
      TEST_USERS.office.password
    );
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test("2.1 — office user can create a lead via API", async () => {
    const { data: lead, error } = await supabaseAdmin
      .schema("front_desk")
      .from("leads")
      .insert({
        tenant_id: TEST_TENANT_ID,
        name: LEAD_NAME,
        email: LEAD_EMAIL,
        phone: "+27123456789",
        notes: "E2E test lead",
        status: "enquiry",
      })
      .select()
      .single();

    expect(error, `Lead creation failed: ${error?.message}`).toBeNull();
    expect(lead).toBeTruthy();
  });

  test("2.2 — send payment_confirmation email via template EF", async () => {
    const result = await sendTemplateEmail({
      accessToken: officeToken,
      templateId: "payment_confirmation",
      recipientEmail: LEAD_EMAIL,
      recipientName: LEAD_NAME,
      data: {
        invoice_number: "E2E-INV-001",
        course_name: "English 101",
        amount: "450",
        currency: "ZAR",
        payment_date: new Date().toISOString().split("T")[0],
        portal_url: "http://localhost:5173/lms/office-desk",
      },
    });

    expect(result.status).toBe(200);
    expect(JSON.parse(result.body).status).toBe("sent");
  });

  test("2.3 — email_logs tracks the payment_confirmation email", async () => {
    await assertEmailSent("payment_confirmation", LEAD_EMAIL);
  });

  test("2.4 — registration created + Stripe webhook marks as paid", async () => {
    const { data: reg } = await supabaseAdmin
      .schema("office_desk")
      .from("registrations")
      .insert({
        tenant_id: TEST_TENANT_ID,
        student_name: "E2E Lead Student",
        student_email: LEAD_EMAIL,
        course_name: "English 101",
        status: "pending_init",
        payment_status: "pending",
      })
      .select()
      .single();

    expect(reg, "Registration not created").toBeTruthy();

    const webhookResult = await simulateStripeWebhook({
      eventType: "charge.succeeded",
      chargeId: `ch_e2e_invoice_${Date.now()}`,
      registrationId: reg!.id,
      amount: 45000,
    });

    expect(webhookResult.status).toBe(200);

    await assertRegistrationExists(LEAD_EMAIL, {
      payment_status: "paid",
      status: "pending_review",
    });
  });
});
