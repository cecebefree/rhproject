import { useParams, useNavigate } from 'react-router-dom';
import { useRealtimeContext } from '../../../contexts/RealtimeProvider';
import { LeadDetail } from '../components/LeadDetail';

export default function FrontDeskLeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { userId } = useRealtimeContext();

  if (!leadId) {
    navigate('/service/front-desk');
    return null;
  }

  return (
    <LeadDetail
      leadId={leadId}
      deskId="front-desk"
      userId={userId || ''}
      onBack={() => navigate('/service/front-desk')}
      onArchived={() => navigate('/service/front-desk')}
    />
  );
}
