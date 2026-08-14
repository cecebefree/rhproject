// Parent Portal Page — Row 75
// Read-only view of student progress for parents
// Auth gate: role='parent' only

import { useEffect, useState } from 'react';
import { ParentDashboard } from '../components/ParentDashboard';
import { ChildProgressView } from '../components/ChildProgressView';
import { CourseDetailView } from '../components/CourseDetailView';
import { AttendanceView } from '../components/AttendanceView';
import { TranscriptView } from '../components/TranscriptView';
import { supabase } from '../../lms/services/supabase';

interface Profile {
  id: string;
  name: string;
  role: string;
}

type ViewMode = 'dashboard' | 'progress' | 'course-detail' | 'attendance' | 'transcript';

export default function ParentPortalPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedChildName, setSelectedChildName] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCourseName, setSelectedCourseName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          setError('Not authenticated');
          setLoading(false);
        }
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', user.id)
        .single();

      if (!cancelled) {
        if (profileError) {
          setError(profileError.message);
        } else if (profileData.role !== 'parent') {
          setError('Access denied. Parent Portal is for parents and guardians only.');
        } else {
          setProfile(profileData);
        }
        setLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSelectChild(studentId: string, studentName: string) {
    setSelectedChildId(studentId);
    setSelectedChildName(studentName);
    setViewMode('progress');
  }

  function handleBackToDashboard() {
    setSelectedChildId(null);
    setSelectedChildName('');
    setViewMode('dashboard');
  }

  function handleViewCourse(courseId: string, courseName: string) {
    setSelectedCourseId(courseId);
    setSelectedCourseName(courseName);
    setViewMode('course-detail');
  }

  function handleBackToProgress() {
    setSelectedCourseId(null);
    setSelectedCourseName('');
    setViewMode('progress');
  }

  function handleViewAttendance() {
    setViewMode('attendance');
  }

  function handleViewTranscript() {
    setViewMode('transcript');
  }

  function handleBackFromAttendance() {
    setViewMode('progress');
  }

  function handleBackFromTranscript() {
    setViewMode('progress');
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <p>Loading Parent Portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h2>Unable to load</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h2>Access denied</h2>
          <p>Profile not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Parent Portal</h1>
        <p style={styles.subtitle}>Welcome, {profile.name}</p>
      </header>

      <nav style={styles.nav}>
        <button
          type="button"
          style={viewMode === 'dashboard' ? styles.navButtonActive : styles.navButton}
          onClick={handleBackToDashboard}
        >
          My Children
        </button>
        {selectedChildId && (
          <>
            <button
              type="button"
              style={viewMode === 'progress' ? styles.navButtonActive : styles.navButton}
              onClick={() => setViewMode('progress')}
            >
              {selectedChildName}'s Progress
            </button>
            <button
              type="button"
              style={viewMode === 'attendance' ? styles.navButtonActive : styles.navButton}
              onClick={handleViewAttendance}
            >
              Attendance
            </button>
            <button
              type="button"
              style={viewMode === 'transcript' ? styles.navButtonActive : styles.navButton}
              onClick={handleViewTranscript}
            >
              Transcript
            </button>
          </>
        )}
      </nav>

      <main style={styles.main}>
        {viewMode === 'dashboard' && (
          <ParentDashboard
            parentId={profile.id}
            onSelectChild={handleSelectChild}
          />
        )}

        {viewMode === 'progress' && selectedChildId && (
          <ChildProgressView
            studentId={selectedChildId}
            studentName={selectedChildName}
            onBack={handleBackToDashboard}
            onSelectCourse={handleViewCourse}
          />
        )}

        {viewMode === 'course-detail' && selectedCourseId && selectedChildId && (
          <CourseDetailView
            courseId={selectedCourseId}
            studentId={selectedChildId}
            courseTitle={selectedCourseName}
            onBack={handleBackToProgress}
          />
        )}

        {viewMode === 'attendance' && selectedChildId && (
          <AttendanceView
            studentId={selectedChildId}
            onBack={handleBackFromAttendance}
          />
        )}

        {viewMode === 'transcript' && selectedChildId && (
          <TranscriptView
            studentId={selectedChildId}
            studentName={selectedChildName}
            onBack={handleBackFromTranscript}
          />
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    backgroundColor: '#2d3748',
    color: 'white',
    padding: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    opacity: 0.9,
    margin: '0',
  },
  nav: {
    display: 'flex',
    backgroundColor: '#1a202c',
    padding: '0 24px',
    gap: '4px',
  },
  navButton: {
    padding: '12px 24px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#a0aec0',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    borderBottom: '2px solid transparent',
  },
  navButtonActive: {
    padding: '12px 24px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    borderBottom: '2px solid #4299e1',
  },
  main: {
    padding: '24px',
  },
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#718096',
  },
  error: {
    padding: '48px',
    textAlign: 'center',
    color: '#e53e3e',
  },
};
