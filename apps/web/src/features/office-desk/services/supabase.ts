import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Office Desk Supabase client init failed: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must both be set'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Untyped client for office_desk schema (not in shared Database type)
// biome-ignore lint/suspicious/noExplicitAny: office_desk schema not in shared types
export const supabaseUntyped = createClient(SUPABASE_URL, SUPABASE_ANON_KEY) as any;

// ═══════════════════════════════════════════════════════════
// INVOICE TYPES
// ═══════════════════════════════════════════════════════════

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'void';

export type PaymentProcessor = 'stripe' | 'paypal';

export type PaymentMethod = 'card' | 'ach' | 'paypal';

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
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_error_message: string | null;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  paypal_error_message: string | null;
  payment_processor: PaymentProcessor | null;
  payment_method: PaymentMethod | null;
  paid_at: string | null;
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

// ═══════════════════════════════════════════════════════════
// SUBSCRIPTION TYPES (Row 27 — dual processor)
// ═══════════════════════════════════════════════════════════

export type SubscriptionStatus = 'active' | 'past_due' | 'unpaid' | 'cancelled';

export type PlanId = 'starter' | 'pro' | 'enterprise';

export interface Subscription {
  id: string;
  tenant_id: string;
  stripe_subscription_id: string | null;
  paypal_plan_id: string | null;
  processor: PaymentProcessor;
  plan_id: PlanId;
  status: SubscriptionStatus;
  amount_monthly: number;
  billing_interval: 'month' | 'year';
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface StripeCustomer {
  id: string;
  tenant_id: string;
  stripe_customer_id: string | null;
  paypal_customer_id: string | null;
  billing_email: string | null;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
  created_at: string;
  updated_at: string;
}

export const PLAN_LABELS: Record<PlanId, { name: string; priceMonthly: number; priceYearly: number }> = {
  starter: { name: 'Starter', priceMonthly: 99, priceYearly: 990 },
  pro: { name: 'Pro', priceMonthly: 299, priceYearly: 2990 },
  enterprise: { name: 'Enterprise', priceMonthly: 999, priceYearly: 9990 },
};

// ═══════════════════════════════════════════════════════════
// PAYMENT QUERIES (Row 27)
// ═══════════════════════════════════════════════════════════

export async function selectInvoiceByStripePaymentIntentId(stripePaymentIntentId: string) {
  return supabase
    .from('office_desk.invoices')
    .select('*')
    .eq('stripe_payment_intent_id', stripePaymentIntentId)
    .single();
}

export async function selectInvoiceByPayPalOrderId(paypalOrderId: string) {
  return supabase
    .from('office_desk.invoices')
    .select('*')
    .eq('paypal_order_id', paypalOrderId)
    .single();
}

export async function selectSubscriptions(tenantId: string) {
  return supabase
    .from('office_desk.subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
}

export async function getSubscriptionById(subscriptionId: string) {
  return supabase
    .from('office_desk.subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single();
}

export async function updateSubscription(
  subscriptionId: string,
  updates: Partial<Pick<Subscription, 'status' | 'current_period_end' | 'cancel_at_period_end'>>
) {
  return supabase
    .from('office_desk.subscriptions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', subscriptionId)
    .select()
    .single();
}

export async function cancelSubscription(subscriptionId: string) {
  return supabase
    .from('office_desk.subscriptions')
    .update({
      status: 'cancelled',
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .select()
    .single();
}

export async function getStripeCustomer(tenantId: string) {
  return supabase
    .from('office_desk.stripe_customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();
}

// ═══════════════════════════════════════════════════════════
// PAYMENT EDGE FUNCTION CALLS (Row 27)
// ═══════════════════════════════════════════════════════════

export async function createPaymentIntent(payload: {
  invoice_id: string;
  tenant_id: string;
  processor: PaymentProcessor;
  payment_method?: PaymentMethod;
}) {
  const { data, error } = await supabase.functions.invoke('create-payment-intent', {
    body: payload,
  });
  return { data, error };
}

export async function confirmPayment(payload: {
  invoice_id: string;
  processor: PaymentProcessor;
  payment_intent_id?: string;
  order_id?: string;
  payment_method_id?: string;
}) {
  const { data, error } = await supabase.functions.invoke('confirm-payment', {
    body: payload,
  });
  return { data, error };
}

export async function createSubscription(payload: {
  tenant_id: string;
  plan_id: PlanId;
  processor: 'stripe' | 'paypal' | 'both';
  billing_interval?: 'month' | 'year';
}) {
  const { data, error } = await supabase.functions.invoke('create-subscription', {
    body: payload,
  });
  return { data, error };
}

// ═══════════════════════════════════════════════════════════
// PAYMENT REALTIME SUBSCRIPTIONS (Row 27)
// ═══════════════════════════════════════════════════════════

export function subscribeToInvoicePayments(
  tenantId: string,
  callback: (payload: { eventType: string; new: Invoice; old: Invoice | null }) => void
) {
  return supabase
    .channel(`office_desk.invoices-payments-${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'office_desk',
        table: 'invoices',
        filter: `tenant_id=eq.${tenantId}`,
      },
      callback as (payload: Record<string, unknown>) => void
    )
    .subscribe();
}

export function subscribeToSubscriptions(
  tenantId: string,
  callback: (payload: { eventType: string; new: Subscription; old: Subscription | null }) => void
) {
  return supabase
    .channel(`office_desk.subscriptions-${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'office_desk',
        table: 'subscriptions',
        filter: `tenant_id=eq.${tenantId}`,
      },
      callback as (payload: Record<string, unknown>) => void
    )
    .subscribe();
}
