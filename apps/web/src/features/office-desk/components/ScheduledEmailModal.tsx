// ScheduledEmailModal — Schedule template sends modal

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { EmailTemplate } from '../services/emailTemplateService';
import { substituteVariables } from '../services/emailTemplateService';
import { useResponsive } from '../../../components/MobileNav';

interface ScheduledEmailModalProps {
  templates: EmailTemplate[];
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (data: {
    templateId: string;
    recipientEmail: string;
    recipientName: string;
    scheduledAt: string;
    variables: Record<string, string>;
  }) => Promise<{ error: string | null }>;
}

export function ScheduledEmailModal({
  templates,
  isOpen,
  onClose,
  onSchedule,
}: ScheduledEmailModalProps) {
  const { isMobile } = useResponsive();
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get selected template
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  // Initialize variable values when template changes
  useEffect(() => {
    if (selectedTemplate?.variables) {
      const initialValues: Record<string, string> = {};
      selectedTemplate.variables.forEach((v) => {
        initialValues[v] = '';
      });
      setVariableValues(initialValues);
    } else {
      setVariableValues({});
    }
  }, [selectedTemplate]);

  // Preview with current values
  const preview = useMemo(() => {
    if (!selectedTemplate) return null;
    const subject = substituteVariables(selectedTemplate.subject, variableValues);
    const body = substituteVariables(selectedTemplate.body, variableValues);
    return { subject, body };
  }, [selectedTemplate, variableValues]);

  const handleVariableChange = useCallback((variable: string, value: string) => {
    setVariableValues((prev) => ({ ...prev, [variable]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedTemplateId) {
      setError('Please select a template');
      return;
    }
    if (!recipientEmail.trim()) {
      setError('Recipient email is required');
      return;
    }
    if (!scheduledDate) {
      setError('Scheduled date is required');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      setError('Invalid email format');
      return;
    }

    // Combine date and time
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

    setSubmitting(true);
    const result = await onSchedule({
      templateId: selectedTemplateId,
      recipientEmail: recipientEmail.trim(),
      recipientName: recipientName.trim(),
      scheduledAt,
      variables: variableValues,
    });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        // Reset form
        setSelectedTemplateId('');
        setRecipientEmail('');
        setRecipientName('');
        setScheduledDate('');
        setScheduledTime('09:00');
        setVariableValues({});
        setSuccess(false);
      }, 1500);
    }
  };

  if (!isOpen) return null;

  // Get today's date for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-white rounded-lg shadow-xl ${
          isMobile ? 'w-full mx-4' : 'max-w-2xl w-full mx-4'
        } max-h-[90vh] overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Schedule Email</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
              Email scheduled successfully!
            </div>
          )}

          {/* Template Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template *
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
            >
              <option value="">Select a template...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient Email *
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="recipient@example.com"
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient Name
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={today}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Variables */}
          {selectedTemplate && selectedTemplate.variables.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Variables
              </label>
              <div className="space-y-3 p-3 bg-gray-50 rounded-md">
                {selectedTemplate.variables.map((variable) => (
                  <div key={variable}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {`{{${variable}}}`}
                    </label>
                    <input
                      type="text"
                      value={variableValues[variable] || ''}
                      onChange={(e) => handleVariableChange(variable, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Enter value for ${variable}...`}
                      disabled={submitting}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview
              </label>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm font-medium text-gray-900 mb-2">
                  <span className="text-gray-500">Subject:</span> {preview.subject}
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{preview.body}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={submitting || success}
            >
              {submitting ? 'Scheduling...' : success ? 'Scheduled!' : 'Schedule Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
