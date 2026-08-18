// flows/mobile-enrollment.spec.ts
// FLOW 1: Mobile Enrollment → Payment → Office Approval
//
// 1.1: Smoke test — /register page renders with correct form fields
// 1.2: API creates registration → Stripe webhook transitions to paid
// 1.3: payment_received notification created for office desk
// 1.4: Stripe event logged to stripe_events table

import { test, expect } from "@playwright/test";
import {
  seedTestData,
  cleanupTestData,
  supabaseAdmin,
  TEST_USERS,
  TEST_TENANT_ID,
} from "../helpers/db";
import { simulateStripeWebhook } from "../helpers/payment";
import {
  assertRegistrationExists,
  assertNotificationCreated,
  assertStripeEventProcessed,
} from "../helpers/assertions";

const STUDENT_EMAIL = "student-e2e@example.com";
const STUDENT_NAME = "E2E Student";
const COURSE_NAME = "Mathematics 101";

test.describe("FLOW 1: Mobile Enrollment → Payment → Approval", () => {
  test.beforeAll(async () => {
    await seedTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test("1.1 — /register page renders with form fields", async ({ page }) => {
    await page.goto("/register");

    // Verify page title renders
    await expect(page.locator("h1")).toContainText("Register Your Child");

    // Verify form fields exist (actual RegistrationForm field IDs)
    await expect(page.locator("#family_email")).toBeVisible();
    await expect(page.locator("#child_name")).toBeVisible();
    await expect(page.locator("#child_dob")).toBeVisible();
    await expect(page.locator("#amount_cents")).toBeVisible();

    // Verify payment method radios exist
    await expect(page.locator('input[name="payment_method"][value="stripe"]')).toBeVisible();
    await expect(page.locator('input[name="payment_method"][value="paypal"]')).toBeVisible();

    // Verify submit button
    await expect(page.locator('button[type="submit"]')).toContainText("Continue to Payment");
  });

  test("1.2 — registration + Stripe webhook transitions to paid + pending_review", async () => {
    // Create registration via API (simulates what website-lead-payment-session EF does)
    const { data: reg, error: regError } = await supabaseAdmin
      .schema("office_desk")
      .from("registrations")
      .insert({
        tenant_id: TEST_TENANT_ID,
        student_name: STUDENT_NAME,
        student_email: STUDENT_EMAIL,
        course_name: COURSE_NAME,
        status: "pending_init",
        payment_status: "pending",
      })
      .select()
      .single();

    expect(regError, `Registration create failed: ${regError?.message}`).toBeNull();
    expect(reg, "Registration not created").toBeTruthy();

    // Simulate Stripe charge.succeeded webhook
    const webhookResult = await simulateStripeWebhook({
      eventType: "charge.succeeded",
      chargeId: `ch_e2e_${Date.now()}`,
      registrationId: reg!.id,
      amount: 50000,
    });

    expect(webhookResult.status).toBe(200);
    expect(JSON.parse(webhookResult.body).received).toBe(true);

    // Verify registration updated to paid + pending_review
    await assertRegistrationExists(STUDENT_EMAIL, {
      payment_status: "paid",
      status: "pending_review",
    });
  });

  test("1.3 — payment_received notification created for office desk", async () => {
    const reg = await assertRegistrationExists(STUDENT_EMAIL, {});

    // Check that at least one office/admin user got a notification
    const officeUsers = [TEST_USERS.admin.id, TEST_USERS.office.id];
    let found = false;

    for (const userId of officeUsers) {
      try {
        await assertNotificationCreated(userId, "payment_received", {
          registrationId: reg.id,
          studentName: STUDENT_NAME,
        });
        found = true;
        break;
      } catch {
        // Try next user
      }
    }

    expect(found, "No payment_received notification found for office/admin").toBe(
      true
    );
  });

  test("1.4 — Stripe event logged to stripe_events table", async () => {
    const events = await (
      await import("../helpers/db")
    ).getStripeEvents();

    const chargeEvent = events.find(
      (e) => e.event_type === "charge.succeeded"
    );
    expect(chargeEvent, "charge.succeeded event not in stripe_events").toBeTruthy();
    expect(chargeEvent!.status).toBe("processed");
  });
});
