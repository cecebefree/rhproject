import React from 'react';
import { useBulkSelection } from './BulkSelectionContext';

interface BulkActionBarProps {
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
  onStatusChange: () => void;
}

export default function BulkActionBar({
  onEdit,
  onDelete,
  onAssign,
  onStatusChange,
}: BulkActionBarProps) {
  const { selectedCount, deselectAll, entityType } = useBulkSelection();

  if (selectedCount === 0) return null;

  const entityTypeLabel =
    entityType === 'lead' ? 'leads' : entityType === 'contact' ? 'contacts' : 'invoices';

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white px-6 py-4 shadow-lg z-50 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Selection count">
            <title>Selection count</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-semibold">
            {selectedCount} {entityTypeLabel} selected
          </span>
        </div>

        <button type="button" onClick={deselectAll} className="text-blue-200 hover:text-white text-sm underline">
          Clear selection
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button type="button"
          onClick={onEdit}
          className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Edit selected">
            <title>Edit selected</title>
          </svg>
          Edit
        </button>

        <button type="button"
          onClick={onStatusChange}
          className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Change status">
            <title>Change status</title>
          </svg>
          Status
        </button>

        <button type="button"
          onClick={onAssign}
          className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Assign selected">
            <title>Assign selected</title>
          </svg>
          Assign
        </button>

        <button type="button"
          onClick={onDelete}
          className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Delete selected">
            <title>Delete selected</title>
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
}
