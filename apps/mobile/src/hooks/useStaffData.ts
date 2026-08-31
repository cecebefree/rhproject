// src/hooks/useStaffData.ts
// Fetches contacts (leads) + family accounts/invoices for staff/admin roles
// RLS-filtered: contacts are tenant-scoped, invoices via family_accounts

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  category: string | null;
  tags: string[] | null;
  assigned_to: string | null;
  created_at: string;
}

export interface FamilyAccount {
  id: string;
  family_code: string;
  status: string;
  tenant_id: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  family_account_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  issued_date: string | null;
  due_date: string | null;
  description: string | null;
  created_at: string;
}

export interface InvoiceWithFamily extends Invoice {
  family_code?: string;
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .schema('office_desk')
      .from('contacts')
      .select('id, name, email, phone, status, category, tags, assigned_to, created_at')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (fetchError) {
      setError(fetchError.message);
      setLeads([]);
    } else {
      setLeads(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return { leads, loading, error, refresh: fetchLeads };
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<InvoiceWithFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Fetch invoices joined with family_accounts for family_code
    const { data, error: fetchError } = await supabase
      .schema('office_desk')
      .from('invoices')
      .select(`
        id,
        family_account_id,
        invoice_number,
        amount,
        currency,
        status,
        issued_date,
        due_date,
        description,
        created_at,
        family_accounts!inner(family_code)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (fetchError) {
      setError(fetchError.message);
      setInvoices([]);
    } else {
      const mapped = (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        family_account_id: row.family_account_id as string,
        invoice_number: row.invoice_number as string,
        amount: row.amount as number,
        currency: row.currency as string,
        status: row.status as string,
        issued_date: row.issued_date as string | null,
        due_date: row.due_date as string | null,
        description: row.description as string | null,
        created_at: row.created_at as string,
        family_code: (row.family_accounts as { family_code: string })?.family_code,
      }));
      setInvoices(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return { invoices, loading, error, refresh: fetchInvoices };
}
