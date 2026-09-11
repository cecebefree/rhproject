import { useParams } from 'react-router-dom';
import ActivityLog from '../../office-desk/components/ActivityLog';

export default function OfficeDeskActivityPage() {
  const { deskId } = useParams<{ deskId: string }>();
  return <ActivityLog tenantId={deskId || ''} />;
}
