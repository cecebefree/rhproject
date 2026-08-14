import { updateLeadStatus, type LeadStatus, LEAD_STATUSES } from '../services/supabase';

interface StatusDropdownProps {
  leadId: string;
  currentStatus: LeadStatus;
  onStatusChange: (newStatus: LeadStatus) => void;
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  enquiry: 'Enquiry',
  qualified: 'Qualified',
  invoiced: 'Invoiced',
  handed_off: 'Handed Off',
};

export function StatusDropdown({ leadId, currentStatus, onStatusChange }: StatusDropdownProps) {
  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as LeadStatus;
    const { error } = await updateLeadStatus(leadId, newStatus);
    if (!error) {
      onStatusChange(newStatus);
    }
  };

  return (
    <label>
      Status
      <select
        value={currentStatus}
        onChange={handleChange}
        style={{ width: '100%', padding: '8px', marginTop: '4px' }}
      >
        {LEAD_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </label>
  );
}
