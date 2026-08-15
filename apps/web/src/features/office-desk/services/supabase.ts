import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Office Desk Supabase client init failed: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must both be set'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ═══════════════════════════════════════════════════════════
// INVOICE TYPES
// ═══════════════════════════════════════════════════════════

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'void';

export interface Invoice {
  id: string;
  tenant_id: string;
  registration_id: string | null;
  lead_id: string | null;
  invoice_number: string | null;
  amount: number;
  amount_paid: number;
  currency: string;
  description: string | null;
  status: InvoiceStatus;
  issued_at: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface InvoiceItem {
  id: string;
  tenant_id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface InvoiceWithItems extends Invoice {
  items?: InvoiceItem[];
  lead?: { id: string; name: string | null; email: string | null } | null;
}

export const INVOICE_STATUSES: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'void'];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  void: 'Void',
};

// ═══════════════════════════════════════════════════════════
// INVOICE QUERIES
// ═══════════════════════════════════════════════════════════

export async function selectInvoices(tenantId: string, search?: string, statusFilter?: InvoiceStatus) {
  let query = supabase
    .from('office_desk.invoices')
    .select('*, lead:front_desk.leads(id, name, email)')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`invoice_number.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  return query;
}

export async function getInvoiceById(invoiceId: string) {
  return supabase
    .from('office_desk.invoices')
    .select('*, lead:front_desk.leads(id, name, email), items:office_desk.invoice_items(*)')
    .eq('id', invoiceId)
    .is('deleted_at', null)
    .single();
}

export async function insertInvoice(invoice: {
  tenant_id: string;
  lead_id?: string;
  registration_id?: string;
  invoice_number?: string;
  amount: number;
  amount_paid?: number;
  currency?: string;
  description?: string;
  status?: InvoiceStatus;
  due_date?: string;
  issued_at?: string;
}) {
  return supabase
    .from('office_desk.invoices')
    .insert({
      tenant_id: invoice.tenant_id,
      lead_id: invoice.lead_id || null,
      registration_id: invoice.registration_id || null,
      invoice_number: invoice.invoice_number || null,
      amount: invoice.amount,
      amount_paid: invoice.amount_paid || 0,
      currency: invoice.currency || 'ZAR',
      description: invoice.description || null,
      status: invoice.status || 'draft',
      due_date: invoice.due_date || null,
      issued_at: invoice.issued_at || new Date().toISOString(),
    })
    .select()
    .single();
}

export async function updateInvoice(
  invoiceId: string,
  updates: Partial<Pick<Invoice, 'lead_id' | 'invoice_number' | 'amount' | 'amount_paid' | 'currency' | 'description' | 'status' | 'due_date' | 'issued_at'>>
) {
  return supabase
    .from('office_desk.invoices')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .select()
    .single();
}

export async function deleteInvoice(invoiceId: string) {
  return supabase
    .from('office_desk.invoices')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', invoiceId);
}

// ═══════════════════════════════════════════════════════════
// INVOICE ITEM QUERIES
// ═══════════════════════════════════════════════════════════

export async function selectInvoiceItems(invoiceId: string) {
  return supabase
    .from('office_desk.invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
}

export async function insertInvoiceItem(item: {
  tenant_id: string;
  invoice_id: string;
  description: string;
  quantity?: number;
  unit_price?: number;
}) {
  return supabase
    .from('office_desk.invoice_items')
    .insert({
      tenant_id: item.tenant_id,
      invoice_id: item.invoice_id,
      description: item.description,
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
    })
    .select()
    .single();
}

export async function updateInvoiceItem(
  itemId: string,
  updates: Partial<Pick<InvoiceItem, 'description' | 'quantity' | 'unit_price'>>
) {
  return supabase
    .from('office_desk.invoice_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .select()
    .single();
}

export async function deleteInvoiceItem(itemId: string) {
  return supabase
    .from('office_desk.invoice_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', itemId);
}

// ═══════════════════════════════════════════════════════════
// SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════════

export function subscribeToInvoices(
  callback: (payload: { eventType: string; new: Invoice; old: Invoice | null }) => void
) {
  return supabase
    .channel('office_desk.invoices-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'office_desk', table: 'invoices' },
      callback as (payload: Record<string, unknown>) => void
    )
    .subscribe();
}

export function subscribeToInvoiceItems(
  invoiceId: string,
  callback: (payload: { eventType: string; new: InvoiceItem; old: InvoiceItem | null }) => void
) {
  return supabase
    .channel(`office_desk.invoice_items-${invoiceId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'office_desk', table: 'invoice_items', filter: `invoice_id=eq.${invoiceId}` },
      callback as (payload: Record<string, unknown>) => void
    )
    .subscribe();
}

// ═══════════════════════════════════════════════════════════
// EDGE FUNCTION CALLS
// ═══════════════════════════════════════════════════════════

export async function sendInvoiceEmail(invoiceId: string, recipientEmail?: string, subject?: string, body?: string) {
  const { data, error } = await supabase.functions.invoke('send-invoice-email', {
    body: { invoice_id: invoiceId, recipient_email: recipientEmail, subject, body },
  });
  return { data, error };
}
