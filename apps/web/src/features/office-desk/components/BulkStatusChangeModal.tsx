import React, { useState } from 'react';
import { useBulkSelection } from './BulkSelectionContext';
import { bulkStatusChange } from '../services/bulkOperationsService';

interface BulkStatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STATUS_OPTIONS = {
  lead: [
    { value: 'enquiry', label: 'Enquiry', color: 'bg-gray-100 text-gray-800' },
    { value: 'qualified', label: 'Qualified', color: 'bg-blue-100 text-blue-800' },
    { value: 'invoiced', label: 'Invoiced', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'handed_off', label: 'Handed Off', color: 'bg-green-100 text-green-800' },
  ],
  contact: [
    { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
    { value: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
    { value: 'archived', label: 'Archived', color: 'bg-red-100 text-red-800' },
  ],
  invoice: [
    { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-800' },
    { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800' },
    { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-800' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
  ],
};

export default function BulkStatusChangeModal({ isOpen, onClose, onSuccess }: BulkStatusChangeModalProps) {
  const { selectedIds, entityType, tenantId } = useBulkSelection();
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus) {
      alert('Please select a status');
      return;
    }

    setLoading(true);

    try {
      const result = await bulkStatusChange(entityType, Array.from(selectedIds), selectedStatus, tenantId, 'current-user-id');
      
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        alert(`Updated ${result.successCount} of ${result.totalAffected} records. ${result.errorCount} errors.`);
      }
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const entityTypeLabel = entityType === 'lead' ? 'Leads' : entityType === 'contact' ? 'Contacts' : 'Invoices';
  const statuses = STATUS_OPTIONS[entityType];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Change Status for {selectedIds.size} {entityTypeLabel}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select New Status
            </label>
            <div className="grid grid-cols-2 gap-3">
              {statuses.map((status) => (
                <label
                  key={status.value}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                    selectedStatus === status.value
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={status.value}
                    checked={selectedStatus === status.value}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <strong>Preview:</strong> {selectedIds.size} {entityTypeLabel} will be moved to{' '}
              {selectedStatus ? (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  statuses.find(s => s.value === selectedStatus)?.color || 'bg-gray-100'
                }`}>
                  {statuses.find(s => s.value === selectedStatus)?.label}
                </span>
              ) : (
                <span className="text-gray-400">[Select a status]</span>
              )}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedStatus}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Updating...' : 'Change Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}