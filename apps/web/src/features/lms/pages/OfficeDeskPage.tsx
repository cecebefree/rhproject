// Office Desk page — Row 78 Invoices tab + Row 53 Registrations + Row 27 Billing
// Row 3: URL-based routing with nested routes
// Row 2: Search & Filtering integration

import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { DeskBreadcrumb } from '../../../components/DeskBreadcrumb';
import { useNavigateTo } from '../../../hooks/useNavigateTo';
import { DESK_TAB_LABELS, type DeskTab } from '../../../hooks/useRouting';
import { ArchiveReport } from '../../front-desk/components/ArchiveReport';
import { InvoiceCreate } from '../../office-desk/components/InvoiceCreate';
import { InvoiceDetail } from '../../office-desk/components/InvoiceDetail';
import { InvoiceList } from '../../office-desk/components/InvoiceList';
import { SubscriptionManager } from '../../office-desk/components/SubscriptionManager';
import { SearchBar } from '../../office-desk/components/SearchBar';
import { AdvancedFilterPanel } from '../../office-desk/components/AdvancedFilterPanel';
import { useSearch } from '../../../hooks/useSearch';
import { NotificationCenter } from '../../../components/NotificationCenter';
import { supabase } from '../services/supabase';

interface Profile {
  id: string;
  name: string;
  role: string;
  tenant_id: string | null;
}

/**
 * OfficeDeskPage now uses URL-based routing via <Outlet />.
 * Tab navigation is handled by child routes.
 * This component provides the shell: header, nav, and breadcrumb.
 */
export default function OfficeDeskPage() {
  const { deskId } = useParams<{ deskId: string }>();
  const navigate = useNavigate();
  const { navigateToDeskTab } = useNavigateTo();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Determine current tab from URL
  const location = window.location.pathname;
  const basePattern = `/lms/office-desk/${deskId ?? ''}`;
  const pathSuffix = location.replace(basePattern, '').replace(/^\//, '');
  const firstSegment = pathSuffix.split('/')[0] as DeskTab;
  const activeTab: DeskTab = DESK_TAB_LABELS[firstSegment] ? firstSegment : 'leads';

  // Search functionality
  const searchHook = useSearch({
    tenantId: deskId || '',
    userId: profile?.id || '',
    defaultEntityType: 'all',
  });

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

  // If no deskId in URL, redirect to leads tab with profile's tenant
  useEffect(() => {
    if (!loading && profile?.tenant_id && !deskId) {
      navigate(`/lms/office-desk/${profile.tenant_id}/leads`, { replace: true });
    }
  }, [loading, profile, deskId, navigate]);

  const handleTabChange = (tab: DeskTab) => {
    if (deskId) {
      navigateToDeskTab(deskId, tab);
    }
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={styles.title}>Office Desk</h1>
            <p style={styles.subtitle}>Billing &amp; Administration — {profile.name}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {deskId && profile && (
              <div style={{ flex: 1, maxWidth: '500px' }}>
                <SearchBar
                  query={searchHook.query}
                  entityType={searchHook.entityType}
                  suggestions={searchHook.suggestions}
                  searchHistory={searchHook.searchHistory}
                  loadingSuggestions={searchHook.loadingSuggestions}
                  onQueryChange={searchHook.setQuery}
                  onSearch={searchHook.executeSearch}
                  onEntityTypeChange={searchHook.setEntityType}
                  onFetchSuggestions={searchHook.fetchSuggestions}
                  onApplyHistory={searchHook.applySavedSearch}
                  onQuickFilter={(filters) => {
                    searchHook.setFilters(filters as Record<string, unknown>);
                    searchHook.executeSearch({ filters: filters as Record<string, unknown> });
                  }}
                  onShowFilters={() => setShowFilters(!showFilters)}
                  hasActiveFilters={Object.keys(searchHook.filters).length > 0}
                />
              </div>
            )}
            <NotificationCenter userId={profile.id} />
          </div>
        </div>
      </header>

      {/* Advanced Filters Panel */}
      {showFilters && deskId && profile && (
        <AdvancedFilterPanel
          entityType={searchHook.entityType}
          filters={searchHook.filters}
          onFiltersChange={searchHook.setFilters}
          onApply={searchHook.executeSearch}
          onClear={() => {
            searchHook.setFilters({});
            searchHook.executeSearch({ filters: {} });
          }}
          onClose={() => setShowFilters(false)}
        />
      )}

      <nav style={styles.nav}>
        {(Object.keys(DESK_TAB_LABELS) as DeskTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            style={activeTab === tab ? styles.navButtonActive : styles.navButton}
            onClick={() => handleTabChange(tab)}
          >
            {DESK_TAB_LABELS[tab]}
          </button>
        ))}
      </nav>

      {deskId && (
        <div style={styles.breadcrumbContainer}>
          <DeskBreadcrumb deskName="Office Desk" tabLabel={DESK_TAB_LABELS[activeTab]} />
        </div>
      )}

      <main style={styles.main}>
        {/* Render child routes via Outlet, or fallback to default views */}
        {deskId ? (
          <Outlet context={{ tenantId: profile.tenant_id, deskId }} />
        ) : (
          <div style={styles.loading}>Loading...</div>
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
  breadcrumbContainer: {
    padding: '12px 24px 0',
    backgroundColor: 'white',
    borderBottom: '1px solid #e2e8f0',
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
