// RichTextEditor — Markdown-based rich text editor with toolbar and mentions

import { useState, useRef, useCallback, useEffect } from 'react';
import { renderMarkdownSimple, extractMentions } from '../services/richTextEditor';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onMentionSearch?: (query: string) => Promise<Array<{ id: string; name: string }>>;
  onFileUpload?: (file: File) => Promise<{ file_url: string; file_name: string } | null>;
  placeholder?: string;
  maxLength?: number;
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

export function RichTextEditor({
  value,
  onChange,
  onMentionSearch,
  onFileUpload,
  placeholder = 'Write a note...',
  maxLength = 5000,
  disabled = false,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<Array<{ id: string; name: string }>>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [showMentions, setShowMentions] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const charCount = value.length;
  const isOverLimit = charCount > maxLength;

  // Handle toolbar button clicks
  const handleToolbarClick = useCallback((prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
    onChange(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = end + prefix.length;
    }, 0);
  }, [value, onChange]);

  // Handle mention search
  const handleInput = useCallback(async (newValue: string) => {
    onChange(newValue);

    // Detect @mention trigger
    const textarea = textareaRef.current;
    if (!textarea || !onMentionSearch) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      setShowMentions(true);
      setMentionIndex(0);
      const results = await onMentionSearch(query);
      setMentionResults(results);
    } else {
      setShowMentions(false);
      setMentionQuery(null);
    }
  }, [onChange, onMentionSearch]);

  // Insert mention
  const insertMention = useCallback((user: { id: string; name: string }) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const textAfterCursor = value.substring(cursorPos);
    const mentionStart = textBeforeCursor.lastIndexOf('@');
    const newText = textBeforeCursor.substring(0, mentionStart) + `@${user.name} ` + textAfterCursor;
    onChange(newText);
    setShowMentions(false);

    setTimeout(() => {
      textarea.focus();
      const newPos = mentionStart + user.name.length + 2;
      textarea.selectionStart = newPos;
      textarea.selectionEnd = newPos;
    }, 0);
  }, [value, onChange]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showMentions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => Math.min(i + 1, mentionResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && mentionResults[mentionIndex]) {
        e.preventDefault();
        insertMention(mentionResults[mentionIndex]);
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
      return;
    }

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
    // Cmd/Ctrl + Z for undo (browser default)
    // Cmd/Ctrl + Shift + Z for redo (browser default)
  }, [showMentions, mentionResults, mentionIndex, insertMention, handleToolbarClick]);

  // Handle file drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!onFileUpload) return;

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      const result = await onFileUpload(file);
      if (result) {
        const link = `[${result.file_name}](${result.file_url})`;
        onChange(value + '\n' + link);
      }
    }
  }, [value, onChange, onFileUpload]);

  // Handle paste for files
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    if (!onFileUpload) return;

    const files = Array.from(e.clipboardData.files);
    if (files.length > 0) {
      e.preventDefault();
      for (const file of files) {
        const result = await onFileUpload(file);
        if (result) {
          const link = `[${result.file_name}](${result.file_url})`;
          onChange(value + '\n' + link);
        }
      }
    }
  }, [value, onChange, onFileUpload]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
    }
  }, [value]);

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '2px', padding: '8px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f7fafc' }}>
        {TOOLBAR_ITEMS.map((item) => (
          <button
            key={item.title}
            type="button"
            title={item.title}
            onClick={() => handleToolbarClick(item.prefix, item.suffix)}
            disabled={disabled}
            style={{
              padding: '4px 8px',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              backgroundColor: 'white',
              fontSize: '12px',
              fontWeight: item.label === 'B' ? 'bold' : item.label === 'I' ? 'italic' : 'normal',
              fontStyle: item.label === 'I' ? 'italic' : 'normal',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {item.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          style={{
            padding: '4px 8px',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            backgroundColor: showPreview ? '#3182ce' : 'white',
            color: showPreview ? 'white' : '#4a5568',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          {showPreview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {/* Editor / Preview */}
      <div
        style={{ position: 'relative' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {showPreview ? (
          <div
            ref={previewRef}
            style={{
              padding: '12px',
              minHeight: '100px',
              maxHeight: '300px',
              overflow: 'auto',
              fontSize: '14px',
              lineHeight: '1.5',
            }}
            dangerouslySetInnerHTML={{ __html: renderMarkdownSimple(value) }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled}
            style={{
              width: '100%',
              minHeight: '100px',
              maxHeight: '300px',
              padding: '12px',
              border: 'none',
              outline: 'none',
              resize: 'vertical',
              fontSize: '14px',
              lineHeight: '1.5',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        )}

        {/* Drag overlay */}
        {isDragging && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(49, 130, 206, 0.1)',
            border: '2px dashed #3182ce',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: '#3182ce',
            pointerEvents: 'none',
          }}>
            Drop files here to attach
          </div>
        )}

        {/* Mention autocomplete */}
        {showMentions && mentionResults.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '12px',
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            maxHeight: '200px',
            overflow: 'auto',
            minWidth: '200px',
            zIndex: 10,
          }}>
            {mentionResults.map((user, idx) => (
              <div
                key={user.id}
                onClick={() => insertMention(user)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  backgroundColor: idx === mentionIndex ? '#edf2f7' : 'white',
                  fontSize: '14px',
                }}
              >
                {user.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#f7fafc',
        fontSize: '12px',
        color: isOverLimit ? '#e53e3e' : '#718096',
      }}>
        <span>Markdown supported • @mention users</span>
        <span>{charCount}/{maxLength}</span>
      </div>
    </div>
  );
}
