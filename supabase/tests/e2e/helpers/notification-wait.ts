// helpers/notification-wait.ts
// Polling helper to wait for office_desk.notifications row after registration insert

import { SupabaseClient } from "@supabase/supabase-js";

export interface NotificationWaitOptions {
  /** Maximum time to wait in milliseconds (default: 5000) */
  timeout?: number;
  /** Polling interval in milliseconds (default: 500) */
  interval?: number;
  /** Expected notification type (default: 'new_registration') */
  notificationType?: string;
}

export interface NotificationResult {
  found: boolean;
  notification?: {
    id: string;
    registration_id: string;
    notification_type: string;
    email_to: string;
    status: string;
    sent_at: string;
    created_at: string;
    error_message: string | null;
  };
  elapsedMs: number;
  attempts: number;
}

/**
 * Wait for a notification to appear in office_desk.notifications after a registration is created.
 * Polls the table until found or timeout.
 *
 * @param adminClient - Supabase client with service_role key
 * @param registrationId - The registration ID to watch for
 * @param options - Polling options
 * @returns NotificationResult with found notification or timeout info
 */
export async function waitForNotification(
  adminClient: SupabaseClient,
  registrationId: string,
  options: NotificationWaitOptions = {}
): Promise<NotificationResult> {
  const { timeout = 5000, interval = 500, notificationType = "new_registration" } = options;
  const startTime = Date.now();
  let attempts = 0;

  while (Date.now() - startTime < timeout) {
    attempts++;
    try {
      const { data, error } = await adminClient
        .schema("office_desk")
        .from("notifications")
        .select("*")
        .eq("registration_id", registrationId)
        .eq("notification_type", notificationType)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const notification = data[0] as {
          id: string;
          registration_id: string;
          notification_type: string;
          email_to: string;
          status: string;
          sent_at: string;
          created_at: string;
          error_message: string | null;
        };
        return {
          found: true,
          notification,
          elapsedMs: Date.now() - startTime,
          attempts,
        };
      }
    } catch (err) {
      console.warn(`waitForNotification: attempt ${attempts} error:`, err);
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return {
    found: false,
    elapsedMs: Date.now() - startTime,
    attempts,
  };
}

/**
 * Wait for notification and assert it exists with expected properties.
 * Throws if not found or doesn't match expectations.
 */
export async function waitForNotificationOrThrow(
  adminClient: SupabaseClient,
  registrationId: string,
  expectedEmailTo: string = "office@redhouse.edu",
  options: NotificationWaitOptions = {}
): Promise<NotificationResult["notification"]> {
  const result = await waitForNotification(adminClient, registrationId, options);

  if (!result.found || !result.notification) {
    throw new Error(
      `Notification not found for registration ${registrationId} after ${result.elapsedMs}ms ` +
        `(${result.attempts} attempts). Check office-desk-notify function logs.`
    );
  }

  if (result.notification.email_to !== expectedEmailTo) {
    throw new Error(
      `Notification email_to mismatch: expected "${expectedEmailTo}", got "${result.notification.email_to}"`
    );
  }

  if (result.notification.status !== "sent") {
    throw new Error(
      `Notification status is "${result.notification.status}", expected "sent". ` +
        `Error: ${result.notification.error_message || "none"}`
    );
  }

  return result.notification;
}

/**
 * Poll for multiple notifications (useful for concurrent test cases).
 */
export async function waitForNotifications(
  adminClient: SupabaseClient,
  registrationIds: string[],
  options: NotificationWaitOptions = {}
): Promise<Map<string, NotificationResult["notification"]>> {
  const { timeout = 10000, interval = 500 } = options;
  const startTime = Date.now();
  const results = new Map<string, NotificationResult["notification"]>();
  const pending = new Set(registrationIds);

  while (Date.now() - startTime < timeout && pending.size > 0) {
    for (const regId of pending) {
      if (results.has(regId)) continue;
      try {
        const { data } = await adminClient
          .schema("office_desk")
          .from("notifications")
          .select("*")
          .eq("registration_id", regId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          results.set(regId, data[0] as NotificationResult["notification"]);
          pending.delete(regId);
        }
      } catch {
        // Ignore errors, will retry
      }
    }

    if (pending.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  return results;
}