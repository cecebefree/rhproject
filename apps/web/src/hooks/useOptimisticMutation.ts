/**
 * useOptimisticMutation — Hook for mutations with optimistic updates.
 * Provides immediate UI feedback while the server processes the change.
 */

import { useState, useCallback } from 'react';
import { OptimisticUpdateManager, type OptimisticUpdate } from '../services/optimisticUpdate';
import { OfflineQueueManager, type HttpMethod } from '../services/offlineQueue';
import { detectConflict, resolveConflict, type ConflictStrategy, type ConflictItem } from '../services/realtimeConflict';

interface UseOptimisticMutationOptions<T> {
  table: string;
  recordId: string;
  currentData: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error, rollbackData: T) => void;
  onConflict?: (conflict: ConflictItem) => void;
  strategy?: ConflictStrategy;
}

interface UseOptimisticMutationResult<T> {
  mutate: (pendingData: Partial<T>, method?: HttpMethod) => Promise<T>;
  isPending: boolean;
  error: Error | null;
  optimisticData: T | null;
  conflicts: ConflictItem[];
  resolveConflict: (conflict: ConflictItem, strategy: ConflictStrategy) => T;
}

const optimisticManager = new OptimisticUpdateManager();
const offlineQueue = new OfflineQueueManager();

export function useOptimisticMutation<T extends Record<string, unknown>>(
  options: UseOptimisticMutationOptions<T>
): UseOptimisticMutationResult<T> {
  const {
    table,
    recordId,
    currentData,
    onSuccess,
    onError,
    onConflict,
    strategy = 'last-write-wins',
  } = options;

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [optimisticData, setOptimisticData] = useState<T | null>(null);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);

  const mutate = useCallback(async (
    pendingData: Partial<T>,
    method: HttpMethod = 'UPDATE'
  ): Promise<T> => {
    setIsPending(true);
    setError(null);

    // Apply optimistic update
    const mergedData = { ...currentData, ...pendingData };
    const updateId = optimisticManager.apply(table, recordId, currentData, mergedData as T);
    setOptimisticData(mergedData as T);

    try {
      // Try to send to server
      let result: T;

      if (navigator.onLine) {
        // Online: send directly
        const response = await fetch(`/api/${table}/${recordId}`, {
          method: method === 'DELETE' ? 'DELETE' : method === 'INSERT' ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: method !== 'DELETE' ? JSON.stringify(pendingData) : undefined,
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.statusText}`);
        }

        result = await response.json();

        // Check for conflicts
        const conflict = detectConflict(currentData, result, table);
        if (conflict) {
          setConflicts(prev => [...prev, conflict]);
          onConflict?.(conflict);

          // Auto-resolve based on strategy
          const resolution = resolveConflict(conflict, strategy);
          result = resolution.resolved as T;
        }
      } else {
        // Offline: queue for later
        await offlineQueue.addMutation(table, method, recordId, pendingData as Record<string, unknown>, currentData as Record<string, unknown>);
        result = mergedData as T;
      }

      // Confirm optimistic update
      optimisticManager.confirm(updateId);
      setOptimisticData(null);
      onSuccess?.(result);
      setIsPending(false);

      return result;
    } catch (err) {
      // Rollback on error
      const rollbackData = optimisticManager.rollback<T>(updateId);
      setOptimisticData(null);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setIsPending(false);

      const rollbackResult = rollbackData || currentData;
      onError?.(err instanceof Error ? err : new Error('Unknown error'), rollbackResult);

      throw err;
    }
  }, [table, recordId, currentData, strategy, onSuccess, onError, onConflict]);

  const resolveConflictManually = useCallback((
    conflict: ConflictItem,
    resolutionStrategy: ConflictStrategy
  ): T => {
    const resolution = resolveConflict(conflict, resolutionStrategy);
    setConflicts(prev => prev.filter(c => c.id !== conflict.id));
    return resolution.resolved as T;
  }, []);

  return {
    mutate,
    isPending,
    error,
    optimisticData,
    conflicts,
    resolveConflict: resolveConflictManually,
  };
}
