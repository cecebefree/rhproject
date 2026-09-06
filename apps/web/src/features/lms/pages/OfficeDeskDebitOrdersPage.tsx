// OfficeDeskDebitOrdersPage — wrapper for DebitOrderList with tenant context

import { useOutletContext } from 'react-router-dom';
import { DebitOrderList } from '../../office-desk/components/DebitOrderList';

interface DeskContext {
  tenantId: string;
}

export default function OfficeDeskDebitOrdersPage() {
  const { tenantId } = useOutletContext<DeskContext>();

  return (
    <div style={{ padding: '24px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#273946', marginBottom: '16px' }}>
        Debit Orders
      </h3>
      <DebitOrderList tenantId={tenantId} />
    </div>
  );
}
