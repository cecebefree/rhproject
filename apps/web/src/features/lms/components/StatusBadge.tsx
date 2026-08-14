// StatusBadge — color-coded status display
// Row 67/71/72/73: Reusable badge for registration, report card, payment, and attendance statuses

import type { RegistrationStatus } from '../services/supabase';
import type { ReportCardStatus } from '../services/supabase';
import type { PaymentRequestStatus } from '../services/supabase';
import type { AttendanceStatus } from '../services/supabase';

interface StatusBadgeProps {
  status: RegistrationStatus | ReportCardStatus | PaymentRequestStatus | AttendanceStatus;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; fg: string }
> = {
  pending_init: { label: 'Pending Init', bg: '#fef3c7', fg: '#92400e' },
  pending_review: { label: 'Pending Review', bg: '#dbeafe', fg: '#1e40af' },
  approved: { label: 'Approved', bg: '#d1fae5', fg: '#065f46' },
  active: { label: 'Active', bg: '#d1fae5', fg: '#065f46' },
  withdrawn: { label: 'Withdrawn', bg: '#e5e7eb', fg: '#374151' },
  rejected: { label: 'Rejected', bg: '#fee2e2', fg: '#991b1b' },
  draft: { label: 'Draft', bg: '#fef3c7', fg: '#92400e' },
  released: { label: 'Released', bg: '#dbeafe', fg: '#1e40af' },
  visible: { label: 'Visible', bg: '#d1fae5', fg: '#065f46' },
  pending: { label: 'Pending', bg: '#fef3c7', fg: '#92400e' },
  paid: { label: 'Paid', bg: '#d1fae5', fg: '#065f46' },
  expired: { label: 'Expired', bg: '#e5e7eb', fg: '#374151' },
  cancelled: { label: 'Cancelled', bg: '#fee2e2', fg: '#991b1b' },
  present: { label: 'Present', bg: '#d1fae5', fg: '#065f46' },
  absent: { label: 'Absent', bg: '#fee2e2', fg: '#991b1b' },
  excused: { label: 'Excused', bg: '#fef3c7', fg: '#92400e' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    bg: '#f3f4f6',
    fg: '#374151',
  };

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: config.bg,
        color: config.fg,
      }}
    >
      {config.label}
    </span>
  );
}
