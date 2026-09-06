// crmClient.ts — Fetch CRM data for service desk
// Tables: public.profiles, office_desk.family_accounts, office_desk.invoices,
//         office_desk.payments, public.parent_student_link

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface FamilyProfile {
  id: string;
  name: string;
  tenant_id: string;
  family_code: string | null;
  status: string;
  created_at: string;
}

export interface AdultProfile {
  id: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string | null;
  grade: string | null;
  curriculum: string | null;
  status: string;
}

export interface InvoiceRecord {
  id: string;
  amount: number;
  status: string;
  due_date: string | null;
  description: string | null;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  payment_method: string | null;
}

export interface FamilyData {
  family: FamilyProfile;
  adults: AdultProfile[];
  students: StudentProfile[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
}

export async function fetchFamilyByCode(familyCode: string): Promise<FamilyData | null> {
  // Get family account
  const { data: fa, error: faErr } = await supabase
    .from('office_desk.family_accounts')
    .select('*')
    .eq('family_code', familyCode)
    .single();

  if (faErr || !fa) return null;

  // Get linked adults (via profiles with role=adult)
  const { data: adults } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('tenant_id', fa.tenant_id)
    .in('role', ['father', 'mother', 'guardian', 'other']);

  // Get linked students (via parent_student_link)
  const { data: studentLinks } = await supabase
    .from('parent_student_link')
    .select('student_id')
    .is('deleted_at', null);

  const studentIds = studentLinks?.map(l => l.student_id) || [];
  const { data: students } = studentIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, name, email, grade, curriculum, role')
        .in('id', studentIds)
    : { data: [] };

  // Get invoices
  const { data: invoices } = await supabase
    .from('office_desk.invoices')
    .select('id, amount, status, due_date, description, created_at')
    .eq('family_account_id', fa.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get payments
  const { data: payments } = await supabase
    .from('office_desk.payments')
    .select('id, amount, status, created_at, payment_method')
    .eq('family_account_id', fa.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    family: fa,
    adults: adults?.map(a => ({ ...a, status: 'Active' })) || [],
    students: students?.map(s => ({ ...s, status: 'Active' })) || [],
    invoices: invoices || [],
    payments: payments || [],
  };
}

export async function fetchFamilyById(familyId: string): Promise<FamilyData | null> {
  // Get family account by ID
  const { data: fa, error: faErr } = await supabase
    .from('office_desk.family_accounts')
    .select('*')
    .eq('id', familyId)
    .single();

  if (faErr || !fa) return null;

  // Get linked adults
  const { data: adults } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('tenant_id', fa.tenant_id)
    .in('role', ['father', 'mother', 'guardian', 'other']);

  // Get linked students
  const { data: studentLinks } = await supabase
    .from('parent_student_link')
    .select('student_id')
    .is('deleted_at', null);

  const studentIds = studentLinks?.map(l => l.student_id) || [];
  const { data: students } = studentIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, name, email, grade, curriculum, role')
        .in('id', studentIds)
    : { data: [] };

  // Get invoices
  const { data: invoices } = await supabase
    .from('office_desk.invoices')
    .select('id, amount, status, due_date, description, created_at')
    .eq('family_account_id', fa.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get payments
  const { data: payments } = await supabase
    .from('office_desk.payments')
    .select('id, amount, status, created_at, payment_method')
    .eq('family_account_id', fa.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    family: fa,
    adults: adults?.map(a => ({ ...a, status: 'Active' })) || [],
    students: students?.map(s => ({ ...s, status: 'Active' })) || [],
    invoices: invoices || [],
    payments: payments || [],
  };
}
