/**
 * BroadcastChannelManager — Handles cross-tab sync using BroadcastChannel API.
 * Falls back gracefully when BroadcastChannel is not available.
 */

export type BroadcastMessage =
  | { type: 'LEAD_UPDATED'; leadId: string; tenantId: string; updatedBy: string; timestamp: string }
  | { type: 'LEAD_CREATED'; leadId: string; tenantId: string; createdBy: string; timestamp: string }
  | { type: 'LEAD_DELETED'; leadId: string; tenantId: string; deletedBy: string; timestamp: string }
  | { type: 'INVOICE_UPDATED'; invoiceId: string; tenantId: string; updatedBy: string; timestamp: string }
  | { type: 'INVOICE_CREATED'; invoiceId: string; tenantId: string; createdBy: string; timestamp: string }
  | { type: 'INVOICE_DELETED'; invoiceId: string; tenantId: string; deletedBy: string; timestamp: string }
  | { type: 'SYNC_REQUEST'; table: string; tenantId: string; timestamp: string }
  | { type: 'SYNC_RESPONSE'; table: string; tenantId: string; timestamp: string }
  | { type: 'USER_STATUS'; userId: string; status: 'online' | 'offline'; timestamp: string };

type BroadcastCallback = (message: BroadcastMessage) => void;

const CHANNEL_NAME = 'redhouse-sync';
const BROADCAST_SUPPORTED = typeof BroadcastChannel !== 'undefined';

export class BroadcastChannelManager {
  private channel: BroadcastChannel | null = null;
  private callbacks = new Set<BroadcastCallback>();
  private userId: string;
  private tabId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.tabId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    if (BROADCAST_SUPPORTED) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        const message = event.data as BroadcastMessage;
        // Ignore messages from self
        if (message.type === 'USER_STATUS' && (message as { userId: string }).userId === this.userId) {
          return;
        }
        this.callbacks.forEach(cb => cb(message));
      };

      // Announce presence
      this.broadcast({
        type: 'USER_STATUS',
        userId: this.userId,
        status: 'online',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Broadcast a message to other tabs.
   */
  broadcast(message: BroadcastMessage): void {
    if (this.channel) {
      this.channel.postMessage(message);
    }
  }

  /**
   * Subscribe to broadcast messages.
   */
  onMessage(callback: BroadcastCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Request sync from other tabs.
   */
  requestSync(table: string, tenantId: string): void {
    this.broadcast({
      type: 'SYNC_REQUEST',
      table,
      tenantId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Respond to a sync request.
   */
  respondSync(table: string, tenantId: string): void {
    this.broadcast({
      type: 'SYNC_RESPONSE',
      table,
      tenantId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify other tabs of a lead update.
   */
  notifyLeadUpdated(leadId: string, tenantId: string): void {
    this.broadcast({
      type: 'LEAD_UPDATED',
      leadId,
      tenantId,
      updatedBy: this.userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify other tabs of a lead creation.
   */
  notifyLeadCreated(leadId: string, tenantId: string): void {
    this.broadcast({
      type: 'LEAD_CREATED',
      leadId,
      tenantId,
      createdBy: this.userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify other tabs of a lead deletion.
   */
  notifyLeadDeleted(leadId: string, tenantId: string): void {
    this.broadcast({
      type: 'LEAD_DELETED',
      leadId,
      tenantId,
      deletedBy: this.userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify other tabs of an invoice update.
   */
  notifyInvoiceUpdated(invoiceId: string, tenantId: string): void {
    this.broadcast({
      type: 'INVOICE_UPDATED',
      invoiceId,
      tenantId,
      updatedBy: this.userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify other tabs of an invoice creation.
   */
  notifyInvoiceCreated(invoiceId: string, tenantId: string): void {
    this.broadcast({
      type: 'INVOICE_CREATED',
      invoiceId,
      tenantId,
      createdBy: this.userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify other tabs of an invoice deletion.
   */
  notifyInvoiceDeleted(invoiceId: string, tenantId: string): void {
    this.broadcast({
      type: 'INVOICE_DELETED',
      invoiceId,
      tenantId,
      deletedBy: this.userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Announce tab closing and cleanup.
   */
  destroy(): void {
    if (this.channel) {
      this.broadcast({
        type: 'USER_STATUS',
        userId: this.userId,
        status: 'offline',
        timestamp: new Date().toISOString(),
      });
      this.channel.close();
      this.channel = null;
    }
    this.callbacks.clear();
  }

  /**
   * Get tab ID.
   */
  getTabId(): string {
    return this.tabId;
  }
}
