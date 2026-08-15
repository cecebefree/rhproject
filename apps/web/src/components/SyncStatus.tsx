/**
 * SyncStatus — Shows real-time sync status with last updated time and who updated.
 */

import React from 'react';

interface SyncStatusProps {
  lastUpdated: string | null;
  updatedBy: string | null;
  isSyncing: boolean;
  className?: string;
}

export function SyncStatus({
  lastUpdated,
  updatedBy,
  isSyncing,
  className = '',
}: SyncStatusProps) {
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 5) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
      {isSyncing ? (
        <>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span>Syncing...</span>
        </>
      ) : lastUpdated ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span>
            Updated {formatTime(lastUpdated)}
            {updatedBy && ` by ${updatedBy}`}
          </span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-gray-400 rounded-full" />
          <span>Not synced</span>
        </>
      )}
    </div>
  );
}
