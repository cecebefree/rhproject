/**
 * useAnalytics — Hook for analytics data with date range filtering and metric calculations.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  type DashboardMetrics,
  type DateRange,
  type LeadStage,
  type MetricPeriod,
  type RevenueMetric,
  selectConversionFunnel,
  selectConversionStats,
  selectDashboardMetrics,
  selectPipelineByStage,
  selectPipelineValue,
  selectRevenueMetrics,
} from '../features/office-desk/services/analyticsService';

// ═══════════════════════════════════════════════════════════
// HOOK: useAnalytics
// ═══════════════════════════════════════════════════════════

export function useAnalytics(tenantId: string) {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await selectDashboardMetrics(tenantId, dateRange);
    if (fetchError) {
      setError(fetchError);
    } else {
      setMetrics(data);
    }
    setLoading(false);
  }, [tenantId, dateRange]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const updateDateRange = useCallback((newRange: Partial<DateRange>) => {
    setDateRange((prev) => ({ ...prev, ...newRange }));
  }, []);

  const setDateRangePreset = useCallback((preset: 'week' | 'month' | 'quarter' | 'year') => {
    const end = new Date().toISOString().split('T')[0];
    let start: string;

    switch (preset) {
      case 'week':
        start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'month':
        start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'quarter':
        start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'year':
        start = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
    }

    setDateRange({ start, end });
  }, []);

  return {
    metrics,
    loading,
    error,
    dateRange,
    updateDateRange,
    setDateRangePreset,
    refresh: fetchMetrics,
  };
}

// ═══════════════════════════════════════════════════════════
// HOOK: useRevenueMetrics
// ═══════════════════════════════════════════════════════════

export function useRevenueMetrics(tenantId: string, period: MetricPeriod = 'daily') {
  const [metrics, setMetrics] = useState<RevenueMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await selectRevenueMetrics(tenantId, period);
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setMetrics(data || []);
    }
    setLoading(false);
  }, [tenantId, period]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    refresh: fetchMetrics,
  };
}

// ═══════════════════════════════════════════════════════════
// HOOK: usePipeline
// ═══════════════════════════════════════════════════════════

export function usePipeline(tenantId: string) {
  const [pipeline, setPipeline] = useState<{ stage: LeadStage; label: string; count: number; totalValue: number; paidValue: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await selectPipelineValue(tenantId);
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setPipeline(data || []);
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  return {
    pipeline,
    loading,
    error,
    refresh: fetchPipeline,
  };
}

// ═══════════════════════════════════════════════════════════
// HOOK: useConversionFunnel
// ═══════════════════════════════════════════════════════════

export function useConversionFunnel(tenantId: string, dateRange?: DateRange) {
  const [funnel, setFunnel] = useState<{ stage: string; count: number; rate: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFunnel = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await selectConversionFunnel(tenantId, dateRange);
    if (fetchError) {
      setError(fetchError);
    } else {
      setFunnel(data || []);
    }
    setLoading(false);
  }, [tenantId, dateRange]);

  useEffect(() => {
    fetchFunnel();
  }, [fetchFunnel]);

  return {
    funnel,
    loading,
    error,
    refresh: fetchFunnel,
  };
}

// ═══════════════════════════════════════════════════════════
// HOOK: useConversionStats
// ═══════════════════════════════════════════════════════════

export function useConversionStats(tenantId: string, dateRange?: DateRange) {
  const [stats, setStats] = useState<{
    total: number;
    lead_to_contact: number;
    contact_to_invoice: number;
    lead_to_invoice: number;
    invoice_paid: number;
    lead_convert: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await selectConversionStats(tenantId, dateRange);
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setStats(data);
    }
    setLoading(false);
  }, [tenantId, dateRange]);

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
// HOOK: useMetricCalculation
// ═══════════════════════════════════════════════════════════

export function useMetricCalculation(metrics: DashboardMetrics | null) {
  const calculations = {
    // Growth rates (comparing to previous period - placeholder logic)
    contactGrowth: metrics ? Math.round(metrics.totalContacts * 0.12) : 0,
    leadGrowth: metrics ? Math.round(metrics.totalLeads * 0.08) : 0,
    revenueGrowth: metrics ? Math.round((metrics.paidRevenue / (metrics.totalRevenue || 1)) * 100) : 0,

    // Ratios
    leadToContactRatio: metrics?.totalLeads
      ? Math.round((metrics.totalContacts / metrics.totalLeads) * 100)
      : 0,
    paidToPendingRatio: metrics?.pendingRevenue
      ? Math.round((metrics.paidRevenue / metrics.pendingRevenue) * 100)
      : 0,

    // Averages
    revenuePerLead: metrics?.totalLeads
      ? Math.round(metrics.totalRevenue / metrics.totalLeads)
      : 0,
    revenuePerContact: metrics?.totalContacts
      ? Math.round(metrics.totalRevenue / metrics.totalContacts)
      : 0,
  };

  return calculations;
}
