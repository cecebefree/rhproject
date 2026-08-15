/**
 * WebhookNotificationService — Email notifications for webhook failures.
 * Sends alerts when webhook delivery fails after max retries.
 */

import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface WebhookFailureNotification {
  webhookId: string;
  webhookName: string;
  webhookUrl: string;
  eventType: string;
  errorMessage: string | null;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  emailRecipients: string[];
  notifyOnFailure: boolean;
  notifyOnSuccess: boolean;
}

// ═══════════════════════════════════════════════════════════
// NOTIFICATION QUERIES
// ═══════════════════════════════════════════════════════════

export async function getWebhookFailureNotifications(tenantId: string) {
  // First get failed events
  const { data: events, error } = await supabase
    .from('office_desk.webhook_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !events) {
    return { data: null, error };
  }

  // Then get webhook details for each event
  const notifications: WebhookFailureNotification[] = [];
  
  for (const event of events) {
    const { data: webhook } = await supabase
      .from('office_desk.webhooks')
      .select('name, url')
      .eq('id', event.webhook_id)
      .single();

    notifications.push({
      webhookId: event.webhook_id,
      webhookName: webhook?.name || 'Unknown',
      webhookUrl: webhook?.url || 'Unknown',
      eventType: event.event_type,
      errorMessage: event.error_message,
      attempts: event.attempts,
      maxAttempts: event.max_attempts,
      lastAttemptAt: event.created_at,
    });
  }

  return { data: notifications, error: null };
}

export async function sendWebhookFailureEmail(
  tenantId: string,
  notifications: WebhookFailureNotification[]
) {
  if (notifications.length === 0) return { success: true };

  // Group notifications by webhook
  const grouped = notifications.reduce(
    (acc, notification) => {
      const key = notification.webhookId;
      if (!acc[key]) {
        acc[key] = {
          webhookName: notification.webhookName,
          webhookUrl: notification.webhookUrl,
          failures: [],
        };
      }
      acc[key].failures.push(notification);
      return acc;
    },
    {} as Record<string, { webhookName: string; webhookUrl: string; failures: WebhookFailureNotification[] }>
  );

  // Build email content
  const subject = `Webhook Failure Alert - ${notifications.length} failed delivery(ies)`;
  const body = buildFailureEmailBody(grouped);

  // Get admin emails for this tenant
  const { data: admins, error: adminError } = await supabase
    .from('profiles')
    .select('email')
    .eq('tenant_id', tenantId)
    .eq('role', 'admin')
    .is('deleted_at', null);

  if (adminError || !admins || admins.length === 0) {
    console.error('Failed to fetch admin emails:', adminError);
    return { success: false, error: 'No admin emails found' };
  }

  const recipients = admins.map((admin: { email: string }) => admin.email);

  // Send email via edge function
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      to: recipients,
      subject,
      body,
    },
  });

  if (error) {
    console.error('Failed to send webhook failure email:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

function buildFailureEmailBody(
  grouped: Record<string, { webhookName: string; webhookUrl: string; failures: WebhookFailureNotification[] }>
): string {
  let html = `
    <h2>Webhook Failure Alert</h2>
    <p>The following webhook deliveries have failed after maximum retry attempts:</p>
  `;

  for (const [, data] of Object.entries(grouped)) {
    html += `
      <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
        <h3 style="margin: 0 0 10px 0;">${data.webhookName}</h3>
        <p style="margin: 0 0 5px 0; color: #666;">URL: ${data.webhookUrl}</p>
        <p style="margin: 0 0 10px 0;">Failed deliveries: ${data.failures.length}</p>
        <ul>
    `;

    for (const failure of data.failures.slice(0, 5)) {
      html += `
        <li>
          <strong>${failure.eventType}</strong> - 
          ${failure.errorMessage || 'No error message'} 
          (${failure.attempts}/${failure.maxAttempts} attempts)
        </li>
      `;
    }

    if (data.failures.length > 5) {
      html += `<li>... and ${data.failures.length - 5} more</li>`;
    }

    html += `
        </ul>
      </div>
    `;
  }

  html += `
    <p style="color: #666; font-size: 12px;">
      This is an automated notification from the Webhook system.
      Please check your webhook configuration and endpoints.
    </p>
  `;

  return html;
}

// ═══════════════════════════════════════════════════════════
// NOTIFICATION PREFERENCES
// ═══════════════════════════════════════════════════════════

export async function getNotificationPreferences(tenantId: string) {
  const { data, error } = await supabase
    .from('office_desk.webhook_notification_preferences')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return { data: null, error };
  }

  // Return default preferences if none exist
  if (!data) {
    return {
      data: {
        enabled: true,
        emailRecipients: [],
        notifyOnFailure: true,
        notifyOnSuccess: false,
      },
      error: null,
    };
  }

  return { data, error: null };
}

export async function updateNotificationPreferences(
  tenantId: string,
  preferences: Partial<NotificationPreferences>
) {
  const { data: existing } = await getNotificationPreferences(tenantId);

  if (existing) {
    return supabase
      .from('office_desk.webhook_notification_preferences')
      .update({
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .select()
      .single();
  }

  return supabase
    .from('office_desk.webhook_notification_preferences')
    .insert({
      tenant_id: tenantId,
      ...preferences,
    })
    .select()
    .single();
}

// ═══════════════════════════════════════════════════════════
// CHECK AND SEND NOTIFICATIONS
// ═══════════════════════════════════════════════════════════

export async function checkAndSendFailureNotifications(tenantId: string) {
  // Check notification preferences
  const { data: preferences } = await getNotificationPreferences(tenantId);
  
  if (!preferences?.enabled || !preferences?.notifyOnFailure) {
    return { success: true, skipped: true };
  }

  // Get recent failures (last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data: failures, error } = await supabase
    .from('office_desk.webhook_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'failed')
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false });

  if (error || !failures || failures.length === 0) {
    return { success: true, failures: 0 };
  }

  // Get webhook details for each failure
  const notifications: WebhookFailureNotification[] = [];
  
  for (const event of failures) {
    const { data: webhook } = await supabase
      .from('office_desk.webhooks')
      .select('name, url')
      .eq('id', event.webhook_id)
      .single();

    notifications.push({
      webhookId: event.webhook_id,
      webhookName: webhook?.name || 'Unknown',
      webhookUrl: webhook?.url || 'Unknown',
      eventType: event.event_type,
      errorMessage: event.error_message,
      attempts: event.attempts,
      maxAttempts: event.max_attempts,
      lastAttemptAt: event.created_at,
    });
  }

  const result = await sendWebhookFailureEmail(tenantId, notifications);
  
  return {
    success: result.success,
    failures: notifications.length,
    error: result.error,
  };
}
