// TeacherDashboardPage — teacher-facing view: my programs, students, quick actions

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../../components/AdminLayout';
import { supabase } from '../services/supabase';

interface Profile {
  id: string;
  name: string;
  role: string;
  tenant_id: string | null;
}

interface Course {
  id: string;
  title: string;
  status: string;
  student_count?: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  grade: string;
  course_title: string;
}

export default function TeacherDashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [programs, setPrograms] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    const { data: p, error: pErr } = await supabase
      .from('profiles')
      .select('id, name, role, tenant_id')
      .eq('id', user.id)
      .single();

    if (pErr || !p) {
      setError('Profile not found');
      setLoading(false);
      return;
    }

    if (p.role !== 'teacher' && p.role !== 'admin') {
      setError('Access denied. Teacher role required.');
      setLoading(false);
      return;
    }

    setProfile(p);

    // Load programs assigned to this teacher
    const { data: coursesData } = await supabase
      .from('school_desk.programs')
      .select('id, title, status')
      .eq('teacher_id', user.id)
      .in('status', ['published', 'active']);

    setPrograms((coursesData ?? []) as unknown as Course[]);

    // Load students enrolled in teacher's programs
    if (coursesData && coursesData.length > 0) {
      const courseIds = coursesData.map((c: any) => c.id);
      const { data: studentsData } = await supabase
        .from('student_class')
        .select('student_id, profiles!student_id(name, email, grade), programs!class_id(title)')
        .in('class_id', courseIds)
        .is('deleted_at', null);

      const mapped = (studentsData ?? []).map((row: any) => ({
        id: row.student_id,
        name: row.profiles?.name ?? 'Unknown',
        email: row.profiles?.email ?? '',
        grade: row.profiles?.grade ?? '',
        course_title: row.programs?.title ?? '',
      }));

      setStudents(mapped);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <AdminLayout activeDesk="school-desk">
        <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
          <p className="text-sm" style={{ color: '#54626C' }}>Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout activeDesk="school-desk">
        <div className="p-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Group students by course
  const studentsByCourse = students.reduce<Record<string, Student[]>>((acc, s) => {
    if (!acc[s.course_title]) acc[s.course_title] = [];
    acc[s.course_title].push(s);
    return acc;
  }, {});

  return (
    <AdminLayout activeDesk="school-desk">
      <div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: '"EB Garamond", serif', color: '#1A242B' }}>
          Teacher Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: '#54626C' }}>
          Welcome back, {profile?.name}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="p-4 rounded-xl" style={{ border: '1px solid rgba(195,199,204,0.3)', backgroundColor: '#ffffff' }}>
          <p className="text-sm" style={{ color: '#54626C' }}>My Core Curriculums</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: '#1A242B' }}>{programs.length}</p>
        </div>
        <div className="p-4 rounded-xl" style={{ border: '1px solid rgba(195,199,204,0.3)', backgroundColor: '#ffffff' }}>
          <p className="text-sm" style={{ color: '#54626C' }}>Total Students</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: '#1A242B' }}>{students.length}</p>
        </div>
        <div className="p-4 rounded-xl" style={{ border: '1px solid rgba(195,199,204,0.3)', backgroundColor: '#ffffff' }}>
          <p className="text-sm" style={{ color: '#54626C' }}>Active Classes</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: '#1A242B' }}>{programs.length}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => navigate('/service/school-desk/attendance')}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: '#2563EB' }}
        >
          Mark Attendance
        </button>
      </div>

      {/* Courses */}
      <div className="mt-6 rounded-xl p-4" style={{ border: '1px solid rgba(195,199,204,0.3)', backgroundColor: '#ffffff' }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: '#1A242B' }}>
          My Core Curriculums ({programs.length})
        </h2>
        {programs.length === 0 ? (
          <p className="text-sm" style={{ color: '#54626C' }}>No programs assigned</p>
        ) : (
          <div className="space-y-2">
            {programs.map((course) => (
              <div key={course.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{course.title}</p>
                  <p className="text-xs" style={{ color: '#54626C' }}>
                    {studentsByCourse[course.title]?.length ?? 0} students
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
                  {course.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Students by Course */}
      <div className="mt-6 rounded-xl p-4" style={{ border: '1px solid rgba(195,199,204,0.3)', backgroundColor: '#ffffff' }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: '#1A242B' }}>
          Students ({students.length})
        </h2>
        {students.length === 0 ? (
          <p className="text-sm" style={{ color: '#54626C' }}>No students enrolled in your programs</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(studentsByCourse).map(([courseTitle, courseStudents]) => (
              <div key={courseTitle}>
                <h3 className="text-xs font-semibold mb-2" style={{ color: '#54626C' }}>{courseTitle}</h3>
                <div className="space-y-1">
                  {courseStudents.map((student) => (
                    <div key={student.id} className="flex justify-between items-center p-2 rounded hover:bg-gray-50">
                      <div>
                        <p className="text-sm">{student.name}</p>
                        <p className="text-xs" style={{ color: '#54626C' }}>{student.email}</p>
                      </div>
                      <span className="text-xs" style={{ color: '#54626C' }}>{student.grade}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
