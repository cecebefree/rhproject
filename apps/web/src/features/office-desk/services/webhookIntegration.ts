/**
 * WebhookIntegration — Helper to fire webhook events from existing services.
 * Import and call these functions after successful CRUD operations.
 */

import { type WebhookEvent, emitWebhookEvent } from './webhookService';

// ═══════════════════════════════════════════════════════════
// CONTACT WEBHOOK EVENTS
// ═══════════════════════════════════════════════════════════

export async function fireContactCreated(tenantId: string, contact: Record<string, unknown>) {
  return emitWebhookEvent(tenantId, 'CONTACT_CREATED', {
    contact_id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    created_at: contact.created_at,
  });
}

export async function fireContactUpdated(
  tenantId: string,
  contact: Record<string, unknown>,
  changes: Partial<Record<string, unknown>>
) {
  return emitWebhookEvent(tenantId, 'CONTACT_UPDATED', {
    contact_id: contact.id,
    name: contact.name,
    email: contact.email,
    changes,
    updated_at: new Date().toISOString(),
  });
}

export async function fireContactDeleted(tenantId: string, contactId: string) {
  return emitWebhookEvent(tenantId, 'CONTACT_DELETED', {
    contact_id: contactId,
    deleted_at: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════
// LEAD WEBHOOK EVENTS
// ═══════════════════════════════════════════════════════════

export async function fireLeadCreated(tenantId: string, lead: Record<string, unknown>) {
  return emitWebhookEvent(tenantId, 'LEAD_CREATED', {
    lead_id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    source: lead.source,
    status: lead.status,
    created_at: lead.created_at,
  });
}

export async function fireLeadUpdated(
  tenantId: string,
  lead: Record<string, unknown>,
  changes: Partial<Record<string, unknown>>
) {
  return emitWebhookEvent(tenantId, 'LEAD_UPDATED', {
    lead_id: lead.id,
    name: lead.name,
    email: lead.email,
    changes,
    updated_at: new Date().toISOString(),
  });
}

export async function fireLeadConverted(tenantId: string, lead: Record<string, unknown>, registrationId: string) {
  return emitWebhookEvent(tenantId, 'LEAD_CONVERTED', {
    lead_id: lead.id,
    name: lead.name,
    email: lead.email,
    registration_id: registrationId,
    converted_at: new Date().toISOString(),
  });
}

export async function fireLeadDeleted(tenantId: string, leadId: string) {
  return emitWebhookEvent(tenantId, 'LEAD_DELETED', {
    lead_id: leadId,
    deleted_at: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════
// INVOICE WEBHOOK EVENTS
// ═══════════════════════════════════════════════════════════

export async function fireInvoiceCreated(tenantId: string, invoice: Record<string, unknown>) {
  return emitWebhookEvent(tenantId, 'INVOICE_CREATED', {
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    amount: invoice.amount,
    currency: invoice.currency,
    status: invoice.status,
    lead_id: invoice.lead_id,
    created_at: invoice.created_at,
  });
}

export async function fireInvoiceUpdated(
  tenantId: string,
  invoice: Record<string, unknown>,
  changes: Partial<Record<string, unknown>>
) {
  return emitWebhookEvent(tenantId, 'INVOICE_UPDATED', {
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    changes,
    updated_at: new Date().toISOString(),
  });
}

export async function fireInvoicePaid(tenantId: string, invoice: Record<string, unknown>) {
  return emitWebhookEvent(tenantId, 'INVOICE_PAID', {
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    amount: invoice.amount,
    amount_paid: invoice.amount_paid,
    currency: invoice.currency,
    paid_at: invoice.paid_at,
    payment_processor: invoice.payment_processor,
  });
}

export async function fireInvoiceDeleted(tenantId: string, invoiceId: string) {
  return emitWebhookEvent(tenantId, 'INVOICE_DELETED', {
    invoice_id: invoiceId,
    deleted_at: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════
// BATCH EVENT EMISSION
// ═══════════════════════════════════════════════════════════

export async function fireMultipleWebhookEvents(
  tenantId: string,
  events: Array<{ eventType: WebhookEvent; payload: Record<string, unknown> }>
) {
  const results = await Promise.allSettled(
    events.map(({ eventType, payload }) => emitWebhookEvent(tenantId, eventType, payload))
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - succeeded;

  return { succeeded, failed, total: results.length };
}
