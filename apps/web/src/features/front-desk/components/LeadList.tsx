import { useEffect, useRef, useState } from 'react';
import {
  LEAD_STATUSES,
  type Lead,
  type LeadStatus,
  selectArchivedCount,
  selectArchivedLeads,
  selectLeads,
  subscribeToLeads,
} from '../services/supabase';
import { BulkArchiveModal } from './BulkArchiveModal';
import { LeadFilterPanel, type LeadViewTab } from './LeadFilterPanel';
import { exportToCSV } from '../../office-desk/services/exportService';
import { ResponsiveTable, type SwipeableCard } from '../../../components/ResponsiveTable';
import { useResponsive } from '../../../components/MobileNav';
import { useBulkSelection } from '../../office-desk/components/BulkSelectionContext';

interface LeadListProps {
  tenantId: string;
  onSelectLead: (leadId: string) => void;
  onEditLead: (leadId: string) => void;
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  enquiry: 'Enquiry',
  qualified: 'Qualified',
  invoiced: 'Invoiced',
  handed_off: 'Handed Off',
};

export function LeadList({ tenantId, onSelectLead, onEditLead }: LeadListProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState<LeadViewTab>('active');
  const [archivedCount, setArchivedCount] = useState(0);
  const [showBulkArchiveModal, setShowBulkArchiveModal] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const { isMobile } = useResponsive();
  const { selectedIds, select, deselect, toggle, isSelected, selectAllOnPage, deselectAll, selectedCount } = useBulkSelection();

  const toggleSelectAll = () => {
    if (selectedCount === leads.length) {
      deselectAll();
    } else {
      selectAllOnPage(leads.map((l) => l.id));
    }
  };

  const loadLeads = async () => {
    setLoading(true);
    setError(null);

    if (activeTab === 'active') {
      const { data, error: fetchError } = await selectLeads(
        tenantId,
        search || undefined,
        (statusFilter as LeadStatus) || undefined,
        sourceFilter || undefined,
        dateFrom || undefined,
        dateTo || undefined
      );
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setLeads(data || []);
      }
    } else {
      const { data, error: fetchError } = await selectArchivedLeads(tenantId);
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setLeads(data || []);
      }
    }
    setLoading(false);
  };

  const loadArchivedCount = async () => {
    const { count } = await selectArchivedCount(tenantId);
    setArchivedCount(count || 0);
  };

  useEffect(() => {
    loadLeads();
  }, [tenantId, search, statusFilter, sourceFilter, dateFrom, dateTo, activeTab]);

  useEffect(() => {
    loadArchivedCount();
  }, [tenantId, activeTab]);

  useEffect(() => {
    const channel = subscribeToLeads((payload) => {
      if (payload.eventType === 'UPDATE') {
        setLeads((prev) => prev.map((lead) => (lead.id === payload.new.id ? payload.new : lead)));
      } else if (payload.eventType === 'INSERT') {
        if (activeTab === 'active') {
          setLeads((prev) => [payload.new, ...prev]);
        }
      } else if (payload.eventType === 'DELETE') {
        setLeads((prev) => prev.filter((lead) => lead.id !== payload.old?.id));
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [activeTab]);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setSourceFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const handleTabChange = (tab: LeadViewTab) => {
    setActiveTab(tab);
    deselectAll();
    handleResetFilters();
  };

  const focusSearch = () => {
    searchRef.current?.focus();
  };

  // Expose focusSearch via window for keyboard shortcut
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__leadListFocusSearch = focusSearch;
    return () => {
      const w = window as unknown as Record<string, unknown>;
      w.__leadListFocusSearch = undefined;
    };
  }, []);

  const handleBulkArchiveComplete = () => {
    deselectAll();
    setShowBulkArchiveModal(false);
    loadLeads();
    loadArchivedCount();
  };

  if (loading)
    return <div>{activeTab === 'active' ? 'Loading leads...' : 'Loading archived leads...'}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{activeTab === 'active' ? 'Leads' : 'Archived Leads'}</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={async () => {
              await exportToCSV({
                entity_type: 'leads',
                format: 'csv',
                tenant_id: tenantId,
                filters: {
                  ...(statusFilter ? { status: statusFilter } : {}),
                  ...(sourceFilter ? { source: sourceFilter } : {}),
                },
              });
            }}
            style={{
              padding: '6px 12px',
              background: '#38a169',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85em',
            }}
          >
            Export CSV
          </button>
          {activeTab === 'active' && selectedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowBulkArchiveModal(true)}
              style={{
                padding: '6px 12px',
                background: '#e53e3e',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.85em',
              }}
            >
              Archive ({selectedCount})
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ color: 'red', padding: '8px', background: '#fee', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <LeadFilterPanel
        search={search}
        statusFilter={statusFilter}
        sourceFilter={sourceFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        activeTab={activeTab}
        archivedCount={archivedCount}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
        onSourceChange={setSourceFilter}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onTabChange={handleTabChange}
        onReset={handleResetFilters}
      />

      {leads.length === 0 ? (
        <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '4px' }}>
          {activeTab === 'active' ? 'No leads found' : 'No archived leads'}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div style={{ overflowX: 'auto' }} className="hidden md:block">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                  {activeTab === 'active' && (
                    <th style={{ padding: '8px', width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={leads.length > 0 && selectedCount === leads.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <th style={{ padding: '8px' }}>Name</th>
                  <th style={{ padding: '8px' }}>Company</th>
                  <th style={{ padding: '8px' }}>Email</th>
                  {activeTab === 'active' ? (
                    <th style={{ padding: '8px' }}>Phone</th>
                  ) : (
                    <th style={{ padding: '8px' }}>Archived</th>
                  )}
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>Created</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    style={{
                      borderBottom: '1px solid #ddd',
                      background: isSelected(lead.id) ? '#ebf8ff' : undefined,
                    }}
                  >
                    {activeTab === 'active' && (
                      <td style={{ padding: '8px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected(lead.id)}
                          onChange={() => toggle(lead.id)}
                        />
                      </td>
                    )}
                    <td
                      style={{ padding: '8px', cursor: 'pointer', color: '#3182ce' }}
                      onClick={() => onSelectLead(lead.id)}
                    >
                      {lead.name || '—'}
                    </td>
                    <td style={{ padding: '8px' }}>{lead.company || '—'}</td>
                    <td style={{ padding: '8px' }}>{lead.email || '—'}</td>
                    {activeTab === 'active' ? (
                      <td style={{ padding: '8px' }}>{lead.phone || '—'}</td>
                    ) : (
                      <td style={{ padding: '8px' }}>
                        {lead.archived_at ? new Date(lead.archived_at).toLocaleDateString() : '—'}
                      </td>
                    )}
                    <td style={{ padding: '8px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: lead.status === 'handed_off' ? '#4caf50' : '#2196f3',
                          color: 'white',
                          fontSize: '0.85em',
                        }}
                      >
                        {STATUS_LABELS[lead.status]}
                      </span>
                      {activeTab === 'archived' && lead.archive_reason && (
                        <span
                          style={{
                            marginLeft: '6px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#fed7d7',
                            color: '#9b2c2c',
                            fontSize: '0.75em',
                          }}
                        >
                          {lead.archive_reason}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px' }}>
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => onSelectLead(lead.id)}
                          style={{
                            padding: '4px 8px',
                            background: '#3182ce',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '0.8em',
                          }}
                        >
                          View
                        </button>
                        {lead.phone && activeTab === 'active' && (
                          <a
                            href={`tel:${lead.phone}`}
                            style={{
                              padding: '4px 8px',
                              background: '#38a169',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              textDecoration: 'none',
                              fontSize: '0.8em',
                            }}
                          >
                            Call
                          </a>
                        )}
                        {lead.email && activeTab === 'active' && (
                          <a
                            href={`mailto:${lead.email}`}
                            style={{
                              padding: '4px 8px',
                              background: '#805ad5',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              textDecoration: 'none',
                              fontSize: '0.8em',
                            }}
                          >
                            Email
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="md:hidden">
            {leads.map((lead) => (
              <div
                key={lead.id}
                style={{
                  padding: '16px',
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontSize: '16px', fontWeight: '600', color: '#3182ce', cursor: 'pointer' }}
                      onClick={() => onSelectLead(lead.id)}
                    >
                      {lead.name || '—'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#718096', marginTop: '4px' }}>
                      {lead.company || '—'}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: lead.status === 'handed_off' ? '#4caf50' : '#2196f3',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}
                  >
                    {STATUS_LABELS[lead.status]}
                  </span>
                </div>

                {/* Contact Info */}
                <div style={{ fontSize: '13px', color: '#4a5568', marginBottom: '12px' }}>
                  {lead.email && <div style={{ marginBottom: '4px' }}>{lead.email}</div>}
                  {lead.phone && <div>{lead.phone}</div>}
                  {!lead.email && !lead.phone && <div style={{ color: '#a0aec0' }}>No contact info</div>}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => onSelectLead(lead.id)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      background: '#3182ce',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    View
                  </button>
                  {lead.phone && activeTab === 'active' && (
                    <a
                      href={`tel:${lead.phone}`}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        background: '#38a169',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: '500',
                        textAlign: 'center',
                      }}
                    >
                      Call
                    </a>
                  )}
                  {lead.email && activeTab === 'active' && (
                    <a
                      href={`mailto:${lead.email}`}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        background: '#805ad5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: '500',
                        textAlign: 'center',
                      }}
                    >
                      Email
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showBulkArchiveModal && (
        <BulkArchiveModal
          leadIds={Array.from(selectedIds)}
          onComplete={handleBulkArchiveComplete}
          onCancel={() => setShowBulkArchiveModal(false)}
        />
      )}
    </div>
  );
}
