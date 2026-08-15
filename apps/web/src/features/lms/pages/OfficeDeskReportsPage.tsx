// Office Desk — Reports tab (child route of OfficeDeskPage)
// Renders ArchiveReport

import { useOutletContext } from 'react-router-dom';
import { ArchiveReport } from '../../front-desk/components/ArchiveReport';

interface DeskContext {
  tenantId: string;
  deskId: string;
}

export default function OfficeDeskReportsPage() {
  const { tenantId } = useOutletContext<DeskContext>();

  return <ArchiveReport tenantId={tenantId} />;
}
