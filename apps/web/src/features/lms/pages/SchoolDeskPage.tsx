// School Desk page — Row 37 scope
// Teacher/school workflow: view schedule slots, view enrolled students
// READ-ONLY per D22 (schedule writes are admin-only) and Ruling 2
// (report-card write is Office Desk only)
// Source: row-45-acceptance-checklist.md §1.3 (School Desk)

import { useEffect, useState } from 'react';
import { ScheduleSlotList } from '../components/ScheduleSlotList';
import { StudentList } from '../components/StudentList';
import { supabase } from '../services/supabase';

interface Profile {
  id: string;
  name: string;
  role: string;
  tenant_id: string | null;
}

type ViewMode = 'schedule' | 'students';

export default function SchoolDeskPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('schedule');
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
        .select('id, name, role, tenant_id')
        .eq('id', user.id)
        .single();

      if (!cancelled) {
        if (profileError) {
          setError(profileError.message);
        } else if (profileData.role !== 'teacher' && profileData.role !== 'admin') {
          setError('Access denied. School Desk is for teachers and admins only.');
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

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <p>Loading School Desk...</p>
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
        <h1 style={styles.title}>School Desk</h1>
        <p style={styles.subtitle}>Schedule & Students — {profile.name}</p>
      </header>

      <nav style={styles.nav}>
        <button
          type="button"
          style={viewMode === 'schedule' ? styles.navButtonActive : styles.navButton}
          onClick={() => setViewMode('schedule')}
        >
          Schedule
        </button>
        <button
          type="button"
          style={viewMode === 'students' ? styles.navButtonActive : styles.navButton}
          onClick={() => setViewMode('students')}
        >
          Students
        </button>
      </nav>

      <main style={styles.main}>
        {viewMode === 'schedule' && <ScheduleSlotList tenantId={profile.tenant_id} />}
        {viewMode === 'students' && <StudentList tenantId={profile.tenant_id} />}
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
    backgroundColor: '#1a365d',
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
    backgroundColor: '#2d3748',
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
