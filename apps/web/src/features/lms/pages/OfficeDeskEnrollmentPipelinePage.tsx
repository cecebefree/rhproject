// OfficeDeskEnrollmentPipelinePage — wrapper for EnrollmentPipeline Kanban with detail view

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import EnrollmentPipeline from '../../office-desk/components/EnrollmentPipeline';
import PipelineDetail from '../../office-desk/components/PipelineDetail';

interface DeskContext {
  tenantId: string;
}

export default function OfficeDeskEnrollmentPipelinePage() {
  const { tenantId } = useOutletContext<DeskContext>();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (selectedPipelineId) {
    return (
      <div style={{ padding: '24px' }}>
        <PipelineDetail
          pipelineId={selectedPipelineId}
          onBack={() => setSelectedPipelineId(null)}
          onRefresh={() => setRefreshKey((k) => k + 1)}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <EnrollmentPipeline
        key={refreshKey}
        onSelectPipeline={(id) => setSelectedPipelineId(id)}
      />
    </div>
  );
}
