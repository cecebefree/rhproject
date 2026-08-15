/**
 * OfflineIndicator — Shows connection status and offline queue info.
 */

import React, { useState, useEffect } from 'react';
import { OfflineQueueManager } from '../services/offlineQueue';

const offlineQueue = new OfflineQueueManager();

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className = '' }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueStatus, setQueueStatus] = useState({ total: 0, pending: 0, processing: 0, failed: 0 });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check queue status periodically
    const interval = setInterval(async () => {
      const status = await offlineQueue.getQueueStatus();
      setQueueStatus(status);
    }, 5000);

    // Initial check
    offlineQueue.getQueueStatus().then(setQueueStatus);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (isOnline && queueStatus.total === 0) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
        isOnline ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
      } ${className}`}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          isOnline ? 'bg-green-500' : 'bg-amber-500'
        }`}
      />
      <span className="text-sm font-medium">
        {isOnline ? 'Online' : 'Offline'}
      </span>
      {queueStatus.pending > 0 && (
        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
          {queueStatus.pending} pending
        </span>
      )}
      {queueStatus.failed > 0 && (
        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
          {queueStatus.failed} failed
        </span>
      )}
    </div>
  );
}
