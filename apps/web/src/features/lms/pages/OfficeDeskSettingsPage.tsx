// Office Desk — Settings tab (child route of OfficeDeskPage)
// Placeholder for future OfficeDeskSettings component

import { useOutletContext } from 'react-router-dom';

interface DeskContext {
  tenantId: string;
  deskId: string;
}

export default function OfficeDeskSettingsPage() {
  const { tenantId } = useOutletContext<DeskContext>();

  return (
    <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: '8px' }}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600', color: '#2d3748' }}>
        Office Desk Settings
      </h2>
      <p style={{ color: '#718096' }}>Settings configuration coming soon. This will include:</p>
      <ul style={{ color: '#718096', marginTop: '8px' }}>
        <li>Archive retention period</li>
        <li>Default lead status</li>
        <li>Notification preferences</li>
        <li>Team member access</li>
      </ul>
    </div>
  );
}
