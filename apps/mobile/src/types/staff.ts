// src/types/staff.ts
// Types for staff profiles (Front Desk counselors, managers, admins)
// Table: public.staff_profiles, public.staff_course

// ═══════════════════════════════════════════════════════════
// STAFF SUBTYPES
// ═══════════════════════════════════════════════════════════

/** Staff role within the Front Desk system */
export type StaffRole = 'counselor' | 'manager' | 'admin';

/** Desk assignment determines which inquiries a staff member handles */
export type StaffDesk = 'front' | 'office' | 'school';

// ═══════════════════════════════════════════════════════════
// STAFF PROFILE
// ═══════════════════════════════════════════════════════════

/** Staff profile record from public.staff_profiles */
export interface StaffProfile {
  id: string;
  user_id: string | null;
  name: string;
  role: StaffRole;
  desk: StaffDesk;
  timezone: string;
  language: string;
  max_capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════
// STAFF COURSE ASSIGNMENT
// ═══════════════════════════════════════════════════════════

/** Staff-course assignment from public.staff_course */
export interface StaffCourseAssignment {
  id: string;
  tenant_id: string;
  staff_id: string;
  course_id: string;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  counselor: 'Counselor',
  manager: 'Manager',
  admin: 'Admin',
};

export const STAFF_DESK_LABELS: Record<StaffDesk, string> = {
  front: 'Front Desk',
  office: 'Office',
  school: 'School',
};

export const STAFF_ROLE_COLORS: Record<StaffRole, string> = {
  counselor: '#3498db',
  manager: '#9b59b6',
  admin: '#e74c3c',
};
