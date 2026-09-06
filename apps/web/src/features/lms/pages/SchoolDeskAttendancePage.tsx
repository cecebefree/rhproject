// SchoolDeskAttendancePage — attendance tracking using existing AttendanceForm

import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AttendanceForm } from '../components/AttendanceForm';
import { AttendanceList } from '../components/AttendanceList';
import { supabase } from '../services/supabase';

interface DeskContext {
  tenantId: string;
  userId: string;
}

export default function SchoolDeskAttendancePage() {
  const { tenantId, userId } = useOutletContext<DeskContext>();
  const [view, setView] = useState<'list' | 'mark'>('list');
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={{ padding: '24px' }}>
      <div className="flex justify-between items-center mb-4">
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#273946' }}>
          Attendance
        </h3>
        <button
          onClick={() => setView(view === 'list' ? 'mark' : 'list')}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: '#2563EB' }}
        >
          {view === 'list' ? '+ Mark Attendance' : 'View List'}
        </button>
      </div>

      {view === 'mark' ? (
        <AttendanceForm
          tenantId={tenantId}
          userId={userId}
          onSuccess={() => {
            setView('list');
            setRefreshKey((k) => k + 1);
          }}
          onCancel={() => setView('list')}
        />
      ) : (
        <AttendanceList key={refreshKey} tenantId={tenantId} onSelect={() => {}} />
      )}
    </div>
  );
}
