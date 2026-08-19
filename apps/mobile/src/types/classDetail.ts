// src/types/classDetail.ts
// Types for class detail view (Row 97)

export interface ClassDetail {
  id: string;
  title: string;
  description: string | null;
  price: number;
  status: string;
  type: string;
  platform: string;
  teacher_id: string;
  teacher_name: string | null;
  enrollment_status: 'enrolled' | 'available' | 'waitlisted';
  chapters: CurriculumChapter[];
  schedule: ScheduleSlotDetail[];
  materials: MaterialItem[];
}

export interface CurriculumChapter {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
}

export interface ScheduleSlotDetail {
  id: string;
  label: string | null;
  start_time: string;
  end_time: string;
  days_of_week: number[];
}

export interface MaterialItem {
  id: string;
  title: string;
  type: 'document' | 'video' | 'link' | 'assignment';
  url?: string;
  description?: string;
}
