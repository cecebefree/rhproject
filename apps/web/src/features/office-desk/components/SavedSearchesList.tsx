// SavedSearchesList — Manage saved search queries (Row 2)

import { useEffect, useState } from 'react';
import type { SavedSearch } from '../services/searchService';

interface SavedSearchesListProps {
  savedSearches: SavedSearch[];
  onApply: (search: SavedSearch) => void;
  onDelete: (searchId: string) => Promise<boolean>;
  onSave: (name: string, description?: string) => Promise<SavedSearch | null>;
  onLoad: () => void;
}

const ENTITY_LABELS: Record<string, string> = {
  all: 'All',
  contacts: 'Contacts',
  leads: 'Leads',
  invoices: 'Invoices',
};

export function SavedSearchesList({
  savedSearches,
  onApply,
  onDelete,
  onSave,
  onLoad,
}: SavedSearchesListProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    onLoad();
  }, [onLoad]);

  const handleCreate = async () => {
    if (!newName.trim()) return;

    setSaving(true);
    const result = await onSave(newName, newDescription);
    if (result) {
      setShowCreateForm(false);
      setNewName('');
      setNewDescription('');
    }
    setSaving(false);
  };

  const handleDelete = async (searchId: string) => {
    if (confirm('Are you sure you want to delete this saved search?')) {
      await onDelete(searchId);
    }
  };

  return (
    <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Saved Searches</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: '6px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#3182ce',
          }}
        >
          {showCreateForm ? 'Cancel' : '+ Save Current'}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div style={{
          padding: '12px',
          backgroundColor: '#f7fafc',
          borderRadius: '6px',
          marginBottom: '12px',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ marginBottom: '8px' }}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Search name"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={saving || !newName.trim()}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#3182ce',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              color: 'white',
              fontWeight: '500',
            }}
          >
            {saving ? 'Saving...' : 'Save Search'}
          </button>
        </div>
      )}

      {/* Saved Searches List */}
      {savedSearches.length === 0 ? (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          color: '#718096',
          backgroundColor: '#f7fafc',
          borderRadius: '6px',
          fontSize: '14px',
        }}>
          No saved searches yet. Use the search bar and save your frequent queries.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {savedSearches.map((search) => (
            <div
              key={search.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                backgroundColor: search.is_default ? '#ebf8ff' : 'white',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>{search.name}</span>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '500',
                    backgroundColor: '#edf2f7',
                    color: '#4a5568',
                  }}>
                    {ENTITY_LABELS[search.entity_type]}
                  </span>
                  {search.is_default && (
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '500',
                      backgroundColor: '#3182ce',
                      color: 'white',
                    }}>
                      Default
                    </span>
                  )}
                </div>
                {search.description && (
                  <div style={{ color: '#718096', fontSize: '13px', marginBottom: '4px' }}>
                    {search.description}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#a0aec0' }}>
                  <span>Used {search.use_count} times</span>
                  {search.last_used_at && (
                    <span>Last used: {new Date(search.last_used_at).toLocaleDateString()}</span>
                  )}
                  {search.search_query && (
                    <span>Query: "{search.search_query}"</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => onApply(search)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#3182ce',
                  }}
                >
                  Apply
                </button>
                <button
                  onClick={() => handleDelete(search.id)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: '#fff5f5',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#e53e3e',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
