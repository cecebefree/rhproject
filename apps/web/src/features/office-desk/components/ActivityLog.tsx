/**
 * ActivityLog — Detailed activity log viewer with filtering.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAnalytics } from '../../../hooks/useAnalytics';
import {
  type ActivityEventCategory,
  type ActivityEventType,
  type UserActivityLog,
  selectActivityLog,
} from '../services/analyticsService';
import { formatDate, formatTime } from '../../../lib/format';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

type EventTypeFilter = ActivityEventType | 'all';
type EventCategoryFilter = ActivityEventCategory | 'all';

// ═══════════════════════════════════════════════════════════
// EVENT TYPE LABELS
// ═══════════════════════════════════════════════════════════

const EVENT_TYPE_LABELS: Record<ActivityEventType, string> = {
  page_view: 'Page View',
  button_click: 'Button Click',
  form_submit: 'Form Submit',
  search: 'Search',
  export: 'Export',
  import: 'Import',
  login: 'Login',
  logout: 'Logout',
  api_call: 'API Call',
};

const EVENT_CATEGORY_LABELS: Record<ActivityEventCategory, string> = {
  navigation: 'Navigation',
  interaction: 'Interaction',
  data: 'Data',
  auth: 'Auth',
  system: 'System',
};

const EVENT_TYPE_ICONS: Record<ActivityEventType, string> = {
  page_view: '👁️',
  button_click: '🖱️',
  form_submit: '📝',
  search: '🔍',
  export: '📤',
  import: '📥',
  login: '🔑',
  logout: '🚪',
  api_call: '🔗',
};

// ═══════════════════════════════════════════════════════════
// ACTIVITY ROW COMPONENT
// ═══════════════════════════════════════════════════════════

interface ActivityRowProps {
  activity: UserActivityLog;
}

function ActivityRow({ activity }: ActivityRowProps) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center space-x-2">
          <span>{EVENT_TYPE_ICONS[activity.event_type]}</span>
          <span className="text-sm font-medium">
            {EVENT_TYPE_LABELS[activity.event_type]}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            activity.event_category === 'navigation'
              ? 'bg-blue-100 text-blue-800'
              : activity.event_category === 'interaction'
              ? 'bg-green-100 text-green-800'
              : activity.event_category === 'data'
              ? 'bg-purple-100 text-purple-800'
              : activity.event_category === 'auth'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {EVENT_CATEGORY_LABELS[activity.event_category]}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {activity.page_path || '-'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {activity.element_text || '-'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {formatDate(activity.created_at)} {formatTime(activity.created_at)}
      </td>
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN ACTIVITY LOG COMPONENT
// ═══════════════════════════════════════════════════════════

interface ActivityLogProps {
  tenantId: string;
}

export default function ActivityLog({ tenantId }: ActivityLogProps) {
  const { dateRange, setDateRangePreset } = useAnalytics(tenantId);
  const [activities, setActivities] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<EventCategoryFilter>('all');

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await selectActivityLog(tenantId, dateRange, 100);
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setActivities(data || []);
    }
    setLoading(false);
  }, [tenantId, dateRange]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    if (eventTypeFilter !== 'all' && activity.event_type !== eventTypeFilter) {
      return false;
    }
    if (categoryFilter !== 'all' && activity.event_category !== categoryFilter) {
      return false;
    }
    return true;
  });

  // Calculate stats
  const stats = {
    total: activities.length,
    pageViews: activities.filter((a) => a.event_type === 'page_view').length,
    interactions: activities.filter((a) => a.event_type === 'button_click').length,
    searches: activities.filter((a) => a.event_type === 'search').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading activity log...</div>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Activity Log</h2>
          <p className="text-sm text-gray-500">
            {stats.total} total activities • {stats.pageViews} page views •{' '}
            {stats.interactions} interactions
          </p>
        </div>
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
            onClick={fetchActivities}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value as EventTypeFilter)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Types</option>
              {(Object.keys(EVENT_TYPE_LABELS) as ActivityEventType[]).map((type) => (
                <option key={type} value={type}>
                  {EVENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as EventCategoryFilter)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Categories</option>
              {(Object.keys(EVENT_CATEGORY_LABELS) as ActivityEventCategory[]).map(
                (category) => (
                  <option key={category} value={category}>
                    {EVENT_CATEGORY_LABELS[category]}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Event
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Page
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Element
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredActivities.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No activities found
                </td>
              </tr>
            ) : (
              filteredActivities.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.pageViews}</div>
          <div className="text-sm text-gray-500">Page Views</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.interactions}</div>
          <div className="text-sm text-gray-500">Interactions</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.searches}</div>
          <div className="text-sm text-gray-500">Searches</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Events</div>
        </div>
      </div>
    </div>
  );
}
