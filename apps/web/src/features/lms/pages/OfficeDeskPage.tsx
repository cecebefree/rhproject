// Office Desk page — Row 38 scope
// Admin/office workflow: enter report cards, release to visible
// MVP scope per Ruling 2 (report-card write is Office Desk only)
// Source: row-45-acceptance-checklist.md §1.2 (Office Desk)

import { useEffect, useState } from 'react';
import { ReportCardForm } from '../components/ReportCardForm';
import { ReportCardList } from '../components/ReportCardList';
import { supabase } from '../services/supabase';

interface Profile {
  id: string;
  name: string;
  role: string;
  tenant_id: string | null;
}

type ViewMode = 'enter' | 'list';

export default function OfficeDeskPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('enter');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
        } else if (profileData.role !== 'office' && profileData.role !== 'admin') {
          setError('Access denied. Office Desk is for office and admin users only.');
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

  const handleSuccess = () => {
    setRefreshKey((k) => k + 1);
    setViewMode('list');
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <p>Loading Office Desk...</p>
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
        <h1 style={styles.title}>Office Desk</h1>
        <p style={styles.subtitle}>Report Cards — {profile.name}</p>
      </header>

      <nav style={styles.nav}>
        <button
          type="button"
          style={viewMode === 'enter' ? styles.navButtonActive : styles.navButton}
          onClick={() => setViewMode('enter')}
        >
          Enter Report Card
        </button>
        <button
          type="button"
          style={viewMode === 'list' ? styles.navButtonActive : styles.navButton}
          onClick={() => setViewMode('list')}
        >
          View Report Cards
        </button>
      </nav>

      <main style={styles.main}>
        {viewMode === 'enter' && (
          <ReportCardForm tenantId={profile.tenant_id} onSuccess={handleSuccess} />
        )}
        {viewMode === 'list' && (
          <ReportCardList tenantId={profile.tenant_id} refreshKey={refreshKey} />
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
    backgroundColor: '#4a5568',
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
