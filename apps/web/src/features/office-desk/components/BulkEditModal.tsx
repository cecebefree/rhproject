import React, { useState, useEffect } from 'react';
import { useBulkSelection } from './BulkSelectionContext';
import { bulkEdit, type BulkEditValues, getTeamMembers } from '../services/bulkOperationsService';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STATUS_OPTIONS = {
  lead: ['enquiry', 'qualified', 'invoiced', 'handed_off'],
  contact: ['active', 'inactive', 'archived'],
  invoice: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
};

const CATEGORY_OPTIONS = ['education', 'consulting', 'coaching', 'other'];

export default function BulkEditModal({ isOpen, onClose, onSuccess }: BulkEditModalProps) {
  const { selectedIds, entityType, tenantId } = useBulkSelection();
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  
  const [values, setValues] = useState<BulkEditValues>({
    status: undefined,
    assigned_to: undefined,
    tags: undefined,
    category: undefined,
    priority: undefined,
    notes: undefined,
  });

  useEffect(() => {
    if (isOpen && tenantId) {
      getTeamMembers(tenantId).then(setTeamMembers);
    }
  }, [isOpen, tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Filter out undefined values
      const updateValues: BulkEditValues = {};
      if (values.status !== undefined) updateValues.status = values.status;
      if (values.assigned_to !== undefined) updateValues.assigned_to = values.assigned_to;
      if (values.tags !== undefined) updateValues.tags = values.tags;
      if (values.category !== undefined) updateValues.category = values.category;
      if (values.priority !== undefined) updateValues.priority = values.priority;
      if (values.notes !== undefined) updateValues.notes = values.notes;

      const result = await bulkEdit(entityType, Array.from(selectedIds), updateValues, tenantId, 'current-user-id');
      
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        alert(`Updated ${result.successCount} of ${result.totalAffected} records. ${result.errorCount} errors.`);
      }
    } catch (err) {
      alert('Failed to update records');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Bulk Edit {selectedIds.size} {entityType === 'lead' ? 'Leads' : entityType === 'contact' ? 'Contacts' : 'Invoices'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={values.status || ''}
              onChange={(e) => setValues({ ...values, status: e.target.value || undefined })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Don't change</option>
              {STATUS_OPTIONS[entityType].map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {entityType !== 'invoice' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
              <select
                value={values.assigned_to || ''}
                onChange={(e) => setValues({ ...values, assigned_to: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Don't change</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name || member.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={values.category || ''}
              onChange={(e) => setValues({ ...values, category: e.target.value || undefined })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Don't change</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={values.priority || ''}
              onChange={(e) => setValues({ ...values, priority: e.target.value || undefined })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Don't change</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={values.notes || ''}
              onChange={(e) => setValues({ ...values, notes: e.target.value || undefined })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add notes to all selected records..."
            />
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
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Updating...' : 'Apply Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}