/**
 * EmailTemplateManagementPage — Full email template management UI.
 * Add/edit/delete templates, preview templates, view usage history.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  type EmailTemplate,
  type EmailTemplateCreateInput,
  type EmailTemplateUpdateInput,
  type EmailTemplateUsage,
} from '../services/emailTemplateService';
import {
  useEmailTemplates,
  useTemplateStats,
  useTemplateUsage,
} from '../../../hooks/useEmailTemplate';
import { EmailTemplateEditor } from './EmailTemplateEditor';
import { EmailPreviewModal } from './EmailPreviewModal';
import { ScheduledEmailModal } from './ScheduledEmailModal';
import { TEMPLATE_USAGE_STATUS_LABELS } from '../services/emailTemplateService';

// ═══════════════════════════════════════════════════════════
// MAIN EMAIL TEMPLATE MANAGEMENT PAGE
// ═══════════════════════════════════════════════════════════

export default function EmailTemplateManagementPage() {
  // TODO: Get tenant_id from auth context
  const tenantId = '00000000-0000-0000-0000-000000000001';

  const {
    templates,
    loading: templatesLoading,
    error: templatesError,
    create,
    update,
    remove,
    refresh: refreshTemplates,
  } = useEmailTemplates(tenantId, true);

  const { stats, refresh: refreshStats } = useTemplateStats(tenantId);

  const {
    usages,
    loading: usagesLoading,
    refresh: refreshUsages,
  } = useTemplateUsage(tenantId);

  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Editor form state
  const [formName, setFormName] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formVariables, setFormVariables] = useState<string[]>([]);
  const [formActive, setFormActive] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset form
  const resetForm = useCallback(() => {
    setFormName('');
    setFormSubject('');
    setFormBody('');
    setFormVariables([]);
    setFormActive(true);
    setFormError(null);
  }, []);

  // Open editor for new template
  const handleCreate = useCallback(() => {
    resetForm();
    setEditingTemplate(null);
    setShowEditor(true);
  }, [resetForm]);

  // Open editor for existing template
  const handleEdit = useCallback((template: EmailTemplate) => {
    setFormName(template.name);
    setFormSubject(template.subject);
    setFormBody(template.body);
    setFormVariables(template.variables || []);
    setFormActive(template.active);
    setEditingTemplate(template);
    setFormError(null);
    setShowEditor(true);
  }, []);

  // Submit editor form
  const handleFormSubmit = useCallback(async () => {
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Template name is required');
      return;
    }
    if (!formSubject.trim()) {
      setFormError('Subject is required');
      return;
    }
    if (!formBody.trim()) {
      setFormError('Body is required');
      return;
    }

    setFormSubmitting(true);

    const input: EmailTemplateCreateInput | EmailTemplateUpdateInput = {
      name: formName.trim(),
      subject: formSubject.trim(),
      body: formBody.trim(),
      variables: formVariables,
      active: formActive,
    };

    let result;
    if (editingTemplate) {
      result = await update(editingTemplate.id, input);
    } else {
      result = await create(input as EmailTemplateCreateInput);
    }

    setFormSubmitting(false);

    if (result.error) {
      setFormError(result.error);
    } else {
      setShowEditor(false);
      resetForm();
      refreshStats();
    }
  }, [
    formName,
    formSubject,
    formBody,
    formVariables,
    formActive,
    editingTemplate,
    create,
    update,
    resetForm,
    refreshStats,
  ]);

  // Delete template
  const handleDelete = useCallback(
    async (templateId: string) => {
      if (!confirm('Are you sure you want to delete this template?')) return;

      setDeletingId(templateId);
      const result = await remove(templateId);
      setDeletingId(null);

      if (!result.error) {
        refreshStats();
      }
    },
    [remove, refreshStats]
  );

  // Preview template
  const handlePreview = useCallback((template: EmailTemplate) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  }, []);

  // Schedule email
  const handleSchedule = useCallback(() => {
    setShowSchedule(true);
  }, []);

  // Handle schedule submit
  const handleScheduleSubmit = useCallback(
    async (data: {
      templateId: string;
      recipientEmail: string;
      recipientName: string;
      scheduledAt: string;
      variables: Record<string, string>;
    }) => {
      // TODO: Implement actual scheduling via edge function
      console.log('Schedule email:', data);
      refreshUsages();
      return { error: null };
    },
    [refreshUsages]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage email templates and scheduled sends
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSchedule}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Schedule Email
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Template
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Templates</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Active</div>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Inactive</div>
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
          </div>
        </div>

        {/* Editor Modal */}
        {showEditor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">
                  {editingTemplate ? 'Edit Template' : 'Add Template'}
                </h2>

                {formError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                    {formError}
                  </div>
                )}

                <EmailTemplateEditor
                  name={formName}
                  subject={formSubject}
                  body={formBody}
                  variables={formVariables}
                  onNameChange={setFormName}
                  onSubjectChange={setFormSubject}
                  onBodyChange={setFormBody}
                  onVariablesChange={setFormVariables}
                  disabled={formSubmitting}
                />

                {/* Active Toggle */}
                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="rounded text-blue-600"
                    disabled={formSubmitting}
                  />
                  <label htmlFor="active" className="text-sm font-medium text-gray-700">
                    Active
                  </label>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowEditor(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    disabled={formSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFormSubmit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    disabled={formSubmitting}
                  >
                    {formSubmitting
                      ? 'Saving...'
                      : editingTemplate
                      ? 'Update'
                      : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        <EmailPreviewModal
          template={previewTemplate}
          isOpen={showPreview}
          onClose={() => {
            setShowPreview(false);
            setPreviewTemplate(null);
          }}
        />

        {/* Schedule Modal */}
        <ScheduledEmailModal
          templates={templates}
          isOpen={showSchedule}
          onClose={() => setShowSchedule(false)}
          onSchedule={handleScheduleSubmit}
        />

        {/* Templates List */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Templates</h2>
          </div>

          {templatesLoading ? (
            <div className="p-4 text-center text-gray-500">Loading templates...</div>
          ) : templatesError ? (
            <div className="p-4 text-center text-red-500">{templatesError}</div>
          ) : templates.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No templates yet. Click &quot;Add Template&quot; to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Variables
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {templates.map((template) => (
                    <tr key={template.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {template.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {template.subject}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            template.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {template.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {template.variables?.length || 0} variables
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(template.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handlePreview(template)}
                            className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => handleEdit(template)}
                            className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(template.id)}
                            disabled={deletingId === template.id}
                            className="px-2 py-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            {deletingId === template.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Usage History */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Usage History</h2>
            <button
              onClick={refreshUsages}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          {usagesLoading ? (
            <div className="p-4 text-center text-gray-500">Loading usage history...</div>
          ) : usages.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No usage history yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Template
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Sent At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usages.map((usage) => {
                    const template = templates.find((t) => t.id === usage.template_id);
                    return (
                      <tr key={usage.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {template?.name || 'Unknown Template'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {usage.contact_id || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              usage.status === 'sent'
                                ? 'bg-green-100 text-green-800'
                                : usage.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {TEMPLATE_USAGE_STATUS_LABELS[usage.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(usage.sent_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
