/**
 * WebhookService — CRUD operations, event emission, signature verification.
 * Handles webhook management and event delivery.
 */

import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type WebhookEvent =
  | 'CONTACT_CREATED'
  | 'CONTACT_UPDATED'
  | 'CONTACT_DELETED'
  | 'LEAD_CREATED'
  | 'LEAD_UPDATED'
  | 'LEAD_CONVERTED'
  | 'LEAD_DELETED'
  | 'INVOICE_CREATED'
  | 'INVOICE_UPDATED'
  | 'INVOICE_PAID'
  | 'INVOICE_DELETED';

export type WebhookEventStatus = 'pending' | 'success' | 'failed' | 'retrying';

export interface Webhook {
  id: string;
  tenant_id: string;
  name: string;
  url: string;
  secret_key: string;
  events: WebhookEvent[];
  active: boolean;
  description: string | null;
  headers: Record<string, string>;
  retry_count: number;
  timeout_ms: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WebhookEventLog {
  id: string;
  webhook_id: string;
  tenant_id: string;
  event_type: WebhookEvent;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  attempts: number;
  max_attempts: number;
  status: WebhookEventStatus;
  error_message: string | null;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
  webhook?: Webhook;
}

export interface WebhookCreateInput {
  name: string;
  url: string;
  events: WebhookEvent[];
  active?: boolean;
  description?: string;
  headers?: Record<string, string>;
  retry_count?: number;
  timeout_ms?: number;
}

export interface WebhookUpdateInput {
  name?: string;
  url?: string;
  events?: WebhookEvent[];
  active?: boolean;
  description?: string;
  headers?: Record<string, string>;
  retry_count?: number;
  timeout_ms?: number;
}

export const WEBHOOK_EVENTS: WebhookEvent[] = [
  'CONTACT_CREATED',
  'CONTACT_UPDATED',
  'CONTACT_DELETED',
  'LEAD_CREATED',
  'LEAD_UPDATED',
  'LEAD_CONVERTED',
  'LEAD_DELETED',
  'INVOICE_CREATED',
  'INVOICE_UPDATED',
  'INVOICE_PAID',
  'INVOICE_DELETED',
];

export const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, string> = {
  CONTACT_CREATED: 'Contact Created',
  CONTACT_UPDATED: 'Contact Updated',
  CONTACT_DELETED: 'Contact Deleted',
  LEAD_CREATED: 'Lead Created',
  LEAD_UPDATED: 'Lead Updated',
  LEAD_CONVERTED: 'Lead Converted',
  LEAD_DELETED: 'Lead Deleted',
  INVOICE_CREATED: 'Invoice Created',
  INVOICE_UPDATED: 'Invoice Updated',
  INVOICE_PAID: 'Invoice Paid',
  INVOICE_DELETED: 'Invoice Deleted',
};

export const WEBHOOK_EVENT_STATUS_LABELS: Record<WebhookEventStatus, string> = {
  pending: 'Pending',
  success: 'Success',
  failed: 'Failed',
  retrying: 'Retrying',
};

// ═══════════════════════════════════════════════════════════
// SIGNATURE UTILITIES
// ═══════════════════════════════════════════════════════════

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export async function generateSignature(
  secret: string,
  payload: string
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify HMAC-SHA256 signature
 */
export async function verifySignature(
  secret: string,
  payload: string,
  signature: string
): Promise<boolean> {
  const expected = await generateSignature(secret, payload);
  return expected === signature;
}

// ═══════════════════════════════════════════════════════════
// WEBHOOK CRUD QUERIES
// ═══════════════════════════════════════════════════════════

export async function selectWebhooks(tenantId: string, includeInactive = false) {
  let query = supabase
    .from('office_desk.webhooks')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (!includeInactive) {
    query = query.eq('active', true);
  }

  return query;
}

export async function getWebhookById(webhookId: string) {
  return supabase
    .from('office_desk.webhooks')
    .select('*')
    .eq('id', webhookId)
    .is('deleted_at', null)
    .single();
}

export async function insertWebhook(webhook: WebhookCreateInput, tenantId: string, userId?: string) {
  return supabase
    .from('office_desk.webhooks')
    .insert({
      tenant_id: tenantId,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      active: webhook.active ?? true,
      description: webhook.description || null,
      headers: webhook.headers || {},
      retry_count: webhook.retry_count ?? 3,
      timeout_ms: webhook.timeout_ms ?? 5000,
      created_by: userId || null,
    })
    .select()
    .single();
}

export async function updateWebhook(webhookId: string, updates: WebhookUpdateInput) {
  return supabase
    .from('office_desk.webhooks')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', webhookId)
    .select()
    .single();
}

export async function deleteWebhook(webhookId: string) {
  return supabase
    .from('office_desk.webhooks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', webhookId);
}

export async function hardDeleteWebhook(webhookId: string) {
  return supabase
    .from('office_desk.webhooks')
    .delete()
    .eq('id', webhookId);
}

// ═══════════════════════════════════════════════════════════
// WEBHOOK EVENT QUERIES
// ═══════════════════════════════════════════════════════════

export async function selectWebhookEvents(
  webhookId: string,
  limit = 50,
  offset = 0
) {
  return supabase
    .from('office_desk.webhook_events')
    .select('*')
    .eq('webhook_id', webhookId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
}

export async function selectAllWebhookEvents(
  tenantId: string,
  limit = 50,
  offset = 0,
  statusFilter?: WebhookEventStatus
) {
  let query = supabase
    .from('office_desk.webhook_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  return query;
}

export async function getWebhookEventById(eventId: string) {
  return supabase
    .from('office_desk.webhook_events')
    .select('*')
    .eq('id', eventId)
    .single();
}

export async function updateWebhookEventStatus(
  eventId: string,
  status: WebhookEventStatus,
  responseStatus?: number,
  responseBody?: string,
  errorMessage?: string
) {
  return supabase
    .from('office_desk.webhook_events')
    .update({
      status,
      response_status: responseStatus || null,
      response_body: responseBody || null,
      error_message: errorMessage || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .select()
    .single();
}

// ═══════════════════════════════════════════════════════════
// EVENT EMISSION
// ═══════════════════════════════════════════════════════════

/**
 * Emit a webhook event - creates event records for all matching webhooks
 */
export async function emitWebhookEvent(
  tenantId: string,
  eventType: WebhookEvent,
  payload: Record<string, unknown>
): Promise<{ success: boolean; eventIds: string[]; error?: string }> {
  try {
    // Find all active webhooks subscribed to this event
    const { data: webhooks, error: fetchError } = await supabase
      .from('office_desk.webhooks')
      .select('id, url, secret_key, retry_count')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .is('deleted_at', null)
      .contains('events', [eventType]);

    if (fetchError) {
      console.error('Failed to fetch webhooks:', fetchError);
      return { success: false, eventIds: [], error: fetchError.message };
    }

    if (!webhooks || webhooks.length === 0) {
      return { success: true, eventIds: [] };
    }

    const eventIds: string[] = [];

    // Create event records for each matching webhook
    for (const webhook of webhooks) {
      const { data: event, error: insertError } = await supabase
        .from('office_desk.webhook_events')
        .insert({
          webhook_id: webhook.id,
          tenant_id: tenantId,
          event_type: eventType,
          payload: {
            event: eventType,
            timestamp: new Date().toISOString(),
            data: payload,
          },
          max_attempts: webhook.retry_count || 3,
          status: 'pending',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error(`Failed to create webhook event for ${webhook.id}:`, insertError);
        continue;
      }

      if (event) {
        eventIds.push(event.id);
      }
    }

    return { success: true, eventIds };
  } catch (error) {
    console.error('Webhook event emission failed:', error);
    return {
      success: false,
      eventIds: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ═══════════════════════════════════════════════════════════
// WEBHOOK TESTING
// ═══════════════════════════════════════════════════════════

/**
 * Test a webhook by sending a test event
 */
export async function testWebhook(
  webhookId: string,
  testPayload?: Record<string, unknown>
): Promise<{ success: boolean; statusCode?: number; error?: string; duration?: number }> {
  const startTime = Date.now();

  try {
    // Get webhook details
    const { data: webhook, error: fetchError } = await getWebhookById(webhookId);
    if (fetchError || !webhook) {
      return { success: false, error: 'Webhook not found' };
    }

    // Prepare test payload
    const payload = testPayload || {
      event: 'TEST',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery',
        webhook_id: webhook.id,
      },
    };

    const payloadString = JSON.stringify(payload);
    const signature = await generateSignature(webhook.secret_key, payloadString);

    // Send test request
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': 'TEST',
        ...webhook.headers,
      },
      body: payloadString,
      signal: AbortSignal.timeout(webhook.timeout_ms || 5000),
    });

    const duration = Date.now() - startTime;
    const responseBody = await response.text();

    // Log the test event
    await supabase.from('office_desk.webhook_events').insert({
      webhook_id: webhook.id,
      tenant_id: webhook.tenant_id,
      event_type: 'TEST',
      payload,
      response_status: response.status,
      response_body: responseBody.substring(0, 1000),
      attempts: 1,
      max_attempts: 1,
      status: response.ok ? 'success' : 'failed',
    });

    return {
      success: response.ok,
      statusCode: response.status,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      error: errorMessage,
      duration,
    };
  }
}

// ═══════════════════════════════════════════════════════════
// RETRY LOGIC
// ═══════════════════════════════════════════════════════════

/**
 * Process pending/retrying webhook events
 */
export async function processPendingEvents(maxEvents = 10): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  // Get pending events
  const { data: events, error: fetchError } = await supabase
    .from('office_desk.webhook_events')
    .select('*')
    .in('status', ['pending', 'retrying'])
    .order('created_at', { ascending: true })
    .limit(maxEvents);

  if (fetchError || !events) {
    console.error('Failed to fetch pending events:', fetchError);
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const event of events) {
    if (event.attempts >= event.max_attempts) continue;

    processed++;

    // Get webhook details
    const { data: webhook } = await supabase
      .from('office_desk.webhooks')
      .select('url, secret_key, timeout_ms, headers')
      .eq('id', event.webhook_id)
      .single();

    if (!webhook) {
      // Mark as failed if webhook no longer exists
      await updateWebhookEventStatus(event.id, 'failed', undefined, undefined, 'Webhook not found');
      failed++;
      continue;
    }

    try {
      const payloadString = JSON.stringify(event.payload);
      const signature = await generateSignature(webhook.secret_key, payloadString);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event.event_type,
          ...(webhook.headers || {}),
        },
        body: payloadString,
        signal: AbortSignal.timeout(webhook.timeout_ms || 5000),
      });

      const responseBody = await response.text();

      if (response.ok) {
        await updateWebhookEventStatus(
          event.id,
          'success',
          response.status,
          responseBody.substring(0, 1000)
        );
        succeeded++;
      } else {
        // Calculate next retry time with exponential backoff
        const nextRetryAt = new Date(
          Date.now() + Math.pow(2, event.attempts) * 60000 // Exponential backoff: 1min, 2min, 4min...
        );

        await supabase
          .from('office_desk.webhook_events')
          .update({
            status: event.attempts + 1 >= event.max_attempts ? 'failed' : 'retrying',
            attempts: event.attempts + 1,
            response_status: response.status,
            response_body: responseBody.substring(0, 1000),
            next_retry_at: event.attempts + 1 >= event.max_attempts ? null : nextRetryAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', event.id);

        if (event.attempts + 1 >= event.max_attempts) {
          failed++;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const nextRetryAt = new Date(
        Date.now() + Math.pow(2, event.attempts) * 60000
      );

      await supabase
        .from('office_desk.webhook_events')
        .update({
          status: event.attempts + 1 >= event.max_attempts ? 'failed' : 'retrying',
          attempts: event.attempts + 1,
          error_message: errorMessage,
          next_retry_at: event.attempts + 1 >= event.max_attempts ? null : nextRetryAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.id);

      if (event.attempts + 1 >= event.max_attempts) {
        failed++;
      }
    }
  }

  return { processed, succeeded, failed };
}

// ═══════════════════════════════════════════════════════════
// WEBHOOK STATISTICS
// ═══════════════════════════════════════════════════════════

export async function getWebhookStats(tenantId: string) {
  const { data, error } = await supabase
    .from('office_desk.webhook_events')
    .select('status')
    .eq('tenant_id', tenantId);

  if (error || !data) {
    return { total: 0, success: 0, failed: 0, pending: 0, retrying: 0 };
  }

  const stats = {
    total: data.length,
    success: data.filter((e: { status: string }) => e.status === 'success').length,
    failed: data.filter((e: { status: string }) => e.status === 'failed').length,
    pending: data.filter((e: { status: string }) => e.status === 'pending').length,
    retrying: data.filter((e: { status: string }) => e.status === 'retrying').length,
  };

  return stats;
}

export async function getWebhookEventStats(webhookId: string) {
  const { data, error } = await supabase
    .from('office_desk.webhook_events')
    .select('status')
    .eq('webhook_id', webhookId);

  if (error || !data) {
    return { total: 0, success: 0, failed: 0, pending: 0, retrying: 0 };
  }

  const stats = {
    total: data.length,
    success: data.filter((e: { status: string }) => e.status === 'success').length,
    failed: data.filter((e: { status: string }) => e.status === 'failed').length,
    pending: data.filter((e: { status: string }) => e.status === 'pending').length,
    retrying: data.filter((e: { status: string }) => e.status === 'retrying').length,
  };

  return stats;
}

// ═══════════════════════════════════════════════════════════
// REALTIME SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════════

export function subscribeToWebhooks(
  tenantId: string,
  callback: (payload: { eventType: string; new: Webhook; old: Webhook | null }) => void
) {
  return supabase
    .channel(`webhooks-${tenantId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'office_desk', table: 'webhooks', filter: `tenant_id=eq.${tenantId}` },
      callback as (payload: Record<string, unknown>) => void
    )
    .subscribe();
}

export function subscribeToWebhookEvents(
  tenantId: string,
  callback: (payload: { eventType: string; new: WebhookEventLog; old: WebhookEventLog | null }) => void
) {
  return supabase
    .channel(`webhook_events-${tenantId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'office_desk', table: 'webhook_events', filter: `tenant_id=eq.${tenantId}` },
      callback as (payload: Record<string, unknown>) => void
    )
    .subscribe();
}
