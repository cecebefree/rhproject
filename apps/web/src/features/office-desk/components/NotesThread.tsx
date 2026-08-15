// NotesThread — Display list of notes for a contact with real-time updates

import { useState, useEffect, useCallback } from 'react';
import { renderMarkdownSimple } from '../services/richTextEditor';
import {
  selectNotesByContact,
  subscribeToContactNotes,
  deleteNote,
  type ContactNote,
  type ContactNoteAttachment,
} from '../services/contactNotes';
import { NoteAttachmentList } from './NoteAttachmentList';

interface NotesThreadProps {
  contactId: string;
  deskId: string;
  tenantId: string;
  userId: string;
  onEditNote?: (note: ContactNote) => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function NotesThread({ contactId, deskId, tenantId, userId, onEditNote }: NotesThreadProps) {
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotes = useCallback(async (offset = 0) => {
    const { data, error: fetchError } = await selectNotesByContact(contactId, 20, offset);
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    if (offset === 0) {
      setNotes(data || []);
    } else {
      setNotes((prev) => [...prev, ...(data || [])]);
    }
    setHasMore((data?.length || 0) === 20);
    setIsLoading(false);
  }, [contactId]);

  // Initial fetch
  useEffect(() => {
    fetchNotes(0);
  }, [fetchNotes]);

  // Real-time subscription
  useEffect(() => {
    const channel = subscribeToContactNotes(contactId, (payload) => {
      if (payload.eventType === 'INSERT') {
        setNotes((prev) => [payload.new as ContactNote, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setNotes((prev) =>
          prev.map((n) => (n.id === (payload.new as ContactNote).id ? (payload.new as ContactNote) : n))
        );
      } else if (payload.eventType === 'DELETE') {
        setNotes((prev) => prev.filter((n) => n.id !== (payload.old as ContactNote)?.id));
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [contactId]);

  const handleDelete = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;
    const { error: deleteError } = await deleteNote(noteId);
    if (deleteError) {
      setError(deleteError.message);
    }
  };

  const loadMore = () => {
    fetchNotes(notes.length);
  };

  if (isLoading) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>Loading notes...</div>;
  }

  if (error) {
    return <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px' }}>{error}</div>;
  }

  if (notes.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#718096' }}>
        <p style={{ fontSize: '14px', margin: 0 }}>No notes yet</p>
        <p style={{ fontSize: '13px', margin: '4px 0 0', color: '#a0aec0' }}>Add a note to start tracking this contact</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {notes.map((note) => (
        <div
          key={note.id}
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px',
            backgroundColor: 'white',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#edf2f7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '600',
                color: '#4a5568',
              }}>
                {note.created_by.slice(0, 2).toUpperCase()}
              </div>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#2d3748' }}>
                {note.created_by === userId ? 'You' : note.created_by.slice(0, 8)}
              </span>
              {note.is_edited && (
                <span style={{ fontSize: '11px', color: '#a0aec0', fontStyle: 'italic' }}>(edited)</span>
              )}
            </div>
            <span style={{ fontSize: '12px', color: '#a0aec0' }}>
              {formatRelativeTime(note.created_at)}
            </span>
          </div>

          {/* Content */}
          <div
            style={{
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#2d3748',
              marginBottom: note.attachments?.length ? '8px' : 0,
            }}
            dangerouslySetInnerHTML={{ __html: renderMarkdownSimple(note.content) }}
          />

          {/* Attachments */}
          {note.attachments && note.attachments.length > 0 && (
            <NoteAttachmentList
              attachments={note.attachments as ContactNoteAttachment[]}
              editable={false}
            />
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #edf2f7' }}>
            <button
              type="button"
              onClick={() => onEditNote?.(note)}
              style={{
                padding: '4px 8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#3182ce',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete(note.id)}
              style={{
                padding: '4px 8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#e53e3e',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      {/* Load more */}
      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          style={{
            padding: '8px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            backgroundColor: 'white',
            color: '#3182ce',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Load more notes
        </button>
      )}
    </div>
  );
}
