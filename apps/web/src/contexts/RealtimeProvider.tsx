/**
 * RealtimeProvider — Context provider for real-time infrastructure.
 * Wraps the app with realtime client, conflict resolver, and offline queue.
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { RealtimeClient } from '../services/realtime';
import { OptimisticUpdateManager } from '../services/optimisticUpdate';
import { OfflineQueueManager } from '../services/offlineQueue';
import { BroadcastChannelManager } from '../services/broadcastChannel';
import { supabase } from '../lib/supabase';

interface RealtimeContextValue {
  realtimeClient: RealtimeClient | null;
  optimisticManager: OptimisticUpdateManager;
  offlineQueue: OfflineQueueManager;
  broadcastChannel: BroadcastChannelManager | null;
  isOnline: boolean;
  userId: string | null;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  realtimeClient: null,
  optimisticManager: new OptimisticUpdateManager(),
  offlineQueue: new OfflineQueueManager(),
  broadcastChannel: null,
  isOnline: navigator.onLine,
  userId: null,
});

export function useRealtimeContext() {
  return useContext(RealtimeContext);
}

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Initialize managers (stable across renders)
  const optimisticManager = useMemo(() => new OptimisticUpdateManager(), []);
  const offlineQueue = useMemo(() => new OfflineQueueManager(), []);

  // Initialize realtime client and broadcast channel when user is available
  const [realtimeClient, setRealtimeClient] = useState<RealtimeClient | null>(null);
  const [broadcastChannel, setBroadcastChannel] = useState<BroadcastChannelManager | null>(null);

  // Get user ID from Supabase session
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: { user?: { id: string } } | null) => {
        if (session?.user) {
          setUserId(session.user.id);
        } else {
          setUserId(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Initialize realtime client when userId is available
  useEffect(() => {
    if (userId) {
      const client = new RealtimeClient(supabase, userId);
      setRealtimeClient(client);

      const channel = new BroadcastChannelManager(userId);
      setBroadcastChannel(channel);

      return () => {
        client.unsubscribeAll();
        channel.destroy();
      };
    }
  }, [userId]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Process pending mutations when coming online
  useEffect(() => {
    if (isOnline) {
      offlineQueue.processPending();
    }
  }, [isOnline, offlineQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      optimisticManager.clearAll();
      offlineQueue.clearQueue();
    };
  }, [optimisticManager, offlineQueue]);

  const value = useMemo<RealtimeContextValue>(() => ({
    realtimeClient,
    optimisticManager,
    offlineQueue,
    broadcastChannel,
    isOnline,
    userId,
  }), [realtimeClient, optimisticManager, offlineQueue, broadcastChannel, isOnline, userId]);

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}
