// ContactDetail — Contact detail page with Info, Notes, and Activity tabs

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { NoteEditor } from './NoteEditor';
import { NotesThread } from './NotesThread';
import { ActivityTimeline } from './ActivityTimeline';
import { useRbac } from '../../../hooks/useRbac';
import type { ContactNote } from '../services/contactNotes';

interface Contact {
  id: string;
  tenant_id: string;
  desk_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface ContactDetailProps {
  contactId: string;
  deskId: string;
  tenantId: string;
  userId: string;
  onBack?: () => void;
}

type TabId = 'info' | 'notes' | 'activity';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'info', label: 'Info' },
  { id: 'notes', label: 'Notes' },
  { id: 'activity', label: 'Activity' },
];

export function ContactDetail({ contactId, deskId, tenantId, userId, onBack }: ContactDetailProps) {
  const { hasPermission } = useRbac({ userId, deskId });
  const [contact, setContact] = useState<Contact | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<ContactNote | null>(null);

  // Fetch contact
  useEffect(() => {
    const fetchContact = async () => {
      const { data, error: fetchError } = await supabase
        .from('office_desk.contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setContact(data);
      }
      setIsLoading(false);
    };

    fetchContact();
  }, [contactId]);

  // Handle contact field changes
  const handleChange = (field: keyof Contact, value: string) => {
    if (contact) {
      setContact({ ...contact, [field]: value });
    }
  };

  // Save contact
  const handleSave = async () => {
    if (!contact) return;
    setSaving(true);
    setError(null);

    const { error: saveError } = await supabase
      .from('office_desk.contacts')
      .update({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        title: contact.title,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contact.id);

    if (saveError) {
      setError(saveError.message);
    }
    setSaving(false);
  };

  // Handle note save
  const handleNoteSave = (note: ContactNote) => {
    setShowNoteEditor(false);
    setEditingNote(null);
    // NotesThread will auto-update via realtime subscription
  };

  // Handle edit note
  const handleEditNote = (note: ContactNote) => {
    setEditingNote(note);
    setShowNoteEditor(true);
  };

  if (isLoading) {
    return <div style={{ padding: '24px', textAlign: 'center', color: '#718096' }}>Loading contact...</div>;
  }

  if (error && !contact) {
    return <div style={{ padding: '24px', color: '#e53e3e' }}>Error: {error}</div>;
  }

  if (!contact) {
    return <div style={{ padding: '24px', color: '#718096' }}>Contact not found</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button onClick={onBack} style={{ padding: '4px 8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: '#3182ce' }}>
              &larr; Back
            </button>
          )}
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#2d3748' }}>
            {contact.name || 'Unnamed Contact'}
          </h2>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e2e8f0' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #3182ce' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === tab.id ? '#3182ce' : '#718096',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '500' : '400',
              cursor: 'pointer',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '14px' }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: '8px', border: 'none', background: 'none', color: '#991b1b', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '13px', color: '#718096' }}>Name</span>
            <input
              type="text"
              value={contact.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', color: '#718096' }}>Email</span>
              <input
                type="email"
                value={contact.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', color: '#718096' }}>Phone</span>
              <input
                type="tel"
                value={contact.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', color: '#718096' }}>Company</span>
              <input
                type="text"
                value={contact.company || ''}
                onChange={(e) => handleChange('company', e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', color: '#718096' }}>Title</span>
              <input
                type="text"
                value={contact.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            {hasPermission('contacts.edit') && (
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3182ce',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Add Note Button / Editor */}
          {!showNoteEditor && !editingNote && hasPermission('contacts.create_notes') && (
            <button
              onClick={() => setShowNoteEditor(true)}
              style={{
                padding: '12px',
                border: '1px dashed #e2e8f0',
                borderRadius: '8px',
                backgroundColor: 'white',
                color: '#718096',
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              + Add a note
            </button>
          )}

          {showNoteEditor && (
            <NoteEditor
              contactId={contactId}
              deskId={deskId}
              tenantId={tenantId}
              userId={userId}
              noteId={editingNote?.id}
              onSave={handleNoteSave}
              onCancel={() => {
                setShowNoteEditor(false);
                setEditingNote(null);
              }}
            />
          )}

          {/* Notes Thread */}
          <NotesThread
            contactId={contactId}
            deskId={deskId}
            tenantId={tenantId}
            userId={userId}
            onEditNote={handleEditNote}
          />
        </div>
      )}

      {activeTab === 'activity' && (
        <ActivityTimeline contactId={contactId} deskId={deskId} />
      )}
    </div>
  );
}
