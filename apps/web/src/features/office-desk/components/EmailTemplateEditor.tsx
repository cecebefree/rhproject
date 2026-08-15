// EmailTemplateEditor — Rich text editor with variable insertion UI

import { useState, useRef, useCallback, useEffect } from 'react';
import { renderMarkdownSimple } from '../services/richTextEditor';
import { extractVariables } from '../services/emailTemplateService';
import { useResponsive } from '../../../components/MobileNav';

interface EmailTemplateEditorProps {
  name: string;
  subject: string;
  body: string;
  variables: string[];
  onNameChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onVariablesChange: (variables: string[]) => void;
  disabled?: boolean;
}

const TOOLBAR_ITEMS = [
  { label: 'B', title: 'Bold', prefix: '**', suffix: '**' },
  { label: 'I', title: 'Italic', prefix: '*', suffix: '*' },
  { label: 'Code', title: 'Code', prefix: '`', suffix: '`' },
  { label: 'Link', title: 'Link', prefix: '[', suffix: '](url)' },
  { label: 'H1', title: 'Heading 1', prefix: '# ', suffix: '' },
  { label: 'H2', title: 'Heading 2', prefix: '## ', suffix: '' },
  { label: 'List', title: 'Bullet List', prefix: '- ', suffix: '' },
  { label: 'Quote', title: 'Blockquote', prefix: '> ', suffix: '' },
];

const COMMON_VARIABLES = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'company',
  'invoice_number',
  'amount',
  'due_date',
  'date',
];

export function EmailTemplateEditor({
  name,
  subject,
  body,
  variables,
  onNameChange,
  onSubjectChange,
  onBodyChange,
  onVariablesChange,
  disabled = false,
}: EmailTemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [newVariable, setNewVariable] = useState('');
  const [showVariableDropdown, setShowVariableDropdown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useResponsive();

  const charCount = body.length;

  // Handle toolbar button clicks
  const handleToolbarClick = useCallback((prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end);
    const newText = body.substring(0, start) + prefix + selectedText + suffix + body.substring(end);
    onBodyChange(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = end + prefix.length;
    }, 0);
  }, [body, onBodyChange]);

  // Insert variable at cursor
  const insertVariable = useCallback((variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = body.substring(0, cursorPos);
    const textAfterCursor = body.substring(cursorPos);
    const variableText = `{{${variable}}}`;
    const newText = textBeforeCursor + variableText + textAfterCursor;
    onBodyChange(newText);

    // Add to variables list if not already present
    if (!variables.includes(variable)) {
      onVariablesChange([...variables, variable]);
    }

    setShowVariableDropdown(false);

    setTimeout(() => {
      textarea.focus();
      const newPos = cursorPos + variableText.length;
      textarea.selectionStart = newPos;
      textarea.selectionEnd = newPos;
    }, 0);
  }, [body, variables, onBodyChange, onVariablesChange]);

  // Add new variable
  const handleAddVariable = useCallback(() => {
    const trimmed = newVariable.trim().toLowerCase().replace(/\s+/g, '_');
    if (trimmed && !variables.includes(trimmed)) {
      onVariablesChange([...variables, trimmed]);
      setNewVariable('');
    }
  }, [newVariable, variables, onVariablesChange]);

  // Remove variable
  const handleRemoveVariable = useCallback((variable: string) => {
    onVariablesChange(variables.filter((v) => v !== variable));
  }, [variables, onVariablesChange]);

  // Auto-detect variables from body content
  useEffect(() => {
    const detected: string[] = extractVariables(body);
    const newVars = detected.filter((v: string) => !variables.includes(v));
    if (newVars.length > 0) {
      onVariablesChange([...variables, ...newVars]);
    }
  }, [body]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Cmd/Ctrl + B for bold
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      handleToolbarClick('**', '**');
    }
    // Cmd/Ctrl + I for italic
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      handleToolbarClick('*', '*');
    }
    // Cmd/Ctrl + K for link
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      handleToolbarClick('[', '](url)');
    }
  }, [handleToolbarClick]);

  // Handle file drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 400)}px`;
    }
  }, [body]);

  return (
    <div className="space-y-4">
      {/* Template Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Template Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Welcome Email"
          disabled={disabled}
        />
      </div>

      {/* Subject Line */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Subject *
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Welcome to {{company}}, {{first_name}}!"
          disabled={disabled}
        />
      </div>

      {/* Variables Management */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Variables
        </label>
        
        {/* Current Variables */}
        <div className="flex flex-wrap gap-2 mb-2">
          {variables.map((variable) => (
            <span
              key={variable}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
            >
              {`{{${variable}}}`}
              <button
                type="button"
                onClick={() => handleRemoveVariable(variable)}
                className="ml-2 text-blue-600 hover:text-blue-800"
                disabled={disabled}
              >
                &times;
              </button>
            </span>
          ))}
        </div>

        {/* Add Variable */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newVariable}
            onChange={(e) => setNewVariable(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddVariable();
              }
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Add variable name..."
            disabled={disabled}
          />
          <button
            type="button"
            onClick={handleAddVariable}
            disabled={disabled || !newVariable.trim()}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 text-sm"
          >
            Add
          </button>
        </div>

        {/* Common Variables */}
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowVariableDropdown(!showVariableDropdown)}
            className="text-sm text-blue-600 hover:text-blue-800"
            disabled={disabled}
          >
            {showVariableDropdown ? 'Hide common variables' : 'Show common variables'}
          </button>
          {showVariableDropdown && (
            <div className="mt-2 p-2 bg-gray-50 rounded-md flex flex-wrap gap-2">
              {COMMON_VARIABLES.filter((v) => !variables.includes(v)).map((variable) => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => insertVariable(variable)}
                  className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-100"
                  disabled={disabled}
                >
                  {`{{${variable}}}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Body Editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Body *
        </label>
        <div
          className="border border-gray-300 rounded-md overflow-hidden"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Toolbar */}
          <div
            className="flex gap-1 p-2 border-b border-gray-200 bg-gray-50 flex-wrap"
          >
            {TOOLBAR_ITEMS.map((item) => (
              <button
                key={item.title}
                type="button"
                title={item.title}
                onClick={() => handleToolbarClick(item.prefix, item.suffix)}
                disabled={disabled}
                className={`px-2 py-1 text-sm border border-gray-200 rounded bg-white hover:bg-gray-100 disabled:opacity-50 ${
                  item.label === 'B' ? 'font-bold' : item.label === 'I' ? 'italic' : ''
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={`px-2 py-1 text-sm border border-gray-200 rounded ${
                showPreview ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-100'
              }`}
            >
              {showPreview ? 'Edit' : 'Preview'}
            </button>
          </div>

          {/* Editor / Preview */}
          <div className="relative">
            {showPreview ? (
              <div
                ref={previewRef}
                className="p-3 min-h-[200px] max-h-[400px] overflow-auto text-sm"
                dangerouslySetInnerHTML={{ __html: renderMarkdownSimple(body) }}
              />
            ) : (
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => onBodyChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Dear {{first_name}},\n\nWelcome to {{company}}!..."
                disabled={disabled}
                className="w-full p-3 min-h-[200px] max-h-[400px] border-none outline-none resize-y text-sm font-mono"
              />
            )}

            {/* Drag overlay */}
            {isDragging && (
              <div className="absolute inset-0 bg-blue-50 border-2 border-dashed border-blue-400 rounded-md flex items-center justify-center text-blue-600 pointer-events-none">
                Drop files here
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
            <span>Markdown supported • Use {'{{variable}}'} for dynamic content</span>
            <span>{charCount} characters</span>
          </div>
        </div>
      </div>
    </div>
  );
}
