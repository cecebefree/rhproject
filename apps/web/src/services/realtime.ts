/**
 * RealtimeClient — Centralized Supabase Realtime subscription manager
 * Handles subscription lifecycle, error recovery, and cleanup.
 */

import type { SupabaseClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface SubscriptionOptions {
  event?: RealtimeEvent;
  schema: string;
  table: string;
  filter?: string;
}

export interface SubscriptionInfo {
  id: string;
  schema: string;
  table: string;
  filter: string | undefined;
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  channel: RealtimeChannel;
  createdAt: number;
}

export type PayloadCallback<T = Record<string, unknown>> = (
  payload: RealtimePostgresChangesPayload<T & Record<string, unknown>>
) => void;

let subscriptionCounter = 0;

function generateSubscriptionId(schema: string, table: string): string {
  subscriptionCounter++;
  return `${schema}.${table}-${subscriptionCounter}-${Date.now()}`;
}

/**
 * RealtimeClient manages Supabase Realtime subscriptions with
 * automatic cleanup, error handling, and subscription tracking.
 */
export class RealtimeClient {
  private subscriptions = new Map<string, SubscriptionInfo>();
  private supabase: SupabaseClient;
  private userId: string | null;

  constructor(supabase: SupabaseClient, userId: string | null = null) {
    this.supabase = supabase;
    this.userId = userId;
  }

  /**
   * Subscribe to Postgres changes on a table.
   * Returns a subscription ID for later unsubscription.
   */
  subscribe<T = Record<string, unknown>>(
    options: SubscriptionOptions,
    callback: PayloadCallback<T>
  ): string {
    const { event = '*', schema, table, filter } = options;
    const id = generateSubscriptionId(schema, table);

    const channelName = filter
      ? `${schema}.${table}-${filter}`
      : `${schema}.${table}-${id}`;

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event, schema, table, filter },
        callback as PayloadCallback
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error(`[RealtimeClient] Subscription ${id} error on ${schema}.${table}`);
          this.retrySubscription(id);
        }
      });

    this.subscriptions.set(id, {
      id,
      schema,
      table,
      filter,
      callback: callback as PayloadCallback,
      channel,
      createdAt: Date.now(),
    });

    return id;
  }

  /**
   * Subscribe to all changes on the leads table for a specific desk (tenant).
   */
  subscribeToLeads(
    tenantId: string,
    callback: PayloadCallback
  ): string {
    return this.subscribe(
      { schema: 'front_desk', table: 'leads', filter: `tenant_id=eq.${tenantId}` },
      callback
    );
  }

  /**
   * Subscribe to all changes on the invoices table for a specific tenant.
   */
  subscribeToInvoices(
    tenantId: string,
    callback: PayloadCallback
  ): string {
    return this.subscribe(
      { schema: 'office_desk', table: 'invoices', filter: `tenant_id=eq.${tenantId}` },
      callback
    );
  }

  /**
   * Subscribe to changes on a single lead record.
   */
  subscribeToLead(
    leadId: string,
    callback: PayloadCallback
  ): string {
    return this.subscribe(
      { schema: 'front_desk', table: 'leads', filter: `id=eq.${leadId}` },
      callback
    );
  }

  /**
   * Subscribe to changes on a single invoice record.
   */
  subscribeToInvoice(
    invoiceId: string,
    callback: PayloadCallback
  ): string {
    return this.subscribe(
      { schema: 'office_desk', table: 'invoices', filter: `id=eq.${invoiceId}` },
      callback
    );
  }

  /**
   * Unsubscribe from a specific subscription.
   */
  unsubscribe(subscriptionId: string): void {
    const info = this.subscriptions.get(subscriptionId);
    if (info) {
      this.supabase.removeChannel(info.channel);
      this.subscriptions.delete(subscriptionId);
    }
  }

  /**
   * Unsubscribe from all active subscriptions.
   */
  unsubscribeAll(): void {
    for (const [id] of this.subscriptions) {
      this.unsubscribe(id);
    }
  }

  /**
   * Get count of active subscriptions.
   */
  get activeCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get all active subscription info.
   */
  getActiveSubscriptions(): SubscriptionInfo[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Retry a failed subscription with exponential backoff.
   */
  private retrySubscription(subscriptionId: string, attempt = 1): void {
    const maxAttempts = 3;
    const baseDelay = 1000;

    if (attempt > maxAttempts) {
      console.error(`[RealtimeClient] Subscription ${subscriptionId} failed after ${maxAttempts} attempts`);
      this.subscriptions.delete(subscriptionId);
      return;
    }

    const delay = baseDelay * Math.pow(2, attempt - 1);

    setTimeout(() => {
      const info = this.subscriptions.get(subscriptionId);
      if (!info) return;

      // Remove old channel
      this.supabase.removeChannel(info.channel);

      // Re-subscribe
      const channel = this.supabase
        .channel(`${info.schema}.${info.table}-retry-${attempt}`)
        .on(
          'postgres_changes',
          { event: '*', schema: info.schema, table: info.table, filter: info.filter },
          info.callback
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.error(`[RealtimeClient] Retry ${attempt} failed for ${subscriptionId}`);
            this.retrySubscription(subscriptionId, attempt + 1);
          }
        });

      // Update stored info
      this.subscriptions.set(subscriptionId, { ...info, channel });
    }, delay);
  }
}
