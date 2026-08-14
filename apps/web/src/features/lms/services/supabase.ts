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

// ═══════════════════════════════════════════════════════════
// ASSIGNMENT TYPES & QUERIES (Row 74)
// ═══════════════════════════════════════════════════════════

export interface Assignment {
  id: string;
  tenant_id: string;
  course_id: string;
  title: string;
  description: string | null;
  max_score: number;
  weight: number;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AssignmentWithRelations extends Assignment {
  courses?: { id: string; title: string } | null;
}

export async function selectAssignments(
  tenantId: string,
  options?: { courseId?: string },
) {
  let query = supabaseUntyped
    .from('school_desk.assignments')
    .select('*, courses!course_id(id, title)')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  if (options?.courseId) {
    query = query.eq('course_id', options.courseId);
  }

  query = query.order('created_at', { ascending: false });

  return query;
}

export async function insertAssignment(assignment: {
  tenant_id: string;
  course_id: string;
  title: string;
  description?: string;
  max_score?: number;
  weight?: number;
  due_date?: string;
  created_by: string;
}) {
  return supabaseUntyped
    .from('school_desk.assignments')
    .insert({
      tenant_id: assignment.tenant_id,
      course_id: assignment.course_id,
      title: assignment.title,
      description: assignment.description || null,
      max_score: assignment.max_score || 100,
      weight: assignment.weight || 1.0,
      due_date: assignment.due_date || null,
      created_by: assignment.created_by,
    })
    .select()
    .single();
}

export async function updateAssignment(
  assignmentId: string,
  updates: {
    title?: string;
    description?: string;
    max_score?: number;
    weight?: number;
    due_date?: string;
  },
) {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.max_score !== undefined) updateData.max_score = updates.max_score;
  if (updates.weight !== undefined) updateData.weight = updates.weight;
  if (updates.due_date !== undefined) updateData.due_date = updates.due_date;

  return supabaseUntyped
    .from('school_desk.assignments')
    .update(updateData)
    .eq('id', assignmentId)
    .select()
    .single();
}

// ═══════════════════════════════════════════════════════════
// GRADEBOOK TYPES & QUERIES (Row 74)
// ═══════════════════════════════════════════════════════════

export interface Gradebook {
  id: string;
  tenant_id: string;
  assignment_id: string;
  student_id: string;
  course_id: string;
  score: number | null;
  feedback: string | null;
  graded_by: string;
  graded_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface GradebookWithRelations extends Gradebook {
  assignments?: { id: string; title: string; max_score: number; weight: number } | null;
  profiles?: { id: string; name: string } | null;
  courses?: { id: string; title: string } | null;
}

export async function selectGradebook(
  tenantId: string,
  options?: { courseId?: string; assignmentId?: string; studentId?: string },
) {
  let query = supabaseUntyped
    .from('school_desk.gradebook')
    .select(`
      *,
      assignments!assignment_id(id, title, max_score, weight),
      profiles!student_id(id, name),
      courses!course_id(id, title)
    `)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  if (options?.courseId) {
    query = query.eq('course_id', options.courseId);
  }
  if (options?.assignmentId) {
    query = query.eq('assignment_id', options.assignmentId);
  }
  if (options?.studentId) {
    query = query.eq('student_id', options.studentId);
  }

  query = query.order('created_at', { ascending: false });

  return query;
}

export async function insertGrade(grade: {
  tenant_id: string;
  assignment_id: string;
  student_id: string;
  course_id: string;
  score: number | null;
  feedback?: string;
  graded_by: string;
}) {
  return supabaseUntyped
    .from('school_desk.gradebook')
    .insert({
      tenant_id: grade.tenant_id,
      assignment_id: grade.assignment_id,
      student_id: grade.student_id,
      course_id: grade.course_id,
      score: grade.score,
      feedback: grade.feedback || null,
      graded_by: grade.graded_by,
    })
    .select()
    .single();
}

export async function updateGrade(
  gradeId: string,
  updates: { score?: number | null; feedback?: string },
) {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.score !== undefined) updateData.score = updates.score;
  if (updates.feedback !== undefined) updateData.feedback = updates.feedback;

  return supabaseUntyped
    .from('school_desk.gradebook')
    .update(updateData)
    .eq('id', gradeId)
    .select()
    .single();
}

export async function getStudentGrades(courseId: string, studentId: string) {
  return supabaseUntyped
    .from('school_desk.gradebook')
    .select(`
      *,
      assignments!assignment_id(id, title, max_score, weight),
      profiles!student_id(id, name)
    `)
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
}

export async function calculateGrade(courseId: string, studentId: string) {
  const { data: { session } } = await supabaseUntyped.auth.getSession();
  if (!session?.access_token) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-final-grade`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ course_id: courseId, student_id: studentId }),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    return { data: null, error: { message: result.error || 'Failed to calculate grade' } };
  }

  return { data: result, error: null };
}

export function subscribeToGradebook(
  callback: (payload: {
    eventType: string;
    new: Gradebook;
    old: Gradebook | null;
  }) => void,
) {
  return supabaseUntyped
    .channel('school_desk.gradebook-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'school_desk', table: 'gradebook' },
      callback as (payload: Record<string, unknown>) => void,
    )
    .subscribe();
}

export function subscribeToAssignments(
  callback: (payload: {
    eventType: string;
    new: Assignment;
    old: Assignment | null;
  }) => void,
) {
  return supabaseUntyped
    .channel('school_desk.assignments-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'school_desk', table: 'assignments' },
      callback as (payload: Record<string, unknown>) => void,
    )
    .subscribe();
}

// ═══════════════════════════════════════════════════════════
// STUDENT TRANSCRIPT QUERY (Row 74)
// ═══════════════════════════════════════════════════════════

export async function getStudentTranscript(studentId: string, tenantId: string) {
  // Get all courses the student is enrolled in
  const { data: enrollments, error: enrollError } = await supabaseUntyped
    .from('student_class')
    .select('class_id, courses!class_id(id, title)')
    .eq('student_id', studentId)
    .is('deleted_at', null);

  if (enrollError) {
    return { data: null, error: enrollError };
  }

  if (!enrollments || enrollments.length === 0) {
    return { data: [], error: null };
  }

  const transcript = [];

  for (const enrollment of enrollments) {
    const course = enrollment.courses as any;
    if (!course) continue;

    // Get grades for this course
    const { data: grades } = await supabaseUntyped
      .from('school_desk.gradebook')
      .select(`
        score,
        assignments!assignment_id(id, title, max_score, weight)
      `)
      .eq('course_id', course.id)
      .eq('student_id', studentId)
      .is('deleted_at', null)
      .not('score', 'is', null);

    // Calculate weighted average
    let totalWeightedScore = 0;
    let totalWeight = 0;

    if (grades) {
      for (const grade of grades) {
        const assignment = grade.assignments as any;
        if (assignment && grade.score !== null) {
          const normalizedScore = (grade.score / assignment.max_score) * 100;
          totalWeightedScore += normalizedScore * assignment.weight;
          totalWeight += assignment.weight;
        }
      }
    }

    const weightedAverage = totalWeight > 0
      ? Math.round((totalWeightedScore / totalWeight) * 100) / 100
      : null;

    const getLetterGrade = (avg: number): string => {
      if (avg >= 93) return 'A';
      if (avg >= 90) return 'A-';
      if (avg >= 87) return 'B+';
      if (avg >= 83) return 'B';
      if (avg >= 80) return 'B-';
      if (avg >= 77) return 'C+';
      if (avg >= 73) return 'C';
      if (avg >= 70) return 'C-';
      if (avg >= 67) return 'D+';
      if (avg >= 60) return 'D';
      return 'F';
    };

    transcript.push({
      course_id: course.id,
      course_title: course.title,
      weighted_average: weightedAverage,
      grade_letter: weightedAverage !== null ? getLetterGrade(weightedAverage) : null,
      grade_count: grades?.length || 0,
    });
  }

  return { data: transcript, error: null };
}
