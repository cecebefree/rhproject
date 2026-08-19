export interface Inquiry {
  id: string;
  created_at: string;
  updated_at: string;
  source: string | null;

  contact_email: string;
  contact_phone: string | null;
  contact_name: string;
  country_residence: string | null;
  timezone: string | null;
  language: string;

  age_or_child_age: number | null;
  program_interest: string | null;
  intake_group: string | null;
  message_body: string | null;

  email_consent_given: boolean;
  sms_consent_given: boolean;
  email_consent_timestamp: string | null;
  sms_consent_timestamp: string | null;

  ai_category: 'hot_lead' | 'warm' | 'nurture' | 'blocked' | null;
  ai_reasoning: string | null;
  ai_suggested_action: 'immediate_call' | 'schedule_callback' | 'nurture_email' | 'hold' | null;

  assigned_counselor_id: string | null;
  assigned_at: string | null;

  voip_call_logged: boolean;
  voip_number_called: string | null;
  call_scheduled_at: string | null;
  call_started_at: string | null;
  call_ended_at: string | null;
  call_duration_seconds: number | null;
  call_outcome: 'decision_yes' | 'decision_no' | 'pending_decision' | 'rescheduled' | 'no_show' | null;

  activity_log: unknown[];

  enrollment_status: 'pending' | 'offered' | 'declined' | 'awaiting_docs' | 'escalated' | 'archived';
  moved_to_office_desk_at: string | null;
  office_desk_owner_id: string | null;

  updated_by: string | null;
}

export interface ActivityLogEntry {
  id: string;
  inquiry_id: string;
  desk: string;
  action: string;
  timestamp: string;
  performed_by: string | null;
  data: Record<string, unknown>;
}

export interface CommunicationLogEntry {
  id: string;
  inquiry_id: string;
  desk: string;
  channel: 'email' | 'sms';
  recipient: string;
  subject: string | null;
  body: string | null;
  sent_at: string;
  delivery_status: 'sent' | 'bounced' | 'opened' | 'clicked' | 'failed';
}

export interface TimelineEvent {
  ts: string;
  desk: string;
  action: string;
  performed_by: string;
  notes: string | null;
  details: Record<string, unknown>;
}

export type TimelineEntry = TimelineEvent;

export interface StaffProfile {
  id: string;
  user_id: string | null;
  name: string;
  role: 'counselor' | 'manager' | 'admin';
  desk: 'front' | 'office' | 'school';
  timezone: string;
  language: string;
  max_capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  inquiries_received: number;
  avg_response_time_seconds: number | null;
  callbacks_scheduled: number;
  show_rate_percent: number | null;
  conversion_percent: number | null;
}
