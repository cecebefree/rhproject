// flows/notifications-bell.spec.ts
// FLOW 6: Notifications → Bell Icon + Dropdown

import { test, expect } from "@playwright/test";
import {
  seedTestData,
  cleanupTestData,
  supabaseAdmin,
  TEST_USERS,
  TEST_TENANT_ID,
} from "../helpers/db";

const NOTIFICATIONS = [
  {
    type: "payment_received",
    title: "Payment Received",
    body: "Payment received for Test Student — Mathematics 101",
  },
  {
    type: "registration_approved",
    title: "Registration Approved",
    body: "Registration approved for Test Student",
  },
  {
    type: "grade_posted",
    title: "Grade Posted",
    body: "New grade posted for Test Student",
  },
];

test.describe("FLOW 6: Notifications Bell", () => {
  test.beforeAll(async () => {
    await seedTestData();

    for (const n of NOTIFICATIONS) {
      await supabaseAdmin.from("notifications").insert({
        tenant_id: TEST_TENANT_ID,
        user_id: TEST_USERS.office.id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: {},
      });
    }
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test("6.1 — notifications exist in DB", async () => {
    const { data: notifications } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", TEST_USERS.office.id);

    expect(notifications).toBeTruthy();
    expect(notifications!.length).toBeGreaterThanOrEqual(NOTIFICATIONS.length);
  });

  test("6.2 — notifications have correct types", async () => {
    const { data: notifications } = await supabaseAdmin
      .from("notifications")
      .select("type")
      .eq("user_id", TEST_USERS.office.id);

    const types = notifications?.map((n) => n.type) ?? [];
    for (const n of NOTIFICATIONS) {
      expect(types).toContain(n.type);
    }
  });

  test("6.3 — unread count matches seeded notifications", async () => {
    // unread = read_at IS NULL
    const { count } = await supabaseAdmin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", TEST_USERS.office.id)
      .is("read_at", null);

    expect(count).toBeGreaterThanOrEqual(NOTIFICATIONS.length);
  });

  test("6.4 — mark all as read clears unread count", async () => {
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", TEST_USERS.office.id)
      .is("read_at", null);

    expect(error, `Mark all read failed: ${error?.message}`).toBeNull();

    const { count } = await supabaseAdmin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", TEST_USERS.office.id)
      .is("read_at", null);

    expect(count).toBe(0);
  });

  test("6.5 — notifications page loads without error", async ({ page }) => {
    const response = await page.goto("/lms/office-desk");
    expect(response?.status()).toBeLessThan(500);
  });
});
