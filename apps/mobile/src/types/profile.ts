// src/types/profile.ts
// Types for student profile screen (Row 98)

export interface StudentProfile {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  curriculum: string | null;
  grade: string | null;
  stage: string | null;
  intake: string | null;
  created_at: string;
}

export interface EnrolledClass {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  type: string;
  platform: string;
  teacher_name: string | null;
  enrolled_at: string;
  is_active: boolean;
  next_class: {
    label: string | null;
    start_time: string;
    end_time: string;
    days_of_week: number[];
  } | null;
  grade: number | null;
  attendance_pct: number | null;
  status: 'active' | 'completed' | 'waitlisted';
}

export interface RegistrationRecord {
  id: string;
  student_name: string;
  student_email: string;
  course_name: string | null;
  status:
    | 'pending_init'
    | 'pending_review'
    | 'pending_payment'
    | 'approved'
    | 'active'
    | 'withdrawn'
    | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'failed' | 'refunded';
  payment_method: string | null;
  reference: string | null;
  paid_at: string | null;
  created_at: string;
  description: string | null;
  invoice_number: string | null;
}

export interface GradeRecord {
  course_id: string;
  course_title: string;
  avg_score: number | null;
  max_score: number | null;
  assignment_count: number;
}

export interface AttendanceRecord {
  course_id: string;
  course_title: string;
  total_sessions: number;
  present_count: number;
  attendance_pct: number;
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAY_LABELS: Record<DayOfWeek, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

export const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  pending_init: 'Not Started',
  pending_review: 'Under Review',
  pending_payment: 'Awaiting Payment',
  approved: 'Approved',
  active: 'Active',
  withdrawn: 'Withdrawn',
  rejected: 'Rejected',
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: '#f39c12',
  confirmed: '#27ae60',
  failed: '#e74c3c',
  refunded: '#3498db',
};
