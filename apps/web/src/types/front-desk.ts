export interface Inquiry {
  id: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  age_or_child_age?: number | string;
  program_interest?: string;
  enrollment_status?: string;
  timezone?: string;
  language?: string;
  ai_category?: 'hot_lead' | 'warm' | 'nurture' | 'blocked' | null;
  call_scheduled_at?: string | null;
  call_outcome?: string | null;
}

export interface DashboardMetrics {
  inquiries_received?: number;
  avg_response_time_seconds?: number;
  callbacks_scheduled?: number;
  show_rate_percent?: number;
  conversion_percent?: number;
}

export interface TimelineEvent {
  id: string;
  type: string;
  timestamp: string;
}

export interface TimelineEntry {
  desk?: string;
  action?: string;
  ts?: string;
  performed_by?: string;
  notes?: string;
}

export interface ActivityLogEntry {
  id: string;
  activity: string;
  timestamp: string;
}

export interface CommunicationLogEntry {
  id: string;
  message: string;
  timestamp: string;
}

export interface StaffProfile {
  id: string;
  name: string;
  email: string;
}
