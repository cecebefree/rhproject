/**
 * useWebhook — Hook for webhook CRUD operations and event testing.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  type Webhook,
  type WebhookCreateInput,
  type WebhookEvent,
  type WebhookEventLog,
  type WebhookEventStatus,
  type WebhookUpdateInput,
  deleteWebhook,
  emitWebhookEvent,
  getWebhookById,
  getWebhookEventStats,
  getWebhookStats,
  insertWebhook,
  processPendingEvents,
  selectAllWebhookEvents,
  selectWebhookEvents,
  selectWebhooks,
  subscribeToWebhookEvents,
  subscribeToWebhooks,
  testWebhook,
  updateWebhook,
} from '../features/office-desk/services/webhookService';

// ═══════════════════════════════════════════════════════════
// HOOK: useWebhooks
// ═══════════════════════════════════════════════════════════

export function useWebhooks(tenantId: string, includeInactive = false) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await selectWebhooks(tenantId, includeInactive);
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setWebhooks(data || []);
    }
    setLoading(false);
  }, [tenantId, includeInactive]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  // Realtime subscription
  useEffect(() => {
    const channel = subscribeToWebhooks(tenantId, () => {
      fetchWebhooks();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [tenantId, fetchWebhooks]);

  const create = useCallback(
    async (input: WebhookCreateInput, userId?: string) => {
      const { data, error: createError } = await insertWebhook(input, tenantId, userId);
      if (createError) {
        return { data: null, error: createError.message };
      }
      await fetchWebhooks();
      return { data, error: null };
    },
    [tenantId, fetchWebhooks]
  );

  const update = useCallback(
    async (webhookId: string, updates: WebhookUpdateInput) => {
      const { data, error: updateError } = await updateWebhook(webhookId, updates);
      if (updateError) {
        return { data: null, error: updateError.message };
      }
      await fetchWebhooks();
      return { data, error: null };
    },
    [fetchWebhooks]
  );

  const remove = useCallback(
    async (webhookId: string) => {
      const { error: deleteError } = await deleteWebhook(webhookId);
      if (deleteError) {
        return { error: deleteError.message };
      }
      await fetchWebhooks();
      return { error: null };
    },
    [fetchWebhooks]
  );

  const test = useCallback(async (webhookId: string) => {
    return testWebhook(webhookId);
  }, []);

  const emit = useCallback(
    async (eventType: WebhookEvent, payload: Record<string, unknown>) => {
      return emitWebhookEvent(tenantId, eventType, payload);
    },
    [tenantId]
  );

  return {
    webhooks,
    loading,
    error,
    create,
    update,
    remove,
    test,
    emit,
    refresh: fetchWebhooks,
  };
}

// ═══════════════════════════════════════════════════════════
// HOOK: useWebhook
// ═══════════════════════════════════════════════════════════

export function useWebhook(webhookId: string | null) {
  const [webhook, setWebhook] = useState<Webhook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWebhook = useCallback(async () => {
    if (!webhookId) {
      setWebhook(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await getWebhookById(webhookId);
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setWebhook(data);
    }
    setLoading(false);
  }, [webhookId]);

  useEffect(() => {
    fetchWebhook();
  }, [fetchWebhook]);

  const update = useCallback(
    async (updates: WebhookUpdateInput) => {
      if (!webhookId) return { data: null, error: 'No webhook ID' };
      const { data, error: updateError } = await updateWebhook(webhookId, updates);
      if (updateError) {
        return { data: null, error: updateError.message };
      }
      await fetchWebhook();
      return { data, error: null };
    },
    [webhookId, fetchWebhook]
  );

  const remove = useCallback(async () => {
    if (!webhookId) return { error: 'No webhook ID' };
    const { error: deleteError } = await deleteWebhook(webhookId);
    if (deleteError) {
      return { error: deleteError.message };
    }
    return { error: null };
  }, [webhookId]);

  const test = useCallback(async () => {
    if (!webhookId) return { success: false, error: 'No webhook ID' };
    return testWebhook(webhookId);
  }, [webhookId]);

  return {
    webhook,
    loading,
    error,
    update,
    remove,
    test,
    refresh: fetchWebhook,
  };
}

// ═══════════════════════════════════════════════════════════
// HOOK: useWebhookEvents
// ═══════════════════════════════════════════════════════════

export function useWebhookEvents(
  tenantId: string,
  webhookId?: string,
  statusFilter?: WebhookEventStatus
) {
  const [events, setEvents] = useState<WebhookEventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    let result;
    if (webhookId) {
      result = await selectWebhookEvents(webhookId);
    } else {
      result = await selectAllWebhookEvents(tenantId, 50, 0, statusFilter);
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      setEvents(result.data || []);
    }
    setLoading(false);
  }, [tenantId, webhookId, statusFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Realtime subscription
  useEffect(() => {
    const channel = subscribeToWebhookEvents(tenantId, () => {
      fetchEvents();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [tenantId, fetchEvents]);

  return {
    events,
    loading,
    error,
    refresh: fetchEvents,
  };
}

// ═══════════════════════════════════════════════════════════
// HOOK: useWebhookStats
// ═══════════════════════════════════════════════════════════

export function useWebhookStats(tenantId: string) {
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    pending: 0,
    retrying: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWebhookStats(tenantId);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh: fetchStats,
  };
}

// ═══════════════════════════════════════════════════════════
// HOOK: useWebhookProcessor
// ═══════════════════════════════════════════════════════════

export function useWebhookProcessor() {
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    processed: number;
    succeeded: number;
    failed: number;
  } | null>(null);

  const process = useCallback(async (maxEvents = 10) => {
    setProcessing(true);
    try {
      const result = await processPendingEvents(maxEvents);
      setLastResult(result);
      return result;
    } finally {
      setProcessing(false);
    }
  }, []);

  return {
    processing,
    lastResult,
    process,
  };
}
