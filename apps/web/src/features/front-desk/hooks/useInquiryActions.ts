import { useState } from 'react';
import { supabase } from '../services/supabase';
import { showToast } from '../utils/notifications';

function parseSupabaseError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('duplicate key')) return 'This record already exists';
    if (error.message.includes('foreign key')) return 'Referenced record not found';
    if (error.message.includes('permission denied')) return 'You do not have permission to perform this action';
    if (error.message.includes('401')) return 'Authentication required. Please log in again.';
    return error.message;
  }
  return 'An unknown error occurred';
}

interface TakeInquiryPayload {
  inquiry_id: string;
  counselor_id: string;
}

interface ScheduleCallbackPayload {
  inquiry_id: string;
  scheduled_at: string;
  notes?: string;
}

interface SendEmailPayload {
  inquiry_id: string;
  subject: string;
  body: string;
  recipient_email: string;
}

interface EscalatePayload {
  inquiry_id: string;
  escalation_reason: string;
  escalation_target?: 'senior_counselor' | 'manager' | 'director';
}

export function useInquiryActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const takeInquiry = async (payload: TakeInquiryPayload) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.rpc('take_inquiry', {
        p_inquiry_id: payload.inquiry_id,
        p_counselor_id: payload.counselor_id,
      });
      if (err) throw err;

      await supabase.schema('front_desk').from('activity_log').insert({
        inquiry_id: payload.inquiry_id,
        desk: 'front',
        action: 'Inquiry Assigned',
        performed_by: payload.counselor_id,
        notes: `Assigned to counselor ${payload.counselor_id}`,
      });

      showToast('Inquiry assigned successfully', 'success');
      return data;
    } catch (err) {
      const message = parseSupabaseError(err);
      setError(message);
      showToast(message, 'error', 5000);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const scheduleCallback = async (payload: ScheduleCallbackPayload) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.rpc('schedule_callback', {
        p_inquiry_id: payload.inquiry_id,
        p_scheduled_at: payload.scheduled_at,
        p_notes: payload.notes || null,
      });
      if (err) throw err;

      await supabase.schema('front_desk').from('activity_log').insert({
        inquiry_id: payload.inquiry_id,
        desk: 'front',
        action: 'Callback Scheduled',
        performed_by: 'system',
        notes: `Callback scheduled for ${new Date(payload.scheduled_at).toLocaleString()}. ${payload.notes || ''}`,
      });

      showToast('Callback scheduled successfully', 'success');
      return data;
    } catch (err) {
      const message = parseSupabaseError(err);
      setError(message);
      showToast(message, 'error', 5000);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async (payload: SendEmailPayload) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.rpc('send_inquiry_email', {
        p_inquiry_id: payload.inquiry_id,
        p_subject: payload.subject,
        p_body: payload.body,
        p_recipient_email: payload.recipient_email,
      });
      if (err) throw err;

      await supabase.schema('front_desk').from('activity_log').insert({
        inquiry_id: payload.inquiry_id,
        desk: 'comms',
        action: 'Email Sent',
        performed_by: 'system',
        notes: `Email sent to ${payload.recipient_email}. Subject: ${payload.subject}`,
      });

      showToast('Email sent successfully', 'success');
      return data;
    } catch (err) {
      const message = parseSupabaseError(err);
      setError(message);
      showToast(message, 'error', 5000);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const escalateInquiry = async (payload: EscalatePayload) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.rpc('escalate_inquiry', {
        p_inquiry_id: payload.inquiry_id,
        p_escalation_reason: payload.escalation_reason,
        p_escalation_target: payload.escalation_target || 'manager',
      });
      if (err) throw err;

      await supabase.schema('front_desk').from('activity_log').insert({
        inquiry_id: payload.inquiry_id,
        desk: 'front',
        action: 'Escalated',
        performed_by: 'system',
        notes: `Escalated to ${payload.escalation_target || 'manager'}. Reason: ${payload.escalation_reason}`,
      });

      showToast('Inquiry escalated successfully', 'success');
      return data;
    } catch (err) {
      const message = parseSupabaseError(err);
      setError(message);
      showToast(message, 'error', 5000);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { takeInquiry, scheduleCallback, sendEmail, escalateInquiry, loading, error };
}
