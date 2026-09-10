// OfficeDeskClassAssignmentsPage — wrapper for ClassAssignmentDashboard with tenant context

import { useOutletContext } from 'react-router-dom';
import ClassAssignmentDashboard from '../../office-desk/components/ClassAssignmentDashboard';

interface DeskContext {
  tenantId: string;
}

export default function OfficeDeskClassAssignmentsPage() {
  const { tenantId } = useOutletContext<DeskContext>();

  return (
    <div style={{ padding: '24px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#273946', marginBottom: '16px' }}>
        Class Assignments
      </h3>
      <ClassAssignmentDashboard key={tenantId} />
    </div>
  );
}
