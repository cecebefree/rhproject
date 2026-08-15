import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { LeadIntakeForm } from '../components/LeadIntakeForm';
import { LeadList } from '../components/LeadList';
import { LeadDetail } from '../components/LeadDetail';
import { LeadArchiveList } from '../components/LeadArchiveList';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

type Tab = 'intake' | 'leads' | 'archived';

export default function FrontDeskPage() {
  const [activeTab, setActiveTab] = useState<Tab>('leads');
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [deskId, setDeskId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchFocusRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id, desk_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        setError('Profile not found');
        setLoading(false);
        return;
      }

      setTenantId(profileData.tenant_id);
      setDeskId(profileData.desk_id);
      setLoading(false);
    }

    loadProfile();
  }, []);

  const handleNavigate = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setShowDetailModal(false);
    setSelectedLeadId(null);
  }, []);

  const handleSearchFocus = useCallback(() => {
    setActiveTab('leads');
    const w = window as unknown as Record<string, unknown>;
    const focusFn = w.__leadListFocusSearch;
    if (typeof focusFn === 'function') {
      setTimeout(() => focusFn(), 100);
    }
  }, []);

  useKeyboardShortcuts({ onNavigate: handleNavigate, onSearchFocus: handleSearchFocus });

  const handleLeadCreated = () => {
    setActiveTab('leads');
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    setShowDetailModal(true);
  };

  const handleEditLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    setShowDetailModal(true);
  };

  const handleBackFromDetail = () => {
    setSelectedLeadId(null);
    setShowDetailModal(false);
  };

  const handleArchived = () => {
    setSelectedLeadId(null);
    setShowDetailModal(false);
  };

  if (loading) return <div style={styles.loading}>Loading...</div>;
  if (error) return <div style={styles.error}>Error: {error}</div>;
  if (!tenantId) return <div style={styles.loading}>No tenant associated</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Front Desk</h1>
        <p style={styles.subtitle}>Lead Management</p>
      </header>

      <nav style={styles.nav}>
        <button
          type="button"
          style={activeTab === 'intake' ? styles.navButtonActive : styles.navButton}
          onClick={() => handleNavigate('intake')}
        >
          Intake
        </button>
        <button
          type="button"
          style={activeTab === 'leads' ? styles.navButtonActive : styles.navButton}
          onClick={() => handleNavigate('leads')}
        >
          Leads
        </button>
        <button
          type="button"
          style={activeTab === 'archived' ? styles.navButtonActive : styles.navButton}
          onClick={() => handleNavigate('archived')}
        >
          Archived
        </button>
      </nav>

      <main style={styles.main}>
        {activeTab === 'intake' && (
          <LeadIntakeForm tenantId={tenantId} onSuccess={handleLeadCreated} />
        )}
        {activeTab === 'leads' && (
          <LeadList
            tenantId={tenantId}
            onSelectLead={handleSelectLead}
            onEditLead={handleEditLead}
          />
        )}
        {activeTab === 'archived' && <LeadArchiveList tenantId={tenantId} />}
      </main>

      {showDetailModal && selectedLeadId && userId && deskId && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <LeadDetail
              leadId={selectedLeadId}
              deskId={deskId}
              userId={userId}
              onBack={handleBackFromDetail}
              onArchived={handleArchived}
            />
          </div>
        </div>
      )}
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
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
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
