// EmailPreviewModal — Variable substitution preview modal

import { useState, useMemo, useCallback } from 'react';
import type { EmailTemplate } from '../services/emailTemplateService';
import { substituteVariables } from '../services/emailTemplateService';
import { renderMarkdownSimple } from '../services/richTextEditor';
import { useResponsive } from '../../../components/MobileNav';

interface EmailPreviewModalProps {
  template: EmailTemplate | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EmailPreviewModal({ template, isOpen, onClose }: EmailPreviewModalProps) {
  const { isMobile } = useResponsive();
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  // Initialize variable values when template changes
  useMemo(() => {
    if (template?.variables) {
      const initialValues: Record<string, string> = {};
      template.variables.forEach((v) => {
        initialValues[v] = `[${v}]`;
      });
      setVariableValues(initialValues);
    }
  }, [template?.variables]);

  // Compute preview
  const preview = useMemo(() => {
    if (!template) return null;
    const subject = substituteVariables(template.subject, variableValues);
    const body = substituteVariables(template.body, variableValues);
    const html = renderMarkdownSimple(body);
    return { subject, body, html };
  }, [template, variableValues]);

  const handleVariableChange = useCallback((variable: string, value: string) => {
    setVariableValues((prev) => ({ ...prev, [variable]: value }));
  }, []);

  if (!isOpen || !template || !preview) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-white rounded-lg shadow-xl ${
          isMobile ? 'w-full mx-4' : 'max-w-3xl w-full mx-4'
        } max-h-[90vh] overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Preview Template</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className={`${isMobile ? '' : 'grid grid-cols-2 gap-4'}`}>
            {/* Variable Inputs */}
            <div className={`${isMobile ? 'mb-4' : ''}`}>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Test Variables</h4>
              <div className="space-y-3">
                {template.variables.map((variable) => (
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
                    />
                  </div>
                ))}
                {template.variables.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No variables in this template</p>
                )}
              </div>
            </div>

            {/* Preview */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Email Preview</h4>
              
              {/* Subject Preview */}
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                <p className="text-sm font-medium text-gray-900">{preview.subject}</p>
              </div>

              {/* Body Preview */}
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <div className="p-4 bg-white">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: preview.html }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
