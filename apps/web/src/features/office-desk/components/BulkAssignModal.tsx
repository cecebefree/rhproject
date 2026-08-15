import React, { useState, useEffect } from 'react';
import { useBulkSelection } from './BulkSelectionContext';
import { bulkAssign, getTeamMembers } from '../services/bulkOperationsService';

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
}

export default function BulkAssignModal({ isOpen, onClose, onSuccess }: BulkAssignModalProps) {
  const { selectedIds, entityType, tenantId } = useBulkSelection();
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');

  useEffect(() => {
    if (isOpen && tenantId) {
      getTeamMembers(tenantId).then(setTeamMembers);
    }
  }, [isOpen, tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      alert('Please select a team member');
      return;
    }

    setLoading(true);

    try {
      const result = await bulkAssign(entityType, Array.from(selectedIds), selectedMember, tenantId, 'current-user-id');
      
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        alert(`Assigned ${result.successCount} of ${result.totalAffected} records. ${result.errorCount} errors.`);
      }
    } catch (err) {
      alert('Failed to assign records');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const entityTypeLabel = entityType === 'lead' ? 'Leads' : entityType === 'contact' ? 'Contacts' : 'Invoices';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Assign {selectedIds.size} {entityTypeLabel}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Team Member
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {teamMembers.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No team members found</p>
              ) : (
                teamMembers.map((member) => (
                  <label
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedMember === member.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="assignee"
                      value={member.id}
                      checked={selectedMember === member.id}
                      onChange={(e) => setSelectedMember(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {member.full_name || 'No name'}
                      </div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
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
              disabled={loading || !selectedMember}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}