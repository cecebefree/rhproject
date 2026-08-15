/**
 * AnalyticsDashboard — Main dashboard with metric cards and charts.
 */

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAnalytics, useMetricCalculation } from '../../../hooks/useAnalytics';
import { formatCurrency } from '../../../lib/format';

// ═══════════════════════════════════════════════════════════
// METRIC CARD COMPONENT
// ═══════════════════════════════════════════════════════════

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: string;
  color: string;
}

function MetricCard({ title, value, change, icon, color }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change !== undefined && (
            <p
              className={`text-sm mt-1 ${
                change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {change >= 0 ? '+' : ''}{change}% vs last period
            </p>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}
        >
          <span className="text-xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// REVENUE CHART COMPONENT
// ═══════════════════════════════════════════════════════════

interface RevenueChartProps {
  data: { metric_date: string; total_revenue: number; paid_revenue: number }[];
}

function RevenueChart({ data }: RevenueChartProps) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        date: new Date(d.metric_date).toLocaleDateString('en-ZA', {
          month: 'short',
          day: 'numeric',
        }),
        total: d.total_revenue,
        paid: d.paid_revenue,
      })),
    [data]
  );

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No revenue data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value || 0))}
            />
            <Area
              type="monotone"
              dataKey="total"
              stackId="1"
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.3}
              name="Total Revenue"
            />
            <Area
              type="monotone"
              dataKey="paid"
              stackId="2"
              stroke="#82ca9d"
              fill="#82ca9d"
              fillOpacity={0.3}
              name="Paid Revenue"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PIPELINE CHART COMPONENT
// ═══════════════════════════════════════════════════════════

interface PipelineChartProps {
  data: { stage: string; label: string; count: number; totalValue: number }[];
}

function PipelineChart({ data }: PipelineChartProps) {
  const chartData = useMemo(
    () => data.map((d) => ({ name: d.label, count: d.count, value: d.totalValue })),
    [data]
  );

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Deal Pipeline</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No pipeline data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Deal Pipeline</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value, name) =>
                name === 'value' ? formatCurrency(Number(value || 0)) : value
              }
            />
            <Bar dataKey="count" fill="#8884d8" name="Leads" />
            <Bar dataKey="value" fill="#82ca9d" name="Value" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ACTIVITY FEED COMPONENT
// ═══════════════════════════════════════════════════════════

interface ActivityFeedProps {
  activities: { event_type: string; page_path: string | null; created_at: string }[];
}

function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="text-center text-gray-500 py-4">No recent activity</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {activities.map((activity, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-2 border-b last:border-0"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm">
                  {activity.event_type === 'page_view' && '👁️'}
                  {activity.event_type === 'button_click' && '🖱️'}
                  {activity.event_type === 'form_submit' && '📝'}
                  {activity.event_type === 'search' && '🔍'}
                  {activity.event_type === 'export' && '📤'}
                  {activity.event_type === 'login' && '🔑'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">
                  {activity.event_type.replace(/_/g, ' ')}
                </p>
                {activity.page_path && (
                  <p className="text-xs text-gray-500">{activity.page_path}</p>
                )}
              </div>
            </div>
            <span className="text-xs text-gray-500">
              {new Date(activity.created_at).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN ANALYTICS DASHBOARD
// ═══════════════════════════════════════════════════════════

interface AnalyticsDashboardProps {
  tenantId: string;
}

export default function AnalyticsDashboard({ tenantId }: AnalyticsDashboardProps) {
  const { metrics, loading, error, dateRange, setDateRangePreset, refresh } =
    useAnalytics(tenantId);
  const calculations = useMetricCalculation(metrics);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-8 text-gray-500">No analytics data available</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Analytics Overview</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setDateRangePreset('week')}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            7 Days
          </button>
          <button
            onClick={() => setDateRangePreset('month')}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            30 Days
          </button>
          <button
            onClick={() => setDateRangePreset('quarter')}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            90 Days
          </button>
          <button
            onClick={() => setDateRangePreset('year')}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            1 Year
          </button>
          <button
            onClick={refresh}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Contacts"
          value={metrics.totalContacts}
          change={calculations.contactGrowth}
          icon="👥"
          color="bg-blue-100"
        />
        <MetricCard
          title="Total Leads"
          value={metrics.totalLeads}
          change={calculations.leadGrowth}
          icon="📊"
          color="bg-green-100"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.conversionRate.toFixed(1)}%`}
          icon="🎯"
          color="bg-purple-100"
        />
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          change={calculations.revenueGrowth}
          icon="💰"
          color="bg-yellow-100"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Paid Revenue"
          value={formatCurrency(metrics.paidRevenue)}
          icon="✅"
          color="bg-green-100"
        />
        <MetricCard
          title="Pending Revenue"
          value={formatCurrency(metrics.pendingRevenue)}
          icon="⏳"
          color="bg-orange-100"
        />
        <MetricCard
          title="Avg Invoice Value"
          value={formatCurrency(metrics.averageInvoiceValue)}
          icon="📄"
          color="bg-blue-100"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={metrics.revenueTrend} />
        <PipelineChart data={metrics.pipelineByStage} />
      </div>

      {/* Activity Feed */}
      <ActivityFeed activities={metrics.recentActivity} />
    </div>
  );
}
