// School Desk page — Row 67 scope
// Reworked: registration intake, list, and detail views
// Teacher workflow: create registrations, submit for review, withdraw

import { useEffect, useState } from 'react';
import { RegistrationIntakeForm } from '../components/RegistrationIntakeForm';
import { RegistrationList } from '../components/RegistrationList';
import { RegistrationDetail } from '../components/RegistrationDetail';
import { supabase } from '../services/supabase';
import type { Registration } from '../services/supabase';

interface Profile {
  id: string;
  name: string;
  role: string;
  tenant_id: string | null;
}

type ViewMode = 'intake' | 'list' | 'detail';

export default function SchoolDeskPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRegistration, setSelectedRegistration] =
    useState<Registration | null>(null);
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
        } else if (
          profileData.role !== 'teacher' &&
          profileData.role !== 'admin'
        ) {
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

  function handleSelectRegistration(reg: Registration) {
    setSelectedRegistration(reg);
    setViewMode('detail');
  }

  function handleBackToList() {
    setSelectedRegistration(null);
    setViewMode('list');
  }

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
        <p style={styles.subtitle}>Registration Management — {profile.name}</p>
      </header>

      <nav style={styles.nav}>
        <button
          type="button"
          style={viewMode === 'intake' ? styles.navButtonActive : styles.navButton}
          onClick={() => setViewMode('intake')}
        >
          New Registration
        </button>
        <button
          type="button"
          style={viewMode === 'list' ? styles.navButtonActive : styles.navButton}
          onClick={() => setViewMode('list')}
        >
          Registrations
        </button>
        {selectedRegistration && (
          <button
            type="button"
            style={viewMode === 'detail' ? styles.navButtonActive : styles.navButton}
            onClick={() => setViewMode('detail')}
          >
            Detail
          </button>
        )}
      </nav>

      <main style={styles.main}>
        {viewMode === 'intake' && profile.tenant_id && (
          <RegistrationIntakeForm
            tenantId={profile.tenant_id}
            onSuccess={() => setViewMode('list')}
          />
        )}
        {viewMode === 'list' && profile.tenant_id && (
          <RegistrationList
            tenantId={profile.tenant_id}
            onSelect={handleSelectRegistration}
          />
        )}
        {viewMode === 'detail' && selectedRegistration && (
          <RegistrationDetail
            registrationId={selectedRegistration.id}
            onBack={handleBackToList}
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
