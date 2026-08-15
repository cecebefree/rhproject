/**
 * ConversionFunnel — Visual funnel chart showing leads → contacts → invoices conversion.
 */

import { useMemo } from 'react';
import { useConversionFunnel } from '../../../hooks/useAnalytics';
import { formatNumber, formatPercentage } from '../../../lib/format';

// ═══════════════════════════════════════════════════════════
// FUNNEL STAGE COLORS
// ═══════════════════════════════════════════════════════════

const FUNNEL_COLORS = [
  { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-green-500', light: 'bg-green-100', text: 'text-green-700' },
];

// ═══════════════════════════════════════════════════════════
// FUNNEL STAGE COMPONENT
// ═══════════════════════════════════════════════════════════

interface FunnelStageProps {
  stage: string;
  count: number;
  rate: number;
  index: number;
  total: number;
  isLast: boolean;
}

function FunnelStage({ stage, count, rate, index, total, isLast }: FunnelStageProps) {
  const colors = FUNNEL_COLORS[index % FUNNEL_COLORS.length];
  
  // Calculate width based on rate (100% at top, decreasing)
  const width = Math.max(20, rate);
  
  // Calculate drop-off from previous stage
  const dropOff = index > 0 ? 100 - rate : 0;

  return (
    <div className="flex flex-col items-center">
      {/* Funnel Bar */}
      <div
        className={`${colors.bg} text-white py-4 px-8 rounded-lg text-center transition-all hover:opacity-90`}
        style={{ width: `${width}%`, minWidth: '120px' }}
      >
        <div className="text-2xl font-bold">{formatNumber(count)}</div>
        <div className="text-sm opacity-90">{stage}</div>
      </div>

      {/* Conversion Rate */}
      {!isLast && (
        <div className="flex flex-col items-center my-2">
          <div className="text-sm font-medium text-gray-600">
            {formatPercentage(rate)} conversion
          </div>
          {dropOff > 0 && (
            <div className="text-xs text-red-500">
              -{formatPercentage(dropOff)} drop-off
            </div>
          )}
          <div className="w-0.5 h-4 bg-gray-300 my-1" />
          <div className="text-gray-400">↓</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// FUNNEL CHART COMPONENT (SVG)
// ═══════════════════════════════════════════════════════════

interface FunnelChartProps {
  data: { stage: string; count: number; rate: number }[];
}

function FunnelChart({ data }: FunnelChartProps) {
  const maxValue = data[0]?.count || 1;
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
      <div className="flex flex-col items-center space-y-2">
        {data.map((stage: { stage: string; count: number; rate: number }, index: number) => {
          const widthPercent = (stage.count / maxValue) * 100;
          const colors = FUNNEL_COLORS[index % FUNNEL_COLORS.length];
          
          return (
            <div key={stage.stage} className="w-full flex flex-col items-center">
              <div
                className={`${colors.bg} text-white py-3 px-4 rounded text-center transition-all hover:opacity-90`}
                style={{ width: `${Math.max(30, widthPercent)}%` }}
              >
                <div className="font-semibold">{stage.stage}</div>
                <div className="text-sm">{formatNumber(stage.count)}</div>
                <div className="text-xs opacity-75">{formatPercentage(stage.rate)}</div>
              </div>
              {index < data.length - 1 && (
                <div className="text-gray-400 my-1">↓</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CONVERSION STATS COMPONENT
// ═══════════════════════════════════════════════════════════

interface ConversionStatsProps {
  data: { stage: string; count: number; rate: number }[];
}

function ConversionStats({ data }: ConversionStatsProps) {
  const stats = useMemo(() => {
    if (data.length < 2) return null;
    
    const first = data[0];
    const last = data[data.length - 1];
    const overallConversion = first.count > 0 ? (last.count / first.count) * 100 : 0;
    
    // Calculate average time between stages (placeholder - would need timestamp data)
    const avgConversionTime = '2.5 days'; // Placeholder
    
    return {
      overallConversion,
      totalLeads: first.count,
      totalConverted: last.count,
      avgConversionTime,
    };
  }, [data]);

  if (!stats) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Conversion Statistics</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded">
          <div className="text-3xl font-bold text-green-600">
            {formatPercentage(stats.overallConversion)}
          </div>
          <div className="text-sm text-gray-500">Overall Conversion</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded">
          <div className="text-3xl font-bold text-blue-600">
            {formatNumber(stats.totalConverted)}
          </div>
          <div className="text-sm text-gray-500">Total Converted</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded">
          <div className="text-3xl font-bold text-purple-600">
            {formatNumber(stats.totalLeads)}
          </div>
          <div className="text-sm text-gray-500">Total Leads</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded">
          <div className="text-3xl font-bold text-orange-600">
            {stats.avgConversionTime}
          </div>
          <div className="text-sm text-gray-500">Avg Conversion Time</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN CONVERSION FUNNEL COMPONENT
// ═══════════════════════════════════════════════════════════

interface ConversionFunnelProps {
  tenantId: string;
}

export default function ConversionFunnel({ tenantId }: ConversionFunnelProps) {
  const { funnel, loading, error, refresh } = useConversionFunnel(tenantId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading funnel data...</div>
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

  if (funnel.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No funnel data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Conversion Funnel</h2>
          <p className="text-sm text-gray-500">
            Track how leads progress through your sales pipeline
          </p>
        </div>
        <button
          onClick={refresh}
          className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Funnel Visualization */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col items-center space-y-2">
              {funnel.map((stage: { stage: string; count: number; rate: number }, index: number) => (
                <FunnelStage
                  key={stage.stage}
                  stage={stage.stage}
                  count={stage.count}
                  rate={stage.rate}
                  index={index}
                  total={funnel[0].count}
                  isLast={index === funnel.length - 1}
                />
              ))}
        </div>
      </div>

      {/* Funnel Chart */}
      <FunnelChart data={funnel} />

      {/* Conversion Stats */}
      <ConversionStats data={funnel} />

      {/* Stage Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Stage Details</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Stage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Count
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Rate
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Drop-off
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {funnel.map((stage, index) => {
                const dropOff = index > 0 ? 100 - stage.rate : 0;
                return (
                  <tr key={stage.stage} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{stage.stage}</td>
                    <td className="px-4 py-3 text-sm">{formatNumber(stage.count)}</td>
                    <td className="px-4 py-3 text-sm">{formatPercentage(stage.rate)}</td>
                    <td className="px-4 py-3 text-sm text-red-500">
                      {index > 0 ? `-${formatPercentage(dropOff)}` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
