// Office Desk — Invoice Detail (child route of OfficeDeskPage)
// Renders InvoiceDetail for a specific invoice

import { useState, useEffect } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { DeskBreadcrumb } from '../../../components/DeskBreadcrumb';
import { ShareButton } from '../../../components/ShareButton';
import { useNavigateTo } from '../../../hooks/useNavigateTo';
import { InvoiceDetail as InvoiceDetailComponent } from '../../office-desk/components/InvoiceDetail';
import { supabase } from '../services/supabase';

interface DeskContext {
  tenantId: string;
  deskId: string;
}

export default function OfficeDeskInvoiceDetailPage() {
  const { deskId, invoiceId } = useParams<{ deskId: string; invoiceId: string }>();
  const { tenantId } = useOutletContext<DeskContext>();
  const [userId, setUserId] = useState<string | null>(null);
  const { navigateToDeskTab } = useNavigateTo();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const handleBack = () => {
    if (deskId) {
      navigateToDeskTab(deskId, 'invoices');
    }
  };

  const handleDeleted = () => {
    if (deskId) {
      navigateToDeskTab(deskId, 'invoices');
    }
  };

  if (!invoiceId || !deskId || !userId) {
    return <div>Invoice not found</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <DeskBreadcrumb deskName="Office Desk" tabLabel="Invoices" />
        <ShareButton entityType="invoice" entityName="Invoice" />
      </div>
      <InvoiceDetailComponent invoiceId={invoiceId} deskId={deskId} userId={userId} onBack={handleBack} onDeleted={handleDeleted} />
    </div>
  );
}
