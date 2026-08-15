/**
 * ConflictDetectionBanner — Displays when a conflict is detected and provides resolution options.
 */

import React, { useState } from 'react';
import type { ConflictItem, ConflictStrategy } from '../services/realtimeConflict';

interface ConflictDetectionBannerProps {
  conflicts: ConflictItem[];
  onResolve: (conflict: ConflictItem, strategy: ConflictStrategy) => void;
  onDismiss?: (conflict: ConflictItem) => void;
}

export function ConflictDetectionBanner({
  conflicts,
  onResolve,
  onDismiss,
}: ConflictDetectionBannerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (conflicts.length === 0) return null;

  return (
    <div className="space-y-3">
      {conflicts.map((conflict) => (
        <div
          key={conflict.id}
          className="bg-amber-50 border border-amber-200 rounded-lg p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-amber-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-amber-800">
                  Conflict detected in {conflict.table}
                </h3>
                <p className="mt-1 text-sm text-amber-700">
                  {conflict.fieldDifferences.length} field(s) have been modified by another user.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setExpandedId(expandedId === conflict.id ? null : conflict.id)
                }
                className="text-sm text-amber-600 hover:text-amber-800"
              >
                {expandedId === conflict.id ? 'Hide' : 'Show'} details
              </button>
              {onDismiss && (
                <button
                  onClick={() => onDismiss(conflict)}
                  className="text-sm text-amber-600 hover:text-amber-800"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>

          {expandedId === conflict.id && (
            <div className="mt-4 space-y-3">
              <div className="bg-white rounded border border-amber-100">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-amber-50">
                      <th className="px-3 py-2 text-left font-medium text-amber-800">
                        Field
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-amber-800">
                        Your Value
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-amber-800">
                        Server Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {conflict.fieldDifferences.map((diff) => (
                      <tr key={diff.field}>
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {diff.field}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {String(diff.localValue ?? 'null')}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {String(diff.serverValue ?? 'null')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onResolve(conflict, 'client-wins')}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  Keep mine
                </button>
                <button
                  onClick={() => onResolve(conflict, 'server-wins')}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
                >
                  Keep server
                </button>
                <button
                  onClick={() => onResolve(conflict, 'last-write-wins')}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-gray-600 rounded hover:bg-gray-700"
                >
                  Last write wins
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
