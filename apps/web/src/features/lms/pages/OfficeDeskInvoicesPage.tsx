// Office Desk — Invoices tab (child route of OfficeDeskPage)
// Renders InvoiceList and handles navigation to individual invoices

import { useOutletContext, useParams } from 'react-router-dom';
import { useNavigateTo } from '../../../hooks/useNavigateTo';
import { InvoiceList } from '../../office-desk/components/InvoiceList';

interface DeskContext {
  tenantId: string;
  deskId: string;
}

export default function OfficeDeskInvoicesPage() {
  const { tenantId, deskId } = useOutletContext<DeskContext>();
  const { navigateToInvoice } = useNavigateTo();

  const handleSelectInvoice = (invoiceId: string) => {
    navigateToInvoice(deskId, invoiceId);
  };

  const handleCreateInvoice = () => {
    // Navigate to invoice create (could be a modal or separate route)
    // For now, we'll keep it as a modal within InvoiceList
  };

  return (
    <InvoiceList
      tenantId={tenantId}
      onSelect={handleSelectInvoice}
      onCreateNew={handleCreateInvoice}
    />
  );
}
