interface ArchiveIndicatorProps {
  archivedAt: string | null;
  archiveReason: string | null;
}

const REASON_LABELS: Record<string, string> = {
  enrolled: 'Enrolled',
  withdrawn: 'Withdrawn',
  inactive: 'Inactive',
  duplicate: 'Duplicate',
  other: 'Other',
};

export function ArchiveIndicator({ archivedAt, archiveReason }: ArchiveIndicatorProps) {
  if (!archivedAt) {
    return null;
  }

  return (
    <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', borderLeft: '3px solid #ff9800' }}>
      <strong>Archived</strong>
      <div style={{ fontSize: '0.9em', color: '#666' }}>
        {new Date(archivedAt).toLocaleDateString()}
        {archiveReason && ` — ${REASON_LABELS[archiveReason] || archiveReason}`}
      </div>
    </div>
  );
}
