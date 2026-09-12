import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../../components/AdminLayout';
import { supabaseUntyped as supabase } from '../services/supabase';
import SchoolDeskNewsPage from './SchoolDeskNewsPage';
import SchoolDeskCommunicationPage from './SchoolDeskCommunicationPage';

type MainTab = 'students' | 'attendance' | 'programs' | 'messages' | 'news' | 'communications';
type SubTab = 'all' | 'active' | 'inactive' | 'new' | 'graduated';

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'students', label: 'STUDENTS' },
  { key: 'attendance', label: 'ATTENDANCE' },
  { key: 'programs', label: 'PROGRAMS' },
  { key: 'news', label: 'NEWS' },
  { key: 'communications', label: 'COMMUNICATIONS' },
  { key: 'messages', label: 'MESSAGES' },
];

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'all', label: 'All Students' },
  { key: 'active', label: 'Active' },
  { key: 'new', label: 'New Admissions' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'graduated', label: 'Graduated' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#D1FAE5', text: '#065F46' },
  inactive: { bg: '#FEF3C7', text: '#92400E' },
  new: { bg: '#DBEAFE', text: '#1E40AF' },
  graduated: { bg: '#E9D5FF', text: '#6B21A8' },
};

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  grade: string;
  enrollment_status: string;
  email?: string;
  enrollment_date: string;
  academic_group_id: string;
  created_at: string;
}

export default function SchoolDeskPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>('students');
  const [subTab, setSubTab] = useState<SubTab>('all');
  const [search, setSearch] = useState('');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrollCourseId, setEnrollCourseId] = useState('');
  const [enrollNotes, setEnrollNotes] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('students')
      .select('*')
      .eq('tenant_id', import.meta.env.VITE_DEFAULT_TENANT_ID)
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setStudents((data ?? []) as Student[]);
    }
    setLoading(false);
  }, []);

  const fetchPrograms = useCallback(async () => {
    const { data } = await supabase
      .from('school_desk.programs')
      .select('id, title')
      .eq('tenant_id', import.meta.env.VITE_DEFAULT_TENANT_ID)
      .in('status', ['published', 'active'])
      .order('title');
    if (data) setPrograms(data as { id: string; title: string }[]);
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchPrograms();
  }, [fetchStudents, fetchPrograms]);

  async function handleEnroll() {
    if (!enrollStudentId || !enrollCourseId) return;
    setEnrolling(true);
    setEnrollError(null);
    setEnrollSuccess(false);

    const { data, error } = await supabase.rpc('enroll_student_manual' as never, {
      p_student_id: enrollStudentId,
      p_course_id: enrollCourseId,
      p_tenant_id: import.meta.env.VITE_DEFAULT_TENANT_ID,
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
        fetchStudents();
      }
    }
  }

  const filtered = students.filter((s) => {
    const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
    const matchesSearch =
      !search ||
      fullName.includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      subTab === 'all' ||
      (subTab === 'active' && s.enrollment_status === 'active') ||
      (subTab === 'inactive' && s.enrollment_status === 'inactive') ||
      (subTab === 'new' && s.enrollment_status === 'new') ||
      (subTab === 'graduated' && s.enrollment_status === 'graduated');
    return matchesSearch && matchesStatus;
  });

  const handleTabClick = (tab: MainTab) => {
    if (tab === 'attendance') {
      navigate('/service/school-desk/attendance');
    } else if (tab === 'messages') {
      navigate('/service/school-desk/chat');
    } else {
      setMainTab(tab);
    }
  };

  return (
    <AdminLayout activeDesk="school-desk">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2
            className="mb-1"
            style={{
              fontFamily: '"EB Garamond", serif',
              fontSize: '36px',
              lineHeight: '44px',
              fontWeight: 500,
              color: '#273946',
              letterSpacing: '-0.01em',
            }}
          >
            School Desk
          </h2>
          <p style={{ fontSize: '14px', lineHeight: '20px', color: '#54626C' }}>
            Students, enrollment, and program management.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => fetchStudents()}
            className="px-4 py-2 rounded flex items-center gap-2 transition-colors"
            style={{
              border: '1px solid #273946',
              color: '#273946',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              fontFamily: '"Source Sans 3", sans-serif',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(39,57,70,0.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              filter_list
            </span>
            Filter
          </button>
          <button
            type="button"
            onClick={() => setShowEnrollModal(true)}
            className="px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors"
            style={{
              backgroundColor: '#273946',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              fontFamily: '"Source Sans 3", sans-serif',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#112430';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#273946';
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              add
            </span>
            Enroll Student
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="overflow-x-auto shrink-0">
        <nav className="flex" style={{ borderBottom: '1px solid rgba(39,57,70,0.1)' }}>
          {MAIN_TABS.map((tab) => {
            const isActive = tab.key === mainTab;
            return (
              <button
                type="button"
                key={tab.key}
                onClick={() => handleTabClick(tab.key)}
                className="px-6 py-3 whitespace-nowrap transition-colors relative"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  fontFamily: '"Source Sans 3", sans-serif',
                  color: isActive ? '#273946' : '#54626C',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  borderTop: isActive ? '1px solid rgba(39,57,70,0.1)' : '1px solid transparent',
                  borderLeft: isActive ? '1px solid rgba(39,57,70,0.1)' : '1px solid transparent',
                  borderRight: isActive ? '1px solid rgba(39,57,70,0.1)' : '1px solid transparent',
                  borderRadius: isActive ? '0.25rem 0.25rem 0 0' : undefined,
                  zIndex: isActive ? 10 : undefined,
                }}
              >
                {isActive && (
                  <span
                    className="absolute top-0 left-0 w-full h-1"
                    style={{ backgroundColor: '#E8A020' }}
                  />
                )}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sub Tabs */}
      <div
        className="flex items-center gap-6 overflow-x-auto shrink-0 pb-1"
        style={{ borderBottom: '1px solid rgba(195,199,204,0.2)' }}
      >
        {SUB_TABS.map((tab) => {
          const isActive = tab.key === subTab;
          return (
            <button
              type="button"
              key={tab.key}
              onClick={() => setSubTab(tab.key)}
              className="whitespace-nowrap py-3 px-1 transition-colors"
              style={{
                fontFamily: '"EB Garamond", serif',
                fontSize: '14px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#273946' : '#54626C',
                borderBottom: isActive ? '2px solid #E8A020' : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 shrink-0">
        <div className="relative flex-1">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2"
            style={{ fontSize: '18px', color: '#54626C' }}
          >
            search
          </span>
          <input
            type="text"
            placeholder="Search students by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg"
            style={{
              border: '1px solid rgba(195,199,204,0.5)',
              backgroundColor: '#ffffff',
              color: '#1A242B',
              fontFamily: '"Source Sans 3", sans-serif',
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-12">
        {mainTab === 'news' && <SchoolDeskNewsPage />}
        {mainTab === 'communications' && <SchoolDeskCommunicationPage />}
        {mainTab !== 'news' && mainTab !== 'communications' && (
          <>
            {loading && (
              <div
                className="flex items-center justify-center rounded-xl mt-4"
                style={{
                  border: '1px solid rgba(195,199,204,0.3)',
                  backgroundColor: '#ffffff',
                  minHeight: '400px',
                }}
              >
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-8 h-8 border-3 border-[#E8A020] border-t-transparent rounded-full animate-spin"
                  />
                  <p className="text-sm" style={{ color: '#54626C' }}>
                    Loading students...
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: '#FEF2F2', border: '1px solid rgba(220,38,38,0.2)' }}>
                <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>
              </div>
            )}

            {!loading && !error && (
              <div
                className="mt-4 rounded-xl overflow-hidden"
                style={{ border: '1px solid rgba(195,199,204,0.3)', backgroundColor: '#ffffff' }}
              >
                <div
                  className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: '#F8F7F4',
                    borderBottom: '1px solid rgba(195,199,204,0.3)',
                    color: '#54626C',
                    fontSize: '11px',
                    letterSpacing: '0.12em',
                    fontFamily: '"Source Sans 3", sans-serif',
                  }}
                >
                  <div className="col-span-4">Student</div>
                  <div className="col-span-2">Grade</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Enrolled</div>
                  <div className="col-span-2">Program</div>
                </div>

                <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
                  {filtered.length === 0 ? (
                    <div className="p-8 text-center">
                      <span
                        className="material-symbols-outlined block mx-auto mb-3"
                        style={{ fontSize: '48px', color: '#C7C7CC' }}
                      >
                        school
                      </span>
                      <p className="text-sm" style={{ color: '#54626C' }}>
                        No students found
                      </p>
                    </div>
                  ) : (
                    filtered.map((student) => {
                      const statusColor = STATUS_COLORS[student.enrollment_status] || STATUS_COLORS.active;
                      return (
                        <button
                          type="button"
                          key={student.id}
                          onClick={() => navigate(`/service/school-desk/student/${student.id}`)}
                          className="grid grid-cols-12 gap-4 px-4 py-3 text-left w-full transition-colors"
                          style={{
                            borderBottom: '1px solid rgba(195,199,204,0.15)',
                            background: 'transparent',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(248,247,244,0.5)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                          }}
                        >
                          <div className="col-span-4">
                            <p className="text-sm font-medium" style={{ color: '#1A242B' }}>
                              {student.first_name} {student.last_name}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: '#54626C' }}>
                              {student.email || 'No email'}
                            </p>
                          </div>

                          <div className="col-span-2 flex items-center">
                            <span className="text-sm" style={{ color: '#54626C' }}>
                              {student.grade || '—'}
                            </span>
                          </div>

                          <div className="col-span-2 flex items-center">
                            <span
                              className="text-xs px-2 py-1 rounded font-medium"
                              style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
                            >
                              {student.enrollment_status}
                            </span>
                          </div>

                          <div className="col-span-2 flex items-center">
                            <span className="text-sm" style={{ color: '#54626C' }}>
                              {student.enrollment_date
                                ? new Date(student.enrollment_date).toLocaleDateString()
                                : '—'}
                            </span>
                          </div>

                          <div className="col-span-2 flex items-center">
                            <span className="text-sm" style={{ color: '#54626C' }}>
                              {student.academic_group_id ? 'Assigned' : '—'}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-md rounded-xl shadow-xl p-6"
            style={{ backgroundColor: '#ffffff', border: '1px solid rgba(195,199,204,0.3)' }}
          >
            <h3
              className="text-lg font-semibold mb-4"
              style={{ fontFamily: '"EB Garamond", serif', color: '#1A242B' }}
            >
              Enroll Student in Program
            </h3>

            {enrollError && (
              <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                {enrollError}
              </div>
            )}
            {enrollSuccess && (
              <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: '#D1FAE5', color: '#065F46', border: '1px solid rgba(34,197,94,0.2)' }}>
                Student enrolled successfully!
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="enroll-student" className="block text-xs font-medium mb-1" style={{ color: '#54626C' }}>
                  Student
                </label>
                <select
                  id="enroll-student"
                  value={enrollStudentId}
                  onChange={(e) => setEnrollStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid rgba(195,199,204,0.5)', color: '#1A242B' }}
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
                <label htmlFor="enroll-course" className="block text-xs font-medium mb-1" style={{ color: '#54626C' }}>
                  Program / Subject
                </label>
                <select
                  id="enroll-course"
                  value={enrollCourseId}
                  onChange={(e) => setEnrollCourseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid rgba(195,199,204,0.5)', color: '#1A242B' }}
                >
                  <option value="">Select program...</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="enroll-notes" className="block text-xs font-medium mb-1" style={{ color: '#54626C' }}>
                  Notes (optional)
                </label>
                <input
                  id="enroll-notes"
                  type="text"
                  value={enrollNotes}
                  onChange={(e) => setEnrollNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid rgba(195,199,204,0.5)', color: '#1A242B' }}
                  placeholder="e.g. Payment reference..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowEnrollModal(false);
                  setEnrollStudentId('');
                  setEnrollCourseId('');
                  setEnrollNotes('');
                  setEnrollError(null);
                  setEnrollSuccess(false);
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: '#54626C', border: '1px solid rgba(195,199,204,0.5)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEnroll}
                disabled={!enrollStudentId || !enrollCourseId || enrolling}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#273946' }}
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
