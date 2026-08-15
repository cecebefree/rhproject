/**
 * useContactNotes — Hook for managing contact notes with real-time updates.
 * Provides notes, CRUD operations, and optimistic updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  selectNotesByContact,
  subscribeToContactNotes,
  createNoteWithMentions,
  updateNoteWithMentions,
  deleteNote,
  insertAttachment,
  deleteAttachment,
  type ContactNote,
  type ContactNoteAttachment,
} from '../features/office-desk/services/contactNotes';

interface UseContactNotesOptions {
  contactId: string;
  enabled?: boolean;
}

interface UseContactNotesResult {
  notes: ContactNote[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  createNote: (content: string, mentionUserIds?: string[]) => Promise<ContactNote | null>;
  updateNote: (noteId: string, content: string, mentionUserIds?: string[]) => Promise<ContactNote | null>;
  removeNote: (noteId: string) => Promise<boolean>;
  addAttachment: (noteId: string, file: File) => Promise<ContactNoteAttachment | null>;
  removeAttachment: (attachmentId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useContactNotes({ contactId, enabled = true }: UseContactNotesOptions): UseContactNotesResult {
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const subscriptionRef = useRef<ReturnType<typeof subscribeToContactNotes> | null>(null);

  // Fetch notes
  const fetchNotes = useCallback(async (offset = 0) => {
    if (!contactId) return;

    const { data, error: fetchError } = await selectNotesByContact(contactId, 20, offset);
    if (fetchError) {
      setError(new Error(fetchError.message));
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
    if (!enabled || !contactId) return;
    fetchNotes(0);
  }, [contactId, enabled, fetchNotes]);

  // Real-time subscription
  useEffect(() => {
    if (!enabled || !contactId) return;

    subscriptionRef.current = subscribeToContactNotes(contactId, (payload) => {
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
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [contactId, enabled]);

  // Create note
  const createNote = useCallback(async (content: string, mentionUserIds?: string[]): Promise<ContactNote | null> => {
    // We need desk_id, tenant_id, created_by — these should be provided via context
    // For now, we'll accept them as part of the hook's context
    // This is a limitation that will be resolved when integrated with the app context
    setError(null);

    // Optimistic: add placeholder note
    const optimisticNote: ContactNote = {
      id: crypto.randomUUID(),
      contact_id: contactId,
      desk_id: '',
      tenant_id: '',
      created_by: '',
      content,
      content_html: null,
      is_edited: false,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setNotes((prev) => [optimisticNote, ...prev]);

    // Actual create will be handled by NoteEditor component
    // This hook provides the reactive data layer
    return optimisticNote;
  }, [contactId]);

  // Update note
  const updateNote = useCallback(async (noteId: string, content: string, mentionUserIds?: string[]): Promise<ContactNote | null> => {
    setError(null);

    // Optimistic update
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? { ...n, content, is_edited: true, updated_at: new Date().toISOString() }
          : n
      )
    );

    // Actual update will be handled by NoteEditor component
    const updated = notes.find((n) => n.id === noteId);
    return updated ? { ...updated, content, is_edited: true } : null;
  }, [notes]);

  // Delete note
  const removeNote = useCallback(async (noteId: string): Promise<boolean> => {
    setError(null);

    // Optimistic remove
    setNotes((prev) => prev.filter((n) => n.id !== noteId));

    const { error: deleteError } = await deleteNote(noteId);
    if (deleteError) {
      setError(new Error(deleteError.message));
      // Re-fetch to restore
      await fetchNotes(0);
      return false;
    }
    return true;
  }, [fetchNotes]);

  // Add attachment
  const addAttachment = useCallback(async (noteId: string, file: File): Promise<ContactNoteAttachment | null> => {
    setError(null);

    // Upload to Supabase Storage would happen here
    // For now, create a placeholder attachment
    const attachment: ContactNoteAttachment = {
      id: crypto.randomUUID(),
      note_id: noteId,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      file_url: URL.createObjectURL(file),
      uploaded_at: new Date().toISOString(),
    };

    const { error: insertError } = await insertAttachment(attachment);
    if (insertError) {
      setError(new Error(insertError.message));
      return null;
    }

    // Update local state
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? { ...n, attachments: [...(n.attachments || []), attachment] }
          : n
      )
    );

    return attachment;
  }, []);

  // Remove attachment
  const removeAttachment = useCallback(async (attachmentId: string): Promise<boolean> => {
    setError(null);

    const { error: deleteError } = await deleteAttachment(attachmentId);
    if (deleteError) {
      setError(new Error(deleteError.message));
      return false;
    }

    // Update local state
    setNotes((prev) =>
      prev.map((n) => ({
        ...n,
        attachments: (n.attachments || []).filter((a) => (a as ContactNoteAttachment).id !== attachmentId),
      }))
    );

    return true;
  }, []);

  // Refresh
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchNotes(0);
  }, [fetchNotes]);

  // Load more
  const loadMore = useCallback(() => {
    fetchNotes(notes.length);
  }, [fetchNotes, notes.length]);

  return {
    notes,
    isLoading,
    error,
    hasMore,
    loadMore,
    createNote,
    updateNote,
    removeNote,
    addAttachment,
    removeAttachment,
    refresh,
  };
}
