// Office Desk — Billing tab (child route of OfficeDeskPage)
// Renders SubscriptionManager

import { useOutletContext } from 'react-router-dom';
import { SubscriptionManager } from '../../office-desk/components/SubscriptionManager';

interface DeskContext {
  tenantId: string;
  deskId: string;
}

export default function OfficeDeskBillingPage() {
  const { tenantId } = useOutletContext<DeskContext>();

  return <SubscriptionManager tenantId={tenantId} />;
}
