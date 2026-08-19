// src/types/classes.ts
// Types for class browsing and enrollment (Row 95)

export type EnrollmentStatus = 'enrolled' | 'available' | 'waitlisted';

export interface ClassItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  platform: string;
  status: string;
  teacher_id: string;
  teacher_name: string | null;
  enrollment_status: EnrollmentStatus;
}

export interface ScheduleSlot {
  id: string;
  label: string | null;
  start_time: string;
  end_time: string;
  days_of_week: number[];
}
