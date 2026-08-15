import React, { useState } from 'react';
import { useBulkSelection } from './BulkSelectionContext';
import { bulkDelete, undoBulkOperation } from '../services/bulkOperationsService';

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkDeleteModal({ isOpen, onClose, onSuccess }: BulkDeleteModalProps) {
  const { selectedIds, entityType, tenantId, deselectAll } = useBulkSelection();
  const [loading, setLoading] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [showUndo, setShowUndo] = useState(false);

  const entityTypeLabel = entityType === 'lead' ? 'leads' : entityType === 'contact' ? 'contacts' : 'invoices';

  const handleDelete = async () => {
    setLoading(true);

    try {
      const result = await bulkDelete(entityType, Array.from(selectedIds), tenantId, 'current-user-id');
      
      if (result.success || result.successCount > 0) {
        setOperationId(result.operationId || null);
        setShowUndo(true);
        deselectAll();
        
        // Auto-hide undo after 30 seconds
        setTimeout(() => {
          setShowUndo(false);
          onSuccess();
        }, 30000);
      } else {
        alert(`Failed to delete records: ${result.errors[0]?.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert('Failed to delete records');
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async () => {
    if (!operationId) return;

    setLoading(true);
    try {
      const success = await undoBulkOperation(operationId);
      if (success) {
        setShowUndo(false);
        setOperationId(null);
        onSuccess();
      } else {
        alert('Failed to undo operation');
      }
    } catch (err) {
      alert('Failed to undo operation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {!showUndo ? (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Delete {selectedIds.size} {entityTypeLabel}?
                  </h2>
                  <p className="text-sm text-gray-500">
                    This action can be undone within 30 seconds.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-4">
                You are about to soft delete {selectedIds.size} {entityTypeLabel}. 
                They will be hidden from your list but can be restored within 30 seconds.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Deleted!</h2>
                <p className="text-sm text-gray-500">
                  {selectedIds.size} {entityTypeLabel} have been soft deleted.
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                You have <strong>30 seconds</strong> to undo this operation. 
                After that, the records will need to be restored manually.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleUndo}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Undoing...' : 'Undo Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}