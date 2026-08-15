/**
 * ContactNotesService — CRUD + activity log for contact notes.
 * Handles notes, mentions, attachments, and activity timeline.
 */

import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface ContactNote {
  id: string;
  contact_id: string;
  desk_id: string;
  tenant_id: string;
  created_by: string;
  content: string;
  content_html: string | null;
  is_edited: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  mentions?: ContactNoteMention[];
  attachments?: ContactNoteAttachment[];
}

export interface ContactNoteMention {
  id: string;
  note_id: string;
  user_id: string;
  mentioned_at: string;
}

export interface ContactNoteAttachment {
  id: string;
  note_id: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  file_url: string;
  uploaded_at: string;
}

export interface ContactActivityLogEntry {
  id: string;
  contact_id: string;
  desk_id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  action_data: Record<string, unknown> | null;
  created_at: string;
}

export type ActivityAction = 'note_created' | 'note_updated' | 'note_deleted' | 'contact_updated' | 'contact_archived';

// ═══════════════════════════════════════════════════════════
// NOTE QUERIES
// ═══════════════════════════════════════════════════════════

export async function selectNotesByContact(
  contactId: string,
  limit = 20,
  offset = 0
) {
  // Fetch notes first
  const { data: notes, error } = await supabase
    .from('office_desk.contact_notes')
    .select('*')
    .eq('contact_id', contactId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !notes) return { data: notes, error };

  // Fetch mentions and attachments for each note
  const notesWithRelations = await Promise.all(
    notes.map(async (note) => {
      const [mentionsResult, attachmentsResult] = await Promise.all([
        supabase
          .from('office_desk.contact_note_mentions')
          .select('*')
          .eq('note_id', note.id),
        supabase
          .from('office_desk.contact_note_attachments')
          .select('*')
          .eq('note_id', note.id),
      ]);
      return {
        ...note,
        mentions: mentionsResult.data || [],
        attachments: attachmentsResult.data || [],
      };
    })
  );

  return { data: notesWithRelations as ContactNote[], error: null };
}

export async function getNoteById(noteId: string) {
  const { data: note, error } = await supabase
    .from('office_desk.contact_notes')
    .select('*')
    .eq('id', noteId)
    .is('deleted_at', null)
    .single();

  if (error || !note) return { data: note, error };

  const [mentionsResult, attachmentsResult] = await Promise.all([
    supabase
      .from('office_desk.contact_note_mentions')
      .select('*')
      .eq('note_id', noteId),
    supabase
      .from('office_desk.contact_note_attachments')
      .select('*')
      .eq('note_id', noteId),
  ]);

  return {
    data: {
      ...note,
      mentions: mentionsResult.data || [],
      attachments: attachmentsResult.data || [],
    } as ContactNote,
    error: null,
  };
}

export async function insertNote(note: {
  contact_id: string;
  desk_id: string;
  tenant_id: string;
  created_by: string;
  content: string;
  content_html?: string;
}) {
  return supabase
    .from('office_desk.contact_notes')
    .insert({
      contact_id: note.contact_id,
      desk_id: note.desk_id,
      tenant_id: note.tenant_id,
      created_by: note.created_by,
      content: note.content,
      content_html: note.content_html || null,
    })
    .select()
    .single();
}

export async function updateNote(
  noteId: string,
  updates: {
    content?: string;
    content_html?: string;
  }
) {
  return supabase
    .from('office_desk.contact_notes')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId)
    .select()
    .single();
}

export async function deleteNote(noteId: string) {
  return supabase
    .from('office_desk.contact_notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', noteId);
}

// ═══════════════════════════════════════════════════════════
// MENTION QUERIES
// ═══════════════════════════════════════════════════════════

export async function insertMentions(noteId: string, userIds: string[]) {
  if (userIds.length === 0) return { data: null, error: null };

  const mentions = userIds.map((userId) => ({
    note_id: noteId,
    user_id: userId,
  }));

  return supabase
    .from('office_desk.contact_note_mentions')
    .insert(mentions)
    .select();
}

export async function deleteMentions(noteId: string) {
  return supabase
    .from('office_desk.contact_note_mentions')
    .delete()
    .eq('note_id', noteId);
}

export async function getMentionsByNote(noteId: string) {
  return supabase
    .from('office_desk.contact_note_mentions')
    .select('*')
    .eq('note_id', noteId);
}

// ═══════════════════════════════════════════════════════════
// ATTACHMENT QUERIES
// ═══════════════════════════════════════════════════════════

export async function insertAttachment(attachment: {
  note_id: string;
  file_name: string;
  file_size?: number | null;
  file_type?: string | null;
  file_url: string;
}) {
  return supabase
    .from('office_desk.contact_note_attachments')
    .insert({
      note_id: attachment.note_id,
      file_name: attachment.file_name,
      file_size: attachment.file_size || null,
      file_type: attachment.file_type || null,
      file_url: attachment.file_url,
    })
    .select()
    .single();
}

export async function deleteAttachment(attachmentId: string) {
  return supabase
    .from('office_desk.contact_note_attachments')
    .delete()
    .eq('id', attachmentId);
}

export async function getAttachmentsByNote(noteId: string) {
  return supabase
    .from('office_desk.contact_note_attachments')
    .select('*')
    .eq('note_id', noteId)
    .order('uploaded_at', { ascending: true });
}

// ═══════════════════════════════════════════════════════════
// ACTIVITY LOG QUERIES
// ═══════════════════════════════════════════════════════════

export async function selectActivityLog(
  contactId: string,
  limit = 50,
  offset = 0
) {
  return supabase
    .from('office_desk.contact_activity_log')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
}

export async function insertActivityLog(entry: {
  contact_id: string;
  desk_id: string;
  tenant_id: string;
  user_id: string;
  action: ActivityAction;
  action_data?: Record<string, unknown>;
}) {
  return supabase
    .from('office_desk.contact_activity_log')
    .insert({
      contact_id: entry.contact_id,
      desk_id: entry.desk_id,
      tenant_id: entry.tenant_id,
      user_id: entry.user_id,
      action: entry.action,
      action_data: entry.action_data || null,
    })
    .select()
    .single();
}

// ═══════════════════════════════════════════════════════════
// REALTIME SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════════

export function subscribeToContactNotes(
  contactId: string,
  callback: (payload: { eventType: string; new: ContactNote; old: ContactNote | null }) => void
) {
  return supabase
    .channel(`contact_notes-${contactId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'office_desk', table: 'contact_notes', filter: `contact_id=eq.${contactId}` },
      callback as (payload: Record<string, unknown>) => void
    )
    .subscribe();
}

export function subscribeToContactActivity(
  contactId: string,
  callback: (payload: { eventType: string; new: ContactActivityLogEntry; old: ContactActivityLogEntry | null }) => void
) {
  return supabase
    .channel(`contact_activity-${contactId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'office_desk', table: 'contact_activity_log', filter: `contact_id=eq.${contactId}` },
      callback as (payload: Record<string, unknown>) => void
    )
    .subscribe();
}

// ═══════════════════════════════════════════════════════════
// BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════

/**
 * Create a note with mentions and return the full note.
 */
export async function createNoteWithMentions(note: {
  contact_id: string;
  desk_id: string;
  tenant_id: string;
  created_by: string;
  content: string;
  content_html?: string;
  mentionUserIds?: string[];
}) {
  // Insert the note
  const { data: noteData, error: noteError } = await insertNote(note);
  if (noteError || !noteData) return { data: null, error: noteError };

  // Insert mentions if any
  if (note.mentionUserIds && note.mentionUserIds.length > 0) {
    const { error: mentionError } = await insertMentions(noteData.id, note.mentionUserIds);
    if (mentionError) console.error('Failed to insert mentions:', mentionError);
  }

  // Re-fetch with relations
  return getNoteById(noteData.id);
}

/**
 * Update a note's content and replace mentions.
 */
export async function updateNoteWithMentions(
  noteId: string,
  content: string,
  contentHtml?: string,
  mentionUserIds?: string[]
) {
  // Update the note content
  const { data: noteData, error: noteError } = await updateNote(noteId, {
    content,
    content_html: contentHtml,
  });
  if (noteError || !noteData) return { data: null, error: noteError };

  // Replace mentions
  if (mentionUserIds !== undefined) {
    await deleteMentions(noteId);
    if (mentionUserIds.length > 0) {
      await insertMentions(noteId, mentionUserIds);
    }
  }

  // Re-fetch with relations
  return getNoteById(noteId);
}
