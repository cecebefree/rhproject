// serviceDeskClient.ts — Fetch service desk stats from real DB
// Tables: public.profiles, office_desk.registrations, office_desk.family_accounts,
//         office_desk.invoices, attendance (if exists)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DeskStats {
  frontDesk: {
    openInquiries: number;
    newToday: number;
    pendingCallback: number;
  };
  officeDesk: {
    activeFamilies: number;
    pendingInvoices: number;
    newRegistrations: number;
  };
  schoolDesk: {
    totalStudents: number;
    presentToday: number;
    pendingGrades: number;
  };
  crm: {
    totalFamilies: number;
    activeEnrollments: number;
    pendingFollowups: number;
  };
}

export async function fetchServiceDeskStats(): Promise<DeskStats> {
  const today = new Date().toISOString().split('T')[0];

  // Front Desk: registrations (leads)
  const { count: totalRegistrations } = await supabase
    .from('office_desk.registrations')
    .select('*', { count: 'exact', head: true });

  const { count: newToday } = await supabase
    .from('office_desk.registrations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today);

  const { count: pendingReview } = await supabase
    .from('office_desk.registrations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending_review');

  // Office Desk: families, invoices, registrations
  const { count: activeFamilies } = await supabase
    .from('office_desk.family_accounts')
    .select('*', { count: 'exact', head: true });

  const { count: pendingInvoices } = await supabase
    .from('office_desk.invoices')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: newRegistrations } = await supabase
    .from('office_desk.registrations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending_review');

  // School Desk: students (profiles with role=student)
  const { count: totalStudents } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student');

  // CRM: total families, enrollments
  const { count: crmFamilies } = await supabase
    .from('office_desk.family_accounts')
    .select('*', { count: 'exact', head: true });

  const { count: activeEnrollments } = await supabase
    .from('office_desk.registrations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');

  return {
    frontDesk: {
      openInquiries: totalRegistrations || 0,
      newToday: newToday || 0,
      pendingCallback: pendingReview || 0,
    },
    officeDesk: {
      activeFamilies: activeFamilies || 0,
      pendingInvoices: pendingInvoices || 0,
      newRegistrations: newRegistrations || 0,
    },
    schoolDesk: {
      totalStudents: totalStudents || 0,
      presentToday: 0, // TODO: attendance table
      pendingGrades: 0, // TODO: grades table
    },
    crm: {
      totalFamilies: crmFamilies || 0,
      activeEnrollments: activeEnrollments || 0,
      pendingFollowups: pendingReview || 0,
    },
  };
}
