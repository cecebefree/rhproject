// Office Desk — Invoices tab (child route of OfficeDeskPage)
// Renders InvoiceList and handles navigation to individual invoices

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useNavigateTo } from '../../../hooks/useNavigateTo';
import { BulkSelectionProvider } from '../../office-desk/components/BulkSelectionContext';
import { InvoiceCreate } from '../../office-desk/components/InvoiceCreate';
import { InvoiceList } from '../../office-desk/components/InvoiceList';

interface DeskContext {
  tenantId: string;
  deskId: string;
}

export default function OfficeDeskInvoicesPage() {
  const { tenantId, deskId } = useOutletContext<DeskContext>();
  const { navigateToInvoice } = useNavigateTo();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleSelectInvoice = (invoiceId: string) => {
    navigateToInvoice(deskId, invoiceId);
  };

  const handleCreateInvoice = () => {
    setShowCreateModal(true);
  };

  const handleInvoiceCreated = (invoiceId: string) => {
    setShowCreateModal(false);
    navigateToInvoice(deskId, invoiceId);
  };

  return (
    <BulkSelectionProvider initialEntityType="invoice" initialTenantId={tenantId}>
      <InvoiceList
        tenantId={tenantId}
        onSelect={handleSelectInvoice}
        onCreateNew={handleCreateInvoice}
      />

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <InvoiceCreate
              tenantId={tenantId}
              onCreated={handleInvoiceCreated}
              onCancel={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}
    </BulkSelectionProvider>
  );
}
