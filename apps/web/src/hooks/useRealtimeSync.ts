/**
 * useRealtimeSync — Hook for subscribing to real-time data changes.
 * Provides live data with optimistic update support.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeClient, type SubscriptionOptions, type PayloadCallback } from '../services/realtime';

interface UseRealtimeSyncOptions {
  enabled?: boolean;
  onInsert?: (data: Record<string, unknown>) => void;
  onUpdate?: (data: Record<string, unknown>) => void;
  onDelete?: (data: Record<string, unknown>) => void;
}

interface UseRealtimeSyncResult<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  lastUpdated: string | null;
  updatedBy: string | null;
  isSyncing: boolean;
}

export function useRealtimeSync<T extends Record<string, unknown>>(
  realtimeClient: RealtimeClient | null,
  options: SubscriptionOptions,
  fetchFn: () => Promise<{ data: T[] | null; error: Error | null }>,
  deps: UseRealtimeSyncOptions = {}
): UseRealtimeSyncResult<T> {
  const { enabled = true, onInsert, onUpdate, onDelete } = deps;
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const subscriptionIdRef = useRef<string | null>(null);

  // Initial fetch
  useEffect(() => {
    if (!enabled) return;

    const fetchData = async () => {
      setIsLoading(true);
      const result = await fetchFn();
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data || []);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [enabled, fetchFn]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!enabled || !realtimeClient) return;

    const callback: PayloadCallback = (payload) => {
      setIsSyncing(true);
      const newRecord = payload.new as T;
      const oldRecord = payload.old as T | null;

      // Update data based on event type
      setData(prev => {
        const index = prev.findIndex(item => item.id === newRecord?.id);

        switch (payload.eventType) {
          case 'INSERT':
            if (index === -1) {
              onInsert?.(newRecord as Record<string, unknown>);
              return [...prev, newRecord];
            }
            return prev;

          case 'UPDATE':
            if (index !== -1) {
              const updated = [...prev];
              updated[index] = newRecord;
              onUpdate?.(newRecord as Record<string, unknown>);
              return updated;
            }
            return [...prev, newRecord];

          case 'DELETE':
            if (oldRecord) {
              onDelete?.(oldRecord as Record<string, unknown>);
              return prev.filter(item => item.id !== oldRecord.id);
            }
            return prev;

          default:
            return prev;
        }
      });

      setLastUpdated(new Date().toISOString());
      setUpdatedBy(newRecord?.updated_by as string || newRecord?.created_by as string || null);

      setTimeout(() => setIsSyncing(false), 500);
    };

    subscriptionIdRef.current = realtimeClient.subscribe(options, callback);

    return () => {
      if (subscriptionIdRef.current) {
        realtimeClient.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
  }, [enabled, realtimeClient, options, onInsert, onUpdate, onDelete]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    updatedBy,
    isSyncing,
  };
}

/**
 * useRealtimeRecord — Hook for subscribing to a single record's changes.
 */
export function useRealtimeRecord<T extends Record<string, unknown>>(
  realtimeClient: RealtimeClient | null,
  options: SubscriptionOptions,
  fetchFn: () => Promise<{ data: T | null; error: Error | null }>,
  deps: UseRealtimeSyncOptions = {}
): {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: string | null;
  updatedBy: string | null;
  isSyncing: boolean;
} {
  const { enabled = true, onUpdate, onDelete } = deps;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const subscriptionIdRef = useRef<string | null>(null);

  // Initial fetch
  useEffect(() => {
    if (!enabled) return;

    const fetchData = async () => {
      setIsLoading(true);
      const result = await fetchFn();
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [enabled, fetchFn]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!enabled || !realtimeClient) return;

    const callback: PayloadCallback = (payload) => {
      setIsSyncing(true);
      const newRecord = payload.new as T;
      const oldRecord = payload.old as T | null;

      switch (payload.eventType) {
        case 'INSERT':
        case 'UPDATE':
          setData(newRecord);
          onUpdate?.(newRecord as Record<string, unknown>);
          break;

        case 'DELETE':
          setData(null);
          onDelete?.(oldRecord as Record<string, unknown>);
          break;
      }

      setLastUpdated(new Date().toISOString());
      setUpdatedBy(newRecord?.updated_by as string || newRecord?.created_by as string || null);

      setTimeout(() => setIsSyncing(false), 500);
    };

    subscriptionIdRef.current = realtimeClient.subscribe(options, callback);

    return () => {
      if (subscriptionIdRef.current) {
        realtimeClient.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
  }, [enabled, realtimeClient, options, onUpdate, onDelete]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    updatedBy,
    isSyncing,
  };
}
