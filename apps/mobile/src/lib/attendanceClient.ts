// attendanceClient.ts — Fetch attendance data for mobile

import { supabase } from '../services/supabase';

export interface AttendanceRecord {
  id: string;
  course_id: string;
  course_title?: string;
  class_date: string;
  status: 'present' | 'absent' | 'excused';
  notes: string | null;
}

export async function fetchStudentAttendance(studentId?: string): Promise<AttendanceRecord[]> {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error('Not authenticated');

  // If no studentId provided, get current user's ID (student viewing own attendance)
  const targetStudentId = studentId || user.id;

  const { data: attendance, error: attErr } = await supabase
    .from('school_desk.attendance')
    .select('id, course_id, class_date, status, notes')
    .eq('student_id', targetStudentId)
    .order('class_date', { ascending: false })
    .limit(30);

  if (attErr) throw attErr;

  // Get course titles
  const courseIds = [...new Set(attendance?.map(a => a.course_id) || [])];
  const { data: courses } = await supabase
    .from('school_desk.courses')
    .select('id, title')
    .in('id', courseIds);

  const courseMap = new Map(courses?.map(c => [c.id, c.title]) || []);

  return attendance?.map(a => ({
    ...a,
    course_title: courseMap.get(a.course_id) || 'Unknown',
  })) || [];
}

export async function getAttendanceStats(records: AttendanceRecord[]): Promise<{
  total: number;
  present: number;
  absent: number;
  excused: number;
  rate: number;
}> {
  const total = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const excused = records.filter(r => r.status === 'excused').length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;
  return { total, present, absent, excused, rate };
}
