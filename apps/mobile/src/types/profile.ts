// src/types/profile.ts
// Types for 3 profile variations: Student, Adult, Teacher
// Tables: public.profiles, office_desk.students, office_desk.family_accounts,
//         office_desk.invoices, office_desk.payments

// ═══════════════════════════════════════════════════════════
// SHARED
// ═══════════════════════════════════════════════════════════

export type UserRole = 'student' | 'adult' | 'teacher' | 'staff' | 'admin';

export interface BaseProfile {
  id: string;
  name: string | null;
  surname: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  zone: number | null;
  nation: string | null;
  city: string | null;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// STUDENT PROFILE
// ═══════════════════════════════════════════════════════════

export interface StudentProfile extends BaseProfile {
  curriculum: string | null;
  current_stage: string | null;
  intake_group: string | null;
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
  section: string | null;
}

// ═══════════════════════════════════════════════════════════
// ADULT PROFILE
// ═══════════════════════════════════════════════════════════

export interface AdultProfile extends BaseProfile {
  family_account_id: string | null;
  family_account_status: string | null;
  family_account_created_at: string | null;
}

export interface ChildRecord {
  id: string;
  user_id: string;
  name: string | null;
  curriculum: string | null;
  current_stage: string | null;
  grade: string | null;
  intake_group: string | null;
  status: string | null;
}

export interface FamilyAccountDetail {
  id: string;
  status: string | null;
  family_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  bank_sort_code: string | null;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// TEACHER PROFILE
// ═══════════════════════════════════════════════════════════

export interface TeacherProfile extends BaseProfile {
  classes_taught: TeacherClass[];
}

export interface TeacherClass {
  course_id: string;
  title: string;
  type: string | null;
  platform: string | null;
  section: string | null;
  student_count: number;
  students: TeacherStudent[];
}

export interface TeacherStudent {
  id: string;
  name: string | null;
  email: string | null;
  grade: string | null;
}

// ═══════════════════════════════════════════════════════════
// INVOICES & PAYMENTS (shared by Adult)
// ═══════════════════════════════════════════════════════════

export interface InvoiceRecord {
  id: string;
  invoice_number: string | null;
  description: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  due_date: string | null;
  created_at: string;
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

// ═══════════════════════════════════════════════════════════
// REGISTRATION STATUS (Student)
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

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

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  pending: '#f39c12',
  paid: '#27ae60',
  overdue: '#e74c3c',
  cancelled: '#747474',
};
