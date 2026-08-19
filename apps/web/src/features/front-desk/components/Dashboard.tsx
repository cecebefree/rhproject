import { useState } from 'react';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';

type DashboardPeriod = 'today' | 'week' | 'month';

interface DashboardProps {
  showPeriodSelector?: boolean;
}

export function Dashboard({ showPeriodSelector = true }: DashboardProps) {
  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const { metrics, loading, error } = useDashboardMetrics(period);

  if (error) {
    return <div className="text-red-600 p-4">Error: {error}</div>;
  }

  return (
    <div className="w-full">
      {/* Period Selector */}
      {showPeriodSelector && (
        <div className="flex gap-2 mb-6 p-4 border rounded bg-gray-50">
          <button
            onClick={() => setPeriod('today')}
            className={`px-4 py-2 rounded text-sm font-medium ${
              period === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded text-sm font-medium ${
              period === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded text-sm font-medium ${
              period === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            This Month
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading metrics...</div>
      ) : metrics ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {/* Inquiries Received */}
          <div className="border rounded p-6 bg-white shadow-sm">
            <div className="text-gray-600 text-sm font-semibold mb-2">Inquiries Received</div>
            <div className="text-3xl font-bold text-blue-600">{metrics.inquiries_received}</div>
            <div className="text-xs text-gray-400 mt-2">Total for period</div>
          </div>

          {/* Avg Response Time */}
          <div className="border rounded p-6 bg-white shadow-sm">
            <div className="text-gray-600 text-sm font-semibold mb-2">Avg Response Time</div>
            <div className="text-3xl font-bold text-green-600">
              {metrics.avg_response_time_seconds
                ? `${Math.round(metrics.avg_response_time_seconds / 60)}m`
                : '—'}
            </div>
            <div className="text-xs text-gray-400 mt-2">Minutes to assign</div>
          </div>

          {/* Callbacks Scheduled */}
          <div className="border rounded p-6 bg-white shadow-sm">
            <div className="text-gray-600 text-sm font-semibold mb-2">Callbacks Scheduled</div>
            <div className="text-3xl font-bold text-orange-600">{metrics.callbacks_scheduled}</div>
            <div className="text-xs text-gray-400 mt-2">Pending calls</div>
          </div>

          {/* Show Rate */}
          <div className="border rounded p-6 bg-white shadow-sm">
            <div className="text-gray-600 text-sm font-semibold mb-2">Show Rate</div>
            <div className="text-3xl font-bold text-purple-600">
              {metrics.show_rate_percent ? `${Math.round(metrics.show_rate_percent)}%` : '—'}
            </div>
            <div className="text-xs text-gray-400 mt-2">Attended / Scheduled</div>
          </div>

          {/* Conversion Rate */}
          <div className="border rounded p-6 bg-white shadow-sm">
            <div className="text-gray-600 text-sm font-semibold mb-2">Conversion Rate</div>
            <div className="text-3xl font-bold text-red-600">
              {metrics.conversion_percent ? `${Math.round(metrics.conversion_percent)}%` : '—'}
            </div>
            <div className="text-xs text-gray-400 mt-2">Offered / Called</div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">No data available</div>
      )}
    </div>
  );
}
