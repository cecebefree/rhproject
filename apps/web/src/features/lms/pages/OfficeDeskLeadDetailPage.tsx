// Office Desk — Lead Detail (child route of OfficeDeskPage)
// Renders LeadDetail for a specific lead

import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { DeskBreadcrumb } from '../../../components/DeskBreadcrumb';
import { ShareButton } from '../../../components/ShareButton';
import { useNavigateTo } from '../../../hooks/useNavigateTo';
import { LeadDetail } from '../../front-desk/components/LeadDetail';
import { supabase } from '../services/supabase';

interface DeskContext {
  tenantId: string;
  deskId: string;
}

export default function OfficeDeskLeadDetailPage() {
  const { deskId, leadId } = useParams<{ deskId: string; leadId: string }>();
  const { tenantId } = useOutletContext<DeskContext>();
  const [userId, setUserId] = useState<string | null>(null);
  const { navigateToDeskTab } = useNavigateTo();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const handleBack = () => {
    if (deskId) {
      navigateToDeskTab(deskId, 'leads');
    }
  };

  const handleArchived = () => {
    if (deskId) {
      navigateToDeskTab(deskId, 'leads');
    }
  };

  if (!leadId || !deskId || !userId) {
    return <div>Lead not found</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <DeskBreadcrumb deskName="Office Desk" tabLabel="Leads" />
        <ShareButton entityType="lead" entityName="Lead" />
      </div>
      <LeadDetail leadId={leadId} deskId={deskId} userId={userId} onBack={handleBack} onArchived={handleArchived} />
    </div>
  );
}
