/**
 * WebhookManagementPage — Full webhook management UI.
 * Add/edit/delete webhooks, test webhooks, view event log.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  type Webhook,
  type WebhookCreateInput,
  type WebhookEvent,
  type WebhookEventLog,
  type WebhookUpdateInput,
  WEBHOOK_EVENT_LABELS,
  WEBHOOK_EVENT_STATUS_LABELS,
} from '../services/webhookService';
import {
  useWebhookEvents,
  useWebhooks,
  useWebhookStats,
} from '../../../hooks/useWebhook';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface WebhookFormProps {
  webhook?: Webhook | null;
  onSubmit: (input: WebhookCreateInput | WebhookUpdateInput) => Promise<{ error: string | null }>;
  onCancel: () => void;
  loading?: boolean;
}

interface WebhookEventLogProps {
  events: WebhookEventLog[];
  loading: boolean;
}

// ═══════════════════════════════════════════════════════════
// WEBHOOK FORM COMPONENT
// ═══════════════════════════════════════════════════════════

function WebhookForm({ webhook, onSubmit, onCancel, loading }: WebhookFormProps) {
  const [name, setName] = useState(webhook?.name || '');
  const [url, setUrl] = useState(webhook?.url || '');
  const [description, setDescription] = useState(webhook?.description || '');
  const [events, setEvents] = useState<WebhookEvent[]>(webhook?.events || []);
  const [active, setActive] = useState(webhook?.active ?? true);
  const [retryCount, setRetryCount] = useState(webhook?.retry_count || 3);
  const [timeoutMs, setTimeoutMs] = useState(webhook?.timeout_ms || 5000);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      setSubmitting(false);
      return;
    }

    if (!url.trim()) {
      setError('URL is required');
      setSubmitting(false);
      return;
    }

    try {
      new URL(url);
    } catch {
      setError('Invalid URL format');
      setSubmitting(false);
      return;
    }

    if (events.length === 0) {
      setError('Select at least one event');
      setSubmitting(false);
      return;
    }

    const result = await onSubmit({
      name: name.trim(),
      url: url.trim(),
      description: description.trim() || undefined,
      events,
      active,
      retry_count: retryCount,
      timeout_ms: timeoutMs,
    });

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    }
  };

  const toggleEvent = (event: WebhookEvent) => {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="My Webhook"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL *
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com/webhook"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
          placeholder="Optional description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Events *
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(WEBHOOK_EVENT_LABELS) as WebhookEvent[]).map((event) => (
            <label
              key={event}
              className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={events.includes(event)}
                onChange={() => toggleEvent(event)}
                className="rounded text-blue-600"
              />
              <span className="text-sm">{WEBHOOK_EVENT_LABELS[event]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="active"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="rounded text-blue-600"
        />
        <label htmlFor="active" className="text-sm font-medium text-gray-700">
          Active
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Retry Count
          </label>
          <input
            type="number"
            value={retryCount}
            onChange={(e) => setRetryCount(Number(e.target.value))}
            min={0}
            max={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Timeout (ms)
          </label>
          <input
            type="number"
            value={timeoutMs}
            onChange={(e) => setTimeoutMs(Number(e.target.value))}
            min={1000}
            max={30000}
            step={1000}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {webhook && (
        <div className="bg-gray-50 p-4 rounded">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Secret Key
          </label>
          <code className="text-xs break-all">{webhook.secret_key}</code>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          disabled={submitting || loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          disabled={submitting || loading}
        >
          {submitting ? 'Saving...' : webhook ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════
// WEBHOOK EVENT LOG COMPONENT
// ═══════════════════════════════════════════════════════════

function WebhookEventLogList({ events, loading }: WebhookEventLogProps) {
  if (loading) {
    return <div className="text-center py-4">Loading events...</div>;
  }

  if (events.length === 0) {
    return <div className="text-center py-4 text-gray-500">No events yet</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Event
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Response
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Attempts
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Created
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {events.map((event) => (
            <tr key={event.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm">
                {WEBHOOK_EVENT_LABELS[event.event_type] || event.event_type}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    event.status === 'success'
                      ? 'bg-green-100 text-green-800'
                      : event.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : event.status === 'retrying'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {WEBHOOK_EVENT_STATUS_LABELS[event.status]}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {event.response_status || '-'}
              </td>
              <td className="px-4 py-3 text-sm">
                {event.attempts}/{event.max_attempts}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {new Date(event.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN WEBHOOK MANAGEMENT PAGE
// ═══════════════════════════════════════════════════════════

export default function WebhookManagementPage() {
  const navigate = useNavigate();
  
  // TODO: Get tenant_id from auth context
  const tenantId = '00000000-0000-0000-0000-000000000001';

  const {
    webhooks,
    loading: webhooksLoading,
    error: webhooksError,
    create,
    update,
    remove,
    test,
    refresh: refreshWebhooks,
  } = useWebhooks(tenantId, true);

  const { stats, refresh: refreshStats } = useWebhookStats(tenantId);

  const {
    events,
    loading: eventsLoading,
    refresh: refreshEvents,
  } = useWebhookEvents(tenantId);

  const [showForm, setShowForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    webhookId: string;
    success: boolean;
    error?: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = async (input: WebhookCreateInput | WebhookUpdateInput) => {
    const result = await create(input as WebhookCreateInput);
    if (!result.error) {
      setShowForm(false);
      refreshStats();
    }
    return result;
  };

  const handleUpdate = async (input: WebhookCreateInput | WebhookUpdateInput) => {
    if (!editingWebhook) return { error: 'No webhook selected' };
    const result = await update(editingWebhook.id, input as WebhookUpdateInput);
    if (!result.error) {
      setEditingWebhook(null);
      setShowForm(false);
    }
    return result;
  };

  const handleDelete = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    
    setDeletingId(webhookId);
    const result = await remove(webhookId);
    setDeletingId(null);
    
    if (!result.error) {
      refreshStats();
    }
  };

  const handleTest = async (webhookId: string) => {
    setTestingId(webhookId);
    setTestResult(null);
    
    const result = await test(webhookId);
    setTestResult({
      webhookId,
      success: result.success,
      error: result.error,
    });
    
    setTestingId(null);
    refreshEvents();
  };

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingWebhook(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Webhooks & Automation</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage webhook endpoints and event delivery
              </p>
            </div>
            <button
              onClick={() => {
                setEditingWebhook(null);
                setShowForm(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Webhook
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Success</div>
            <div className="text-2xl font-bold text-green-600">{stats.success}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Failed</div>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Retrying</div>
            <div className="text-2xl font-bold text-blue-600">{stats.retrying}</div>
          </div>
        </div>

        {/* Webhook Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">
                  {editingWebhook ? 'Edit Webhook' : 'Add Webhook'}
                </h2>
                <WebhookForm
                  webhook={editingWebhook}
                  onSubmit={editingWebhook ? handleUpdate : handleCreate}
                  onCancel={handleCancel}
                  loading={webhooksLoading}
                />
              </div>
            </div>
          </div>
        )}

        {/* Webhooks List */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Webhooks</h2>
          </div>
          
          {webhooksLoading ? (
            <div className="p-4 text-center text-gray-500">Loading webhooks...</div>
          ) : webhooksError ? (
            <div className="p-4 text-center text-red-500">{webhooksError}</div>
          ) : webhooks.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No webhooks configured. Click "Add Webhook" to create one.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {webhooks.map((webhook: Webhook) => (
                <div key={webhook.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium">{webhook.name}</h3>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            webhook.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {webhook.active ? 'Active' : 'Inactive'}
                        </span>
                        {testResult && testResult.webhookId === webhook.id && (
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              testResult.success
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {testResult.success ? 'Test Passed' : 'Test Failed'}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        {webhook.url}
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        Events: {webhook.events.map((e: WebhookEvent) => WEBHOOK_EVENT_LABELS[e]).join(', ')}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleTest(webhook.id)}
                        disabled={testingId === webhook.id}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                      >
                        {testingId === webhook.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        onClick={() => handleEdit(webhook)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(webhook.id)}
                        disabled={deletingId === webhook.id}
                        className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === webhook.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Event Log */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Event Log</h2>
            <button
              onClick={refreshEvents}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
          <WebhookEventLogList events={events} loading={eventsLoading} />
        </div>
      </div>
    </div>
  );
}
