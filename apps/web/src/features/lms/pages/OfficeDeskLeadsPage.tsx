// Office Desk — Leads tab (child route of OfficeDeskPage)
// Renders LeadList or DealPipeline with toggle

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useNavigateTo } from '../../../hooks/useNavigateTo';
import DealPipeline from '../../office-desk/components/DealPipeline';
import { LeadList } from '../../front-desk/components/LeadList';

interface DeskContext {
  tenantId: string;
  deskId: string;
}

type ViewMode = 'list' | 'pipeline';

export default function OfficeDeskLeadsPage() {
  const { tenantId, deskId } = useOutletContext<DeskContext>();
  const { navigateToLead } = useNavigateTo();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const handleSelectLead = (leadId: string) => {
    navigateToLead(deskId, leadId);
  };

  const handleEditLead = (leadId: string) => {
    navigateToLead(deskId, leadId);
  };

  return (
    <div>
      {/* View Toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => setViewMode('list')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            border: '1px solid #e2e8f0',
            backgroundColor: viewMode === 'list' ? '#273946' : 'white',
            color: viewMode === 'list' ? 'white' : '#4a5568',
            cursor: 'pointer',
          }}
        >
          List View
        </button>
        <button
          type="button"
          onClick={() => setViewMode('pipeline')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            border: '1px solid #e2e8f0',
            backgroundColor: viewMode === 'pipeline' ? '#273946' : 'white',
            color: viewMode === 'pipeline' ? 'white' : '#4a5568',
            cursor: 'pointer',
          }}
        >
          Pipeline View
        </button>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <LeadList tenantId={tenantId} onSelectLead={handleSelectLead} onEditLead={handleEditLead} />
      ) : (
        <DealPipeline tenantId={tenantId} />
      )}
    </div>
  );
}
