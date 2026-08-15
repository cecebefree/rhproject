// Office Desk — Leads tab (child route of OfficeDeskPage)
// Renders LeadList and handles navigation to individual leads

import { useEffect, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { useNavigateTo } from '../../../hooks/useNavigateTo';
import { LeadList } from '../../front-desk/components/LeadList';

interface DeskContext {
  tenantId: string;
  deskId: string;
}

export default function OfficeDeskLeadsPage() {
  const { tenantId, deskId } = useOutletContext<DeskContext>();
  const { navigateToLead } = useNavigateTo();

  const handleSelectLead = (leadId: string) => {
    navigateToLead(deskId, leadId);
  };

  const handleEditLead = (leadId: string) => {
    navigateToLead(deskId, leadId);
  };

  return (
    <LeadList tenantId={tenantId} onSelectLead={handleSelectLead} onEditLead={handleEditLead} />
  );
}
