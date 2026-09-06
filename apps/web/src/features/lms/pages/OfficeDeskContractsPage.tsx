// OfficeDeskContractsPage — wrapper for ContractList with tenant context + detail view

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ContractList } from '../../office-desk/components/ContractList';
import { ContractDetail } from '../../office-desk/components/ContractDetail';

interface DeskContext {
  tenantId: string;
}

interface Contract {
  id: string;
  tenant_id: string;
  student_id: string;
  enrollment_id: string | null;
  registration_id: string | null;
  status: string;
  title: string;
  terms: Record<string, unknown>;
  start_date: string | null;
  end_date: string | null;
  signed_at: string | null;
  signed_by: string | null;
  created_at: string;
  students?: { first_name: string; last_name: string; email: string | null } | null;
}

export default function OfficeDeskContractsPage() {
  const { tenantId } = useOutletContext<DeskContext>();
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (selectedContract) {
    return (
      <div style={{ padding: '24px' }}>
        <ContractDetail
          contract={selectedContract}
          onBack={() => setSelectedContract(null)}
          onUpdated={() => setRefreshKey((k) => k + 1)}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#273946', marginBottom: '16px' }}>
        Contracts
      </h3>
      <ContractList
        key={refreshKey}
        tenantId={tenantId}
        onSelect={(c) => setSelectedContract(c)}
      />
    </div>
  );
}
