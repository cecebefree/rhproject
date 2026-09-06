import { AdminLayout } from '../../../components/AdminLayout';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  grade: string;
  enrollment_status: string;
  email?: string;
  enrollment_date: string;
  academic_group_id: string;
}

interface Program {
  id: string;
  title: string;
  status: string;
  type: string;
}

export default function SchoolDeskPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState<string>('');
  const [enrollCourseId, setEnrollCourseId] = useState<string>('');
  const [enrollNotes, setEnrollNotes] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    const [studentsRes, programsRes] = await Promise.all([
      supabase.from('students').select('*').order('created_at', { ascending: false }),
      supabase.from('school_desk.programs').select('id, title, status, type').eq('status', 'published'),
    ]);

    if (studentsRes.error) {
      setError(studentsRes.error.message);
    } else {
      setStudents((studentsRes.data ?? []) as Student[]);
    }

    if (programsRes.data) {
      setPrograms((programsRes.data ?? []) as Program[]);
    }

    setLoading(false);
  }

  async function handleEnroll() {
    if (!enrollStudentId || !enrollCourseId) return;

    setEnrolling(true);
    setEnrollError(null);
    setEnrollSuccess(false);

    const { data, error } = await supabase.rpc('enroll_student_manual' as any, {
      p_student_id: enrollStudentId,
      p_course_id: enrollCourseId,
      p_tenant_id: '00000000-0000-0000-0000-000000000001',
      p_notes: enrollNotes || null,
    });

    setEnrolling(false);

    if (error) {
      setEnrollError(error.message);
    } else {
      const result = data?.[0];
      if (result?.status === 'already_enrolled') {
        setEnrollError('Student is already enrolled in this program');
      } else {
        setEnrollSuccess(true);
        setShowEnrollModal(false);
        setEnrollStudentId('');
        setEnrollCourseId('');
        setEnrollNotes('');
      }
    }
  }

  const filtered = students.filter((s) => {
    const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
    const matchesSearch = !search || fullName.includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || s.enrollment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = [...new Set(students.map((s) => s.enrollment_status).filter(Boolean))];

  return (
    <AdminLayout activeDesk="school-desk">
      <div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: '"EB Garamond", serif', color: '#1A242B' }}>
          School Desk
        </h1>
        <p className="text-sm mt-1" style={{ color: '#54626C' }}>
          Students, enrollment, and program management
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        <button
          onClick={() => setShowEnrollModal(true)}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: '#2563EB' }}
        >
          + Enroll Student
        </button>
        <button
          onClick={() => navigate('/service/school-desk/attendance')}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300"
        >
          Attendance
        </button>
        <button
          onClick={() => navigate('/service/school-desk/chat')}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300"
        >
          Messages
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center rounded-xl mt-4"
          style={{ border: '1px solid rgba(195,199,204,0.3)', backgroundColor: '#ffffff', minHeight: '400px' }}>
          <p className="text-sm" style={{ color: '#54626C' }}>Loading students...</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="mt-4 rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(195,199,204,0.3)', backgroundColor: '#ffffff' }}>
          <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
            {filtered.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm" style={{ color: '#54626C' }}>No students found</p>
              </div>
            ) : (
              filtered.map((student) => (
                <div
                  key={student.id}
                  onClick={() => navigate(`/service/school-desk/student/${student.id}`)}
                  className="p-4 border-b cursor-pointer hover:bg-gray-50"
                  style={{ borderColor: 'rgba(195,199,204,0.3)' }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#1A242B' }}>
                        {student.first_name} {student.last_name}
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#54626C' }}>
                        {student.email || 'No email'}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded"
                      style={{
                        backgroundColor: student.enrollment_status === 'active' ? '#D1FAE5' : '#FEF3C7',
                        color: student.enrollment_status === 'active' ? '#065F46' : '#92400E',
                      }}>
                      {student.enrollment_status}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs" style={{ color: '#54626C' }}>
                    {student.grade && <span>Grade: {student.grade}</span>}
                    {student.enrollment_date && (
                      <span>Joined: {new Date(student.enrollment_date).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold" style={{ color: '#1A242B' }}>
              Enroll Student in Program
            </h3>

            {enrollError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {enrollError}
              </div>
            )}
            {enrollSuccess && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                Student enrolled successfully!
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Student</label>
                <select
                  value={enrollStudentId}
                  onChange={(e) => setEnrollStudentId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="">Select student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Program / Subject</label>
                <select
                  value={enrollCourseId}
                  onChange={(e) => setEnrollCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="">Select program...</option>
                  {programs.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={enrollNotes}
                  onChange={(e) => setEnrollNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  placeholder="e.g. Payment reference..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  setEnrollStudentId('');
                  setEnrollCourseId('');
                  setEnrollNotes('');
                  setEnrollError(null);
                  setEnrollSuccess(false);
                }}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleEnroll}
                disabled={!enrollStudentId || !enrollCourseId || enrolling}
                className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: '#2563EB' }}
              >
                {enrolling ? 'Enrolling...' : 'Enroll'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
