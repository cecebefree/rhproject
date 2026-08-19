// notifyEvent — create in-app notifications + trigger email for key events (Row 74)
// Called from components when: registration approved, grade posted, attendance logged, message sent

import { supabaseUntyped } from '../features/lms/services/supabase';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface NotifyResult {
  notificationId: string | null;
  emailSent: boolean;
  error: string | null;
}

/**
 * Create an in-app notification + attempt email delivery.
 */
async function createNotification(params: {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<NotifyResult> {
  const { tenantId, userId, type, title, message, metadata } = params;

  // 1. Insert in-app notification
  const { data, error: insertErr } = await supabase
    .from('notifications')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      type,
      title,
      body: message,
      data: metadata ?? {},
    })
    .select('id')
    .single();

  if (insertErr) {
    return { notificationId: null, emailSent: false, error: insertErr.message };
  }

  return { notificationId: data?.id ?? null, emailSent: false, error: null };
}

/**
 * Notify family when a registration is approved.
 */
export async function notifyRegistrationApproved(params: {
  tenantId: string;
  studentName: string;
  studentEmail: string;
  parentUserId: string;
  registrationId: string;
}): Promise<NotifyResult> {
  const { tenantId, studentName, parentUserId, registrationId } = params;

  const result = await createNotification({
    tenantId,
    userId: parentUserId,
    type: 'registration_approved',
    title: 'Registration Approved',
    message: `${studentName}'s registration has been approved. Welcome to the program!`,
    metadata: { registrationId, studentName },
  });

  // Best-effort email via EF
  try {
    const { data: { session } } = await supabaseUntyped.auth.getSession();
    if (session?.access_token) {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-template-email`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: params.studentEmail,
          template: 'registration-approved',
          data: { studentName },
        }),
      });
      result.emailSent = true;
    }
  } catch {
    // EF not deployed — notification still saved
  }

  return result;
}

/**
 * Notify parent when a grade is posted.
 */
export async function notifyGradePosted(params: {
  tenantId: string;
  studentName: string;
  parentUserId: string;
  courseName: string;
  assignmentName: string;
  score: number;
  maxScore: number;
  courseId: string;
}): Promise<NotifyResult> {
  const { tenantId, studentName, parentUserId, courseName, assignmentName, score, maxScore, courseId } = params;
  const pct = Math.round((score / maxScore) * 100);

  return createNotification({
    tenantId,
    userId: parentUserId,
    type: 'grade_posted',
    title: 'Grade Posted',
    message: `${studentName} received ${pct}% on "${assignmentName}" in ${courseName}`,
    metadata: { courseId, courseName, assignmentName, score, maxScore },
  });
}

/**
 * Notify parent when attendance is logged.
 */
export async function notifyAttendanceLogged(params: {
  tenantId: string;
  studentName: string;
  parentUserId: string;
  courseName: string;
  status: 'present' | 'absent' | 'excused' | 'tardy';
  classDate: string;
  courseId: string;
}): Promise<NotifyResult> {
  const { tenantId, studentName, parentUserId, courseName, status, classDate, courseId } = params;

  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

  return createNotification({
    tenantId,
    userId: parentUserId,
    type: 'attendance_logged',
    title: `Attendance: ${statusLabel}`,
    message: `${studentName} was ${status} in ${courseName} on ${classDate}`,
    metadata: { courseId, courseName, status, classDate },
  });
}

/**
 * Notify parent when a message is sent to their child.
 */
export async function notifyMessageSent(params: {
  tenantId: string;
  parentUserId: string;
  studentName: string;
  senderName: string;
  subject: string;
  channel: 'email' | 'sms' | 'in_app';
}): Promise<NotifyResult> {
  const { tenantId, parentUserId, studentName, senderName, subject, channel } = params;

  return createNotification({
    tenantId,
    userId: parentUserId,
    type: 'message_received',
    title: 'New Message',
    message: `${senderName} sent a message about ${studentName}: "${subject}"`,
    metadata: { studentName, senderName, channel },
  });
}
