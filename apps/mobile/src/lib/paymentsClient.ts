// src/lib/paymentsClient.ts
// Dedicated payments data fetching for the Payments screen
// Tables: office_desk.payments, office_desk.invoices, public.payments

import { supabase } from '../services/supabase';
import type { InvoiceRecord, PaymentRecord } from '../types/profile';

// ═══════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════

export async function fetchPayments(): Promise<{
  data: PaymentRecord[];
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: 'Not authenticated' };
  }

  const tenantId = (user.app_metadata as Record<string, unknown>)?.tenant_id as string | undefined;

  // Office desk payments (invoice-linked)
  const { data: officePayments, error: officeErr } = await supabase
    .from('office_desk.payments')
    .select(
      'id, amount, currency, status, payment_method, reference, paid_at, created_at, invoice_id'
    )
    .eq('tenant_id', tenantId ?? '')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (officeErr) {
    return { data: [], error: officeErr.message };
  }

  // Enrich with invoice description/number
  const invoiceIds = [...new Set((officePayments ?? []).map((p) => p.invoice_id).filter(Boolean))];
  const invoiceMap = new Map<
    string,
    { description: string | null; invoice_number: string | null }
  >();

  if (invoiceIds.length > 0) {
    const { data: invoices } = await supabase
      .from('office_desk.invoices')
      .select('id, description, invoice_number')
      .in('id', invoiceIds);

    for (const inv of invoices ?? []) {
      invoiceMap.set(inv.id, {
        description: inv.description,
        invoice_number: inv.invoice_number,
      });
    }
  }

  const enrichedOfficePayments: PaymentRecord[] = (officePayments ?? []).map((p) => {
    const inv = invoiceMap.get(p.invoice_id);
    return {
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      payment_method: p.payment_method,
      reference: p.reference,
      paid_at: p.paid_at,
      created_at: p.created_at,
      description: inv?.description ?? null,
      invoice_number: inv?.invoice_number ?? null,
    };
  });

  // Debit order payments from public.payments
  const { data: debitPayments } = await supabase
    .schema('public').from('payments')
    .select('id, amount, status, payment_type, created_at, debit_order_id')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false });

  const debitRecords: PaymentRecord[] = (debitPayments ?? []).map((p) => ({
    id: p.id,
    amount: p.amount,
    currency: 'ZAR',
    status: p.status === 'completed' ? 'confirmed' : (p.status as PaymentRecord['status']),
    payment_method: 'debit_order',
    reference: null,
    paid_at: p.created_at,
    created_at: p.created_at,
    description: `Debit Order — ${p.payment_type}`,
    invoice_number: null,
  }));

  // Merge and sort by date (newest first)
  const allPayments = [...enrichedOfficePayments, ...debitRecords].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return { data: allPayments, error: null };
}

// ═══════════════════════════════════════════════════════════
// INVOICES
// ═══════════════════════════════════════════════════════════

export async function fetchInvoices(): Promise<{
  data: InvoiceRecord[];
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: 'Not authenticated' };
  }

  const tenantId = (user.app_metadata as Record<string, unknown>)?.tenant_id as string | undefined;

  // Get family_account_id via office_desk.users
  const { data: officeUser } = await supabase
    .from('office_desk.users')
    .select('family_account_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!officeUser?.family_account_id) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from('office_desk.invoices')
    .select('id, invoice_number, description, amount, currency, status, due_date, created_at')
    .eq('family_account_id', officeUser.family_account_id)
    .eq('tenant_id', tenantId ?? '')
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  const invoices: InvoiceRecord[] = (data ?? []).map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    description: inv.description,
    amount: inv.amount,
    currency: inv.currency,
    status: inv.status,
    due_date: inv.due_date,
    created_at: inv.created_at,
  }));

  return { data: invoices, error: null };
}

// ═══════════════════════════════════════════════════════════
// PAYMENTS DASHBOARD SUMMARY
// ═══════════════════════════════════════════════════════════

export interface PaymentsSummary {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  outstandingBalance: number;
  currency: string;
}

export async function fetchPaymentsSummary(): Promise<{
  data: PaymentsSummary;
  error: string | null;
}> {
  const { data: payments, error: payErr } = await fetchPayments();
  if (payErr) {
    return {
      data: {
        totalPaid: 0,
        totalPending: 0,
        totalOverdue: 0,
        outstandingBalance: 0,
        currency: 'ZAR',
      },
      error: payErr,
    };
  }

  const { data: invoices, error: invErr } = await fetchInvoices();
  if (invErr) {
    return {
      data: {
        totalPaid: 0,
        totalPending: 0,
        totalOverdue: 0,
        outstandingBalance: 0,
        currency: 'ZAR',
      },
      error: invErr,
    };
  }

  const totalPaid = payments
    .filter((p) => p.status === 'confirmed')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalOverdue = invoices
    .filter((inv) => inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const outstandingBalance = invoices
    .filter((inv) => inv.status !== 'paid' && inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + inv.amount, 0);

  return {
    data: {
      totalPaid,
      totalPending,
      totalOverdue,
      outstandingBalance,
      currency: 'ZAR',
    },
    error: null,
  };
}
