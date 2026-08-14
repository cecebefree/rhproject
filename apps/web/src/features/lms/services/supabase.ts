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

// ═══════════════════════════════════════════════════════════
// NEWS TYPES & QUERIES (Row 68)
// ═══════════════════════════════════════════════════════════

export interface News {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  deleted_at: string | null;
}

export async function selectNews(
  tenantId: string,
  search?: string,
  options?: { includeDrafts?: boolean; createdBy?: string },
) {
  let query = supabaseUntyped
    .from('school_desk.news')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  if (!options?.includeDrafts) {
    query = query.not('published_at', 'is', null);
  }

  if (options?.createdBy) {
    query = query.eq('created_by', options.createdBy);
  }

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  query = query.order('published_at', { ascending: false });

  return query;
}

export async function insertNews(news: {
  tenant_id: string;
  title: string;
  content: string;
  created_by: string;
  publish?: boolean;
}) {
  return supabaseUntyped
    .from('school_desk.news')
    .insert({
      tenant_id: news.tenant_id,
      title: news.title,
      content: news.content,
      created_by: news.created_by,
      published_at: news.publish ? new Date().toISOString() : null,
    })
    .select()
    .single();
}

export async function updateNews(
  newsId: string,
  updates: {
    title?: string;
    content?: string;
    publish?: boolean;
  },
) {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.content !== undefined) updateData.content = updates.content;
  if (updates.publish !== undefined) {
    updateData.published_at = updates.publish
      ? new Date().toISOString()
      : null;
  }

  return supabaseUntyped
    .from('school_desk.news')
    .update(updateData)
    .eq('id', newsId)
    .select()
    .single();
}

export async function deleteNews(newsId: string) {
  return supabaseUntyped
    .from('school_desk.news')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', newsId);
}

export async function getNewsById(newsId: string) {
  return supabaseUntyped
    .from('school_desk.news')
    .select('*')
    .eq('id', newsId)
    .is('deleted_at', null)
    .single();
}

export function subscribeToNews(
  callback: (payload: {
    eventType: string;
    new: News;
    old: News | null;
  }) => void,
) {
  return supabaseUntyped
    .channel('school_desk.news-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'school_desk', table: 'news' },
      callback as (payload: Record<string, unknown>) => void,
    )
    .subscribe();
}

// ═══════════════════════════════════════════════════════════
// BROADCAST TYPES & QUERIES (Row 69)
// ═══════════════════════════════════════════════════════════

export interface Broadcast {
  id: string;
  tenant_id: string;
  group_id: string;
  title: string;
  message: string;
  created_by: string;
  created_at: string;
  sent_at: string | null;
  deleted_at: string | null;
}

export interface BroadcastWithGroup extends Broadcast {
  conversations?: { id: string; category: string } | null;
  profiles?: { id: string; name: string } | null;
}

export async function selectBroadcasts(
  tenantId: string,
  options?: { groupId?: string; includeDrafts?: boolean },
) {
  let query = supabaseUntyped
    .from('school_desk.broadcasts')
    .select('*, conversations(id, category), profiles(id, name)')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  if (!options?.includeDrafts) {
    query = query.not('sent_at', 'is', null);
  }

  if (options?.groupId) {
    query = query.eq('group_id', options.groupId);
  }

  query = query.order('sent_at', { ascending: false });

  return query;
}

export async function insertBroadcast(broadcast: {
  tenant_id: string;
  group_id: string;
  title: string;
  message: string;
  created_by: string;
  send?: boolean;
}) {
  return supabaseUntyped
    .from('school_desk.broadcasts')
    .insert({
      tenant_id: broadcast.tenant_id,
      group_id: broadcast.group_id,
      title: broadcast.title,
      message: broadcast.message,
      created_by: broadcast.created_by,
      sent_at: broadcast.send ? new Date().toISOString() : null,
    })
    .select()
    .single();
}

export async function updateBroadcast(
  broadcastId: string,
  updates: {
    title?: string;
    message?: string;
    send?: boolean;
  },
) {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.message !== undefined) updateData.message = updates.message;
  if (updates.send !== undefined) {
    updateData.sent_at = updates.send ? new Date().toISOString() : null;
  }

  return supabaseUntyped
    .from('school_desk.broadcasts')
    .update(updateData)
    .eq('id', broadcastId)
    .select()
    .single();
}

export async function deleteBroadcast(broadcastId: string) {
  return supabaseUntyped
    .from('school_desk.broadcasts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', broadcastId);
}

export async function getBroadcastById(broadcastId: string) {
  return supabaseUntyped
    .from('school_desk.broadcasts')
    .select('*, conversations(id, category), profiles(id, name)')
    .eq('id', broadcastId)
    .is('deleted_at', null)
    .single();
}

export function subscribeToBroadcasts(
  callback: (payload: {
    eventType: string;
    new: Broadcast;
    old: Broadcast | null;
  }) => void,
) {
  return supabaseUntyped
    .channel('school_desk.broadcasts-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'school_desk', table: 'broadcasts' },
      callback as (payload: Record<string, unknown>) => void,
    )
    .subscribe();
}

// ═══════════════════════════════════════════════════════════
// REPORT CARD TYPES & QUERIES (Row 71)
// ═══════════════════════════════════════════════════════════

export type ReportCardStatus = 'draft' | 'released' | 'visible';

export interface ReportCard {
  id: string;
  student_id: string;
  term: string;
  subject: string;
  grade: string | null;
  status: ReportCardStatus;
  created_by: string;
  released_by: string | null;
  released_at: string | null;
  visible_at: string | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface ReportCardWithRelations extends ReportCard {
  profiles?: { id: string; name: string } | null;
}

export async function selectReportCards(
  tenantId: string,
  options?: { courseId?: string; createdBy?: string },
) {
  let query = supabaseUntyped
    .from('school_desk.report_cards')
    .select('*, profiles!student_id(id, name)')
    .eq('tenant_id', tenantId);

  if (options?.createdBy) {
    query = query.eq('created_by', options.createdBy);
  }

  query = query.order('created_at', { ascending: false });

  return query;
}

export async function insertReportCard(card: {
  student_id: string;
  term: string;
  subject: string;
  grade?: string;
  created_by: string;
  tenant_id: string;
}) {
  return supabaseUntyped
    .from('school_desk.report_cards')
    .insert({
      student_id: card.student_id,
      term: card.term,
      subject: card.subject,
      grade: card.grade || null,
      status: 'draft',
      created_by: card.created_by,
      tenant_id: card.tenant_id,
    })
    .select()
    .single();
}

export async function updateReportCard(
  cardId: string,
  updates: {
    grade?: string;
    feedback?: string;
  },
) {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.grade !== undefined) updateData.grade = updates.grade;
  if (updates.feedback !== undefined) updateData.feedback = updates.feedback;

  return supabaseUntyped
    .from('school_desk.report_cards')
    .update(updateData)
    .eq('id', cardId)
    .select()
    .single();
}

export async function getReportCardById(cardId: string) {
  return supabaseUntyped
    .from('school_desk.report_cards')
    .select('*, profiles!student_id(id, name)')
    .eq('id', cardId)
    .single();
}

export function subscribeToReportCards(
  callback: (payload: {
    eventType: string;
    new: ReportCard;
    old: ReportCard | null;
  }) => void,
) {
  return supabaseUntyped
    .channel('school_desk.report_cards-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'school_desk', table: 'report_cards' },
      callback as (payload: Record<string, unknown>) => void,
    )
    .subscribe();
}

// ═══════════════════════════════════════════════════════════
// PAYMENT REQUEST TYPES & QUERIES (Row 72)
// ═══════════════════════════════════════════════════════════

export type PaymentRequestStatus = 'pending' | 'paid' | 'expired' | 'cancelled';

export interface PaymentRequest {
  id: string;
  tenant_id: string;
  registration_id: string;
  amount: number;
  currency: string;
  description: string | null;
  stripe_session_id: string | null;
  stripe_payment_url: string | null;
  status: PaymentRequestStatus;
  created_by: string;
  created_at: string;
  paid_at: string | null;
  expired_at: string | null;
  cancelled_at: string | null;
  deleted_at: string | null;
}

export interface PaymentRequestWithRelations extends PaymentRequest {
  registrations?: { id: string; student_name: string; student_email: string } | null;
}

export async function selectPaymentRequests(tenantId: string) {
  return supabaseUntyped
    .from('school_desk.payment_requests')
    .select('*, registrations!registration_id(id, student_name, student_email)')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
}

export async function insertPaymentRequest(request: {
  tenant_id: string;
  registration_id: string;
  amount: number;
  currency: string;
  description?: string;
  created_by: string;
}) {
  return supabaseUntyped
    .from('school_desk.payment_requests')
    .insert({
      tenant_id: request.tenant_id,
      registration_id: request.registration_id,
      amount: request.amount,
      currency: request.currency,
      description: request.description || null,
      status: 'pending',
      created_by: request.created_by,
    })
    .select()
    .single();
}

export async function updatePaymentRequest(
  requestId: string,
  updates: {
    status?: PaymentRequestStatus;
    stripe_session_id?: string;
    stripe_payment_url?: string;
  },
) {
  const updateData: Record<string, unknown> = {};

  if (updates.status !== undefined) {
    updateData.status = updates.status;
    if (updates.status === 'paid') updateData.paid_at = new Date().toISOString();
    if (updates.status === 'expired') updateData.expired_at = new Date().toISOString();
    if (updates.status === 'cancelled') updateData.cancelled_at = new Date().toISOString();
  }
  if (updates.stripe_session_id !== undefined) {
    updateData.stripe_session_id = updates.stripe_session_id;
  }
  if (updates.stripe_payment_url !== undefined) {
    updateData.stripe_payment_url = updates.stripe_payment_url;
  }

  return supabaseUntyped
    .from('school_desk.payment_requests')
    .update(updateData)
    .eq('id', requestId)
    .select()
    .single();
}

export async function getPaymentRequestById(requestId: string) {
  return supabaseUntyped
    .from('school_desk.payment_requests')
    .select('*, registrations!registration_id(id, student_name, student_email)')
    .eq('id', requestId)
    .is('deleted_at', null)
    .single();
}

export async function getPaymentRequestBySessionId(sessionId: string) {
  return supabaseUntyped
    .from('school_desk.payment_requests')
    .select('*, registrations!registration_id(id, student_name, student_email)')
    .eq('stripe_session_id', sessionId)
    .is('deleted_at', null)
    .single();
}

export function subscribeToPaymentRequests(
  callback: (payload: {
    eventType: string;
    new: PaymentRequest;
    old: PaymentRequest | null;
  }) => void,
) {
  return supabaseUntyped
    .channel('school_desk.payment_requests-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'school_desk', table: 'payment_requests' },
      callback as (payload: Record<string, unknown>) => void,
    )
    .subscribe();
}

export async function createPaymentSession(payload: {
  registration_id: string;
  amount: number;
  currency: string;
  description?: string;
}) {
  const { data: { session } } = await supabaseUntyped.auth.getSession();
  if (!session?.access_token) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-session`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    return { data: null, error: { message: result.error || 'Failed to create payment session' } };
  }

  return { data: result, error: null };
}

// ═══════════════════════════════════════════════════════════
// ATTENDANCE TYPES & QUERIES (Row 73)
// ═══════════════════════════════════════════════════════════

export type AttendanceStatus = 'present' | 'absent' | 'excused';

export interface Attendance {
  id: string;
  tenant_id: string;
  course_id: string;
  student_id: string;
  class_date: string;
  status: AttendanceStatus;
  marked_by: string;
  marked_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AttendanceWithRelations extends Attendance {
  profiles?: { id: string; name: string } | null;
  courses?: { id: string; title: string } | null;
}

export async function selectAttendance(
  tenantId: string,
  options?: { courseId?: string; classDate?: string; startDate?: string; endDate?: string },
) {
  let query = supabaseUntyped
    .from('school_desk.attendance')
    .select('*, profiles!student_id(id, name), courses!course_id(id, title)')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  if (options?.courseId) {
    query = query.eq('course_id', options.courseId);
  }
  if (options?.classDate) {
    query = query.eq('class_date', options.classDate);
  }
  if (options?.startDate) {
    query = query.gte('class_date', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('class_date', options.endDate);
  }

  query = query.order('class_date', { ascending: false });

  return query;
}

export async function insertAttendance(record: {
  tenant_id: string;
  course_id: string;
  student_id: string;
  class_date: string;
  status: AttendanceStatus;
  marked_by: string;
  notes?: string;
}) {
  return supabaseUntyped
    .from('school_desk.attendance')
    .insert({
      tenant_id: record.tenant_id,
      course_id: record.course_id,
      student_id: record.student_id,
      class_date: record.class_date,
      status: record.status,
      marked_by: record.marked_by,
      notes: record.notes || null,
    })
    .select()
    .single();
}

export async function updateAttendance(
  attendanceId: string,
  updates: { status?: AttendanceStatus; notes?: string },
) {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  return supabaseUntyped
    .from('school_desk.attendance')
    .update(updateData)
    .eq('id', attendanceId)
    .select()
    .single();
}

export async function getAttendanceByDate(courseId: string, classDate: string) {
  return supabaseUntyped
    .from('school_desk.attendance')
    .select('*, profiles!student_id(id, name), courses!course_id(id, title)')
    .eq('course_id', courseId)
    .eq('class_date', classDate)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
}

export function subscribeToAttendance(
  callback: (payload: {
    eventType: string;
    new: Attendance;
    old: Attendance | null;
  }) => void,
) {
  return supabaseUntyped
    .channel('school_desk.attendance-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'school_desk', table: 'attendance' },
      callback as (payload: Record<string, unknown>) => void,
    )
    .subscribe();
}

export async function markAttendanceBulk(payload: {
  course_id: string;
  class_date: string;
  marks: Array<{ student_id: string; status: AttendanceStatus; notes?: string }>;
}) {
  const { data: { session } } = await supabaseUntyped.auth.getSession();
  if (!session?.access_token) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mark-attendance`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    return { data: null, error: { message: result.error || 'Failed to mark attendance' } };
  }

  return { data: result, error: null };
}

export async function getStudentRoster(courseId: string) {
  return supabaseUntyped
    .from('student_class')
    .select('student_id, profiles!student_id(id, name, email)')
    .eq('class_id', courseId)
    .is('deleted_at', null);
}

export async function getTeacherCourses(teacherId: string) {
  return supabaseUntyped
    .from('school_desk.courses')
    .select('id, title, status')
    .eq('teacher_id', teacherId)
    .in('status', ['published', 'active']);
}
