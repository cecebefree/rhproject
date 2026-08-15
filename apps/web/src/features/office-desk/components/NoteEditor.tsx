// NoteEditor — Create or edit a note with rich text, mentions, and attachments

import { useState, useEffect, useCallback } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { NoteAttachmentList } from './NoteAttachmentList';
import {
  createNoteWithMentions,
  updateNoteWithMentions,
  getNoteById,
  type ContactNote,
  type ContactNoteAttachment,
} from '../services/contactNotes';
import { extractMentions } from '../services/richTextEditor';

interface NoteEditorProps {
  contactId: string;
  deskId: string;
  tenantId: string;
  userId: string;
  noteId?: string;
  onSave?: (note: ContactNote) => void;
  onCancel?: () => void;
}

interface PendingFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
}

export function NoteEditor({ contactId, deskId, tenantId, userId, noteId, onSave, onCancel }: NoteEditorProps) {
  const [content, setContent] = useState('');
  const [existingNote, setExistingNote] = useState<ContactNote | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!!noteId);

  const isEditMode = !!noteId;

  // Load existing note for edit mode
  useEffect(() => {
    if (!noteId) return;

    const loadNote = async () => {
      const { data, error: loadError } = await getNoteById(noteId);
      if (loadError) {
        setError(loadError.message);
      } else if (data) {
        setExistingNote(data);
        setContent(data.content);
      }
      setIsLoading(false);
    };

    loadNote();
  }, [noteId]);

  // Handle mention search (would query desk users in production)
  const handleMentionSearch = useCallback(async (query: string) => {
    // Placeholder: in production, query desk users from Supabase
    // For now, return empty array
    void query;
    return [];
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File): Promise<{ file_url: string; file_name: string } | null> => {
    // Create a pending file entry
    const pendingId = crypto.randomUUID();
    const pendingFile: PendingFile = {
      id: pendingId,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
    };

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPendingFiles((prev) =>
          prev.map((f) => (f.id === pendingId ? { ...f, preview: e.target?.result as string } : f))
        );
      };
      reader.readAsDataURL(file);
    }

    setPendingFiles((prev) => [...prev, pendingFile]);

    // Return a placeholder URL (actual upload happens on save)
    return { file_url: `pending:${pendingId}`, file_name: file.name };
  }, []);

  // Remove pending file
  const removePendingFile = (fileId: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Handle save
  const handleSave = async () => {
    if (!content.trim()) {
      setError('Note content cannot be empty');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Extract mentions from content
      const mentionNames = extractMentions(content);
      // In production: resolve mention names to user IDs
      const mentionUserIds: string[] = [];

      if (isEditMode && noteId) {
        // Update existing note
        const { data, error: updateError } = await updateNoteWithMentions(
          noteId,
          content,
          undefined,
          mentionUserIds.length > 0 ? mentionUserIds : undefined
        );
        if (updateError) throw new Error(updateError.message);
        if (data) onSave?.(data);
      } else {
        // Create new note
        const { data, error: createError } = await createNoteWithMentions({
          contact_id: contactId,
          desk_id: deskId,
          tenant_id: tenantId,
          created_by: userId,
          content,
          mentionUserIds: mentionUserIds.length > 0 ? mentionUserIds : undefined,
        });
        if (createError) throw new Error(createError.message);
        if (data) onSave?.(data);
      }

      // Clear form
      setContent('');
      setPendingFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle keyboard shortcut
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  if (isLoading) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>Loading note...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} onKeyDown={handleKeyDown}>
      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>
        {isEditMode ? 'Edit Note' : 'New Note'}
      </h3>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '14px' }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: '8px', border: 'none', background: 'none', color: '#991b1b', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      <RichTextEditor
        value={content}
        onChange={setContent}
        onMentionSearch={handleMentionSearch}
        onFileUpload={handleFileUpload}
        placeholder="Write a note... Use @ to mention someone"
        maxLength={5000}
        disabled={isSaving}
      />

      {/* Pending files */}
      {pendingFiles.length > 0 && (
        <div>
          <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#718096', fontWeight: '500' }}>Attachments</p>
          <NoteAttachmentList
            attachments={pendingFiles.map((f) => ({
              id: f.id,
              note_id: '',
              file_name: f.name,
              file_size: f.size,
              file_type: f.type,
              file_url: f.preview || '',
              uploaded_at: new Date().toISOString(),
            }))}
            onRemove={removePendingFile}
            editable
          />
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            style={{
              padding: '8px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              backgroundColor: 'white',
              fontSize: '14px',
              color: '#4a5568',
              cursor: isSaving ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !content.trim()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3182ce',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isSaving || !content.trim() ? 'not-allowed' : 'pointer',
            opacity: isSaving || !content.trim() ? 0.7 : 1,
          }}
        >
          {isSaving ? 'Saving...' : isEditMode ? 'Update Note' : 'Save Note'}
        </button>
      </div>
    </div>
  );
}
