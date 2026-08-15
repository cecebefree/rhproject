/**
 * AnalyticsPage — Tab navigation for Overview, Pipeline, Funnel, Activity.
 */

import { useState } from 'react';
import AnalyticsDashboard from './AnalyticsDashboard';
import DealPipeline from './DealPipeline';
import ConversionFunnel from './ConversionFunnel';
import ActivityLog from './ActivityLog';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

type TabId = 'overview' | 'pipeline' | 'funnel' | 'activity';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'pipeline', label: 'Pipeline', icon: '🔄' },
  { id: 'funnel', label: 'Funnel', icon: '🎯' },
  { id: 'activity', label: 'Activity', icon: '📝' },
];

// ═══════════════════════════════════════════════════════════
// MAIN ANALYTICS PAGE
// ═══════════════════════════════════════════════════════════

interface AnalyticsPageProps {
  tenantId?: string;
}

export default function AnalyticsPage({ tenantId }: AnalyticsPageProps) {
  // Default tenant ID - in production, this would come from auth context
  const effectiveTenantId = tenantId || '00000000-0000-0000-0000-000000000001';
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AnalyticsDashboard tenantId={effectiveTenantId} />;
      case 'pipeline':
        return <DealPipeline tenantId={effectiveTenantId} />;
      case 'funnel':
        return <ConversionFunnel tenantId={effectiveTenantId} />;
      case 'activity':
        return <ActivityLog tenantId={effectiveTenantId} />;
      default:
        return <AnalyticsDashboard tenantId={effectiveTenantId} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
              <p className="mt-1 text-sm text-gray-500">
                Insights and metrics for your business
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
    </div>
  );
}
