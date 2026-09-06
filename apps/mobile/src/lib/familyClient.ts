// familyClient.ts — Fetch family data for mobile Family tab
// Tables: public.parent_student_link, public.profiles, office_desk.family_accounts,
//         office_desk.invoices, office_desk.payments

import { supabase } from '../services/supabase';

export interface ChildProfile {
  id: string;
  name: string;
  grade: string | null;
  curriculum: string | null;
  relationship: string;
}

export interface InvoiceRecord {
  id: string;
  amount: number;
  status: string;
  due_date: string | null;
  description: string | null;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  payment_method: string | null;
}

export interface FamilyData {
  children: ChildProfile[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
}

export async function fetchFamilyChildren(): Promise<ChildProfile[]> {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error('Not authenticated');

  // Get linked students via parent_student_link
  const { data: links, error: linkErr } = await supabase
    .from('parent_student_link')
    .select('student_id, relationship')
    .eq('parent_id', user.id)
    .is('deleted_at', null);

  if (linkErr) throw linkErr;
  if (!links || links.length === 0) return [];

  // Get student profiles
  const studentIds = links.map(l => l.student_id);
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, name, grade, curriculum')
    .in('id', studentIds);

  if (profErr) throw profErr;

  return profiles?.map(p => {
    const link = links.find(l => l.student_id === p.id);
    return {
      id: p.id,
      name: p.name || 'Unknown',
      grade: p.grade,
      curriculum: p.curriculum,
      relationship: link?.relationship || 'guardian',
    };
  }) || [];
}

export async function fetchFamilyInvoices(): Promise<InvoiceRecord[]> {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error('Not authenticated');

  // Get family account
  const { data: fa, error: faErr } = await supabase
    .from('office_desk.family_accounts')
    .select('id')
    .eq('tenant_id', (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id || '')
    .limit(1)
    .single();

  if (faErr || !fa) return [];

  // Get invoices
  const { data: invoices, error: invErr } = await supabase
    .from('office_desk.invoices')
    .select('id, amount, status, due_date, description')
    .eq('family_account_id', fa.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (invErr) throw invErr;
  return invoices || [];
}

export async function fetchFamilyPayments(): Promise<PaymentRecord[]> {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error('Not authenticated');

  // Get family account
  const { data: fa, error: faErr } = await supabase
    .from('office_desk.family_accounts')
    .select('id')
    .eq('tenant_id', (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id || '')
    .limit(1)
    .single();

  if (faErr || !fa) return [];

  // Get payments
  const { data: payments, error: payErr } = await supabase
    .from('office_desk.payments')
    .select('id, amount, status, created_at, payment_method')
    .eq('family_account_id', fa.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (payErr) throw payErr;
  return payments || [];
}
