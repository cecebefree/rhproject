import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { DashboardMetrics } from '../../../types/front-desk';

type Period = 'today' | 'week' | 'month' | 'quarter';

interface UseDashboardMetricsResult {
  metrics: DashboardMetrics | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboardMetrics(period: Period = 'week'): UseDashboardMetricsResult {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc('get_dashboard_metrics', {
      period,
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    setMetrics(data as DashboardMetrics);
    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, refresh: fetchMetrics };
}
