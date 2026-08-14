import type { Database } from '@redhouse/shared';
// T014 — LMS feature Supabase client configuration (fail-loud).
// Typed via @redhouse/shared (P2-001 import law): never a relative/deep path.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'LMS Supabase client init failed: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must both be set'
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

// Untyped client for office_desk schema (not in shared Database type)
// biome-ignore lint/suspicious/noExplicitAny: office_desk schema not in shared types
export const supabaseUntyped = createClient(SUPABASE_URL, SUPABASE_ANON_KEY) as any;

export type LmsSupabaseClient = typeof supabase;

// ═══════════════════════════════════════════════════════════
// REGISTRATION TYPES & QUERIES (Row 67)
// ═══════════════════════════════════════════════════════════

export type RegistrationStatus =
  | 'pending_init'
  | 'pending_review'
  | 'approved'
  | 'active'
  | 'withdrawn'
  | 'rejected';

export const REGISTRATION_STATUSES: RegistrationStatus[] = [
  'pending_init',
  'pending_review',
  'approved',
  'active',
  'withdrawn',
  'rejected',
];

export interface Registration {
  id: string;
  tenant_id: string;
  lead_reference_id: string | null;
  student_name: string;
  student_email: string;
  student_phone: string | null;
  course_name: string | null;
  status: RegistrationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  payment_attached_at: string | null;
  stripe_customer_id: string | null;
  stripe_charge_id: string | null;
  paypal_transaction_id: string | null;
}

export async function selectRegistrations(
  tenantId: string,
  search?: string,
  statusFilter?: RegistrationStatus,
) {
  let query = supabaseUntyped
    .from('office_desk.registrations')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(
      `student_name.ilike.%${search}%,student_email.ilike.%${search}%`,
    );
  }

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  return query;
}

export async function insertRegistration(reg: {
  tenant_id: string;
  student_name: string;
  student_email: string;
  student_phone?: string;
  course_name?: string;
  notes?: string;
  lead_reference_id?: string;
}) {
  return supabaseUntyped
    .from('office_desk.registrations')
    .insert({
      tenant_id: reg.tenant_id,
      student_name: reg.student_name,
      student_email: reg.student_email,
      student_phone: reg.student_phone || null,
      course_name: reg.course_name || null,
      notes: reg.notes || null,
      lead_reference_id: reg.lead_reference_id || null,
      status: 'pending_init',
    })
    .select()
    .single();
}

export async function updateRegistrationStatus(
  registrationId: string,
  status: RegistrationStatus,
) {
  return supabaseUntyped
    .from('office_desk.registrations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', registrationId)
    .select()
    .single();
}

export async function getRegistrationById(registrationId: string) {
  return supabaseUntyped
    .from('office_desk.registrations')
    .select('*')
    .eq('id', registrationId)
    .single();
}

export function subscribeToRegistrations(
  callback: (payload: {
    eventType: string;
    new: Registration;
    old: Registration | null;
  }) => void,
) {
  return supabaseUntyped
    .channel('office_desk.registrations-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'office_desk', table: 'registrations' },
      callback as (payload: Record<string, unknown>) => void,
    )
    .subscribe();
}
