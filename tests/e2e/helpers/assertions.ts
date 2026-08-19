// helpers/assertions.ts — DB state verification helpers for E2E tests

import { expect } from "@playwright/test";
import {
  supabaseAdmin,
  getRegistration,
  getNotifications,
  getEmailLogs,
  getStripeEvents,
  getRefunds,
  TEST_TENANT_ID,
} from "./db";

const TEST_TENANT = TEST_TENANT_ID;

// ═══════════════════════════════════════════════════════════
// REGISTRATION ASSERTIONS
// ═══════════════════════════════════════════════════════════

export async function assertRegistrationExists(
  email: string,
  expected: {
    status?: string;
    payment_status?: string;
    course_name?: string;
  }
) {
  const reg = await getRegistration(email);
  expect(reg, `Registration not found for ${email}`).toBeTruthy();

  if (expected.status) {
    expect(reg!.status).toBe(expected.status);
  }
  if (expected.payment_status) {
    expect(reg!.payment_status).toBe(expected.payment_status);
  }
  if (expected.course_name) {
    expect(reg!.course_name).toBe(expected.course_name);
  }

  return reg!;
}

// ═══════════════════════════════════════════════════════════
// NOTIFICATION ASSERTIONS
// ═══════════════════════════════════════════════════════════

export async function assertNotificationCreated(
  userId: string,
  type: string,
  expectedData?: Record<string, unknown>
) {
  const notifications = await getNotifications(userId);
  const match = notifications.find((n) => n.type === type);

  expect(
    match,
    `Notification type '${type}' not found for user ${userId}. Found: ${notifications.map((n) => n.type).join(", ")}`
  ).toBeTruthy();

  if (expectedData) {
    for (const [key, value] of Object.entries(expectedData)) {
      expect(match!.data?.[key]).toBe(value);
    }
  }

  return match!;
}

export async function assertNotificationCount(
  userId: string,
  type: string,
  expectedCount: number
) {
  const notifications = await getNotifications(userId);
  const count = notifications.filter((n) => n.type === type).length;
  expect(count).toBe(expectedCount);
}

// ═══════════════════════════════════════════════════════════
// EMAIL LOG ASSERTIONS
// ═══════════════════════════════════════════════════════════

export async function assertEmailSent(
  templateId: string,
  recipientEmail: string
) {
  const logs = await getEmailLogs(TEST_TENANT);
  const match = logs.find(
    (l) => l.template_id === templateId && l.recipient_email === recipientEmail
  );

  expect(
    match,
    `Email template '${templateId}' to '${recipientEmail}' not found in logs`
  ).toBeTruthy();
  expect(match!.status).toBe("sent");

  return match!;
}

export async function assertEmailCount(
  templateId: string,
  expectedCount: number
) {
  const logs = await getEmailLogs(TEST_TENANT);
  const count = logs.filter((l) => l.template_id === templateId).length;
  expect(count).toBe(expectedCount);
}

// ═══════════════════════════════════════════════════════════
// STRIPE EVENT ASSERTIONS
// ═══════════════════════════════════════════════════════════

export async function assertStripeEventProcessed(
  eventId: string,
  eventType: string
) {
  const events = await getStripeEvents();
  const match = events.find(
    (e) => e.stripe_event_id === eventId && e.event_type === eventType
  );

  expect(
    match,
    `Stripe event '${eventId}' (${eventType}) not found`
  ).toBeTruthy();
  expect(match!.status).toBe("processed");

  return match!;
}

// ═══════════════════════════════════════════════════════════
// REFUND ASSERTIONS
// ═══════════════════════════════════════════════════════════

export async function assertRefundCreated(
  registrationId: string,
  expectedAmount?: number
) {
  const refunds = await getRefunds();
  const match = refunds.find((r) => r.registration_id === registrationId);

  expect(match, `Refund not found for registration ${registrationId}`).toBeTruthy();

  if (expectedAmount !== undefined) {
    expect(match!.amount).toBe(expectedAmount);
  }

  return match!;
}

// ═══════════════════════════════════════════════════════════
// COURSE ASSERTIONS
// ═══════════════════════════════════════════════════════════

export async function assertCourseExists(
  title: string,
  expected?: { status?: string; price?: number }
) {
  const { data: course } = await supabaseAdmin
    .schema("school_desk")
    .from("courses")
    .select("*")
    .eq("title", title)
    .single();

  expect(course, `Course '${title}' not found`).toBeTruthy();

  if (expected?.status) {
    expect(course!.status).toBe(expected.status);
  }
  if (expected?.price !== undefined) {
    expect(course!.price).toBe(expected.price);
  }

  return course!;
}
