// SearchBar — Search input with autocomplete, recent searches, quick filters (Row 2)

import { useEffect, useRef, useState } from 'react';
import type { SearchEntityType, SearchHistoryEntry, AutocompleteResult } from '../services/searchService';
import { QUICK_FILTERS } from '../services/searchService';

interface SearchBarProps {
  query: string;
  entityType: SearchEntityType;
  suggestions: AutocompleteResult[];
  searchHistory: SearchHistoryEntry[];
  loadingSuggestions: boolean;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  onEntityTypeChange: (entityType: SearchEntityType) => void;
  onFetchSuggestions: (query: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onApplyHistory: (entry: any) => void;
  onQuickFilter: (filters: Record<string, unknown>) => void;
  onShowFilters?: () => void;
  hasActiveFilters?: boolean;
}

const ENTITY_OPTIONS: { value: SearchEntityType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'leads', label: 'Leads' },
  { value: 'invoices', label: 'Invoices' },
];

export function SearchBar({
  query,
  entityType,
  suggestions,
  searchHistory,
  loadingSuggestions,
  onQueryChange,
  onSearch,
  onEntityTypeChange,
  onFetchSuggestions,
  onApplyHistory,
  onQuickFilter,
  onShowFilters,
  hasActiveFilters = false,
}: SearchBarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showQuickFilters, setShowQuickFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowQuickFilters(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions when query changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      onFetchSuggestions(query);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, onFetchSuggestions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
      setShowDropdown(false);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleSuggestionClick = (suggestion: AutocompleteResult) => {
    onQueryChange(suggestion.name);
    onSearch();
    setShowDropdown(false);
  };

  const handleHistoryClick = (entry: SearchHistoryEntry) => {
    onApplyHistory(entry);
    setShowDropdown(false);
  };

  const handleQuickFilterClick = (filter: typeof QUICK_FILTERS[0]) => {
    onQuickFilter(filter.filters as Record<string, unknown>);
    onEntityTypeChange(filter.entity_type);
    setShowQuickFilters(false);
  };

  const showDropdownContent = showDropdown && (suggestions.length > 0 || searchHistory.length > 0 || showQuickFilters);

  return (
    <div style={{ position: 'relative', flex: 1 }} ref={dropdownRef}>
      {/* Search Input */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder={`Search ${entityType === 'all' ? 'everything' : entityType}...`}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          {/* Search icon */}
          <svg
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '16px',
              height: '16px',
              color: '#a0aec0',
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {loadingSuggestions && (
            <div style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '16px',
              height: '16px',
              border: '2px solid #e2e8f0',
              borderTopColor: '#3182ce',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
          )}
        </div>

        {/* Entity Type Selector */}
        <select
          value={entityType}
          onChange={(e) => onEntityTypeChange(e.target.value as SearchEntityType)}
          style={{
            padding: '10px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
        >
          {ENTITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Filter Button */}
        {onShowFilters && (
          <button
            onClick={onShowFilters}
            style={{
              padding: '10px 16px',
              border: hasActiveFilters ? '2px solid #3182ce' : '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: hasActiveFilters ? '#ebf8ff' : 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              color: hasActiveFilters ? '#3182ce' : '#4a5568',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </button>
        )}

        {/* Quick Filters Toggle */}
        <button
          onClick={() => setShowQuickFilters(!showQuickFilters)}
          style={{
            padding: '10px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#4a5568',
          }}
        >
          ⚡
        </button>
      </div>

      {/* Dropdown */}
      {showDropdownContent && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          maxHeight: '400px',
          overflow: 'auto',
          zIndex: 1000,
        }}>
          {/* Quick Filters */}
          {showQuickFilters && (
            <div style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#718096', marginBottom: '8px' }}>
                QUICK FILTERS
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {QUICK_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => handleQuickFilterClick(filter)}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#4a5568',
                    }}
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div style={{ padding: '8px 0', borderBottom: showQuickFilters || searchHistory.length > 0 ? '1px solid #e2e8f0' : 'none' }}>
              <div style={{ padding: '4px 12px', fontSize: '12px', fontWeight: '600', color: '#718096' }}>
                SUGGESTIONS
              </div>
              {suggestions.map((suggestion) => (
                <button
                  key={`${suggestion.entity_type}-${suggestion.id}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f7fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ fontWeight: '500' }}>{suggestion.name}</div>
                  {suggestion.email && (
                    <div style={{ fontSize: '12px', color: '#718096' }}>{suggestion.email}</div>
                  )}
                  <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '2px' }}>
                    {suggestion.entity_type}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {searchHistory.length > 0 && !showQuickFilters && (
            <div style={{ padding: '8px 0' }}>
              <div style={{ padding: '4px 12px', fontSize: '12px', fontWeight: '600', color: '#718096' }}>
                RECENT SEARCHES
              </div>
              {searchHistory.slice(0, 5).map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => handleHistoryClick(entry)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f7fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ fontWeight: '500' }}>{entry.search_query || 'Filtered search'}</div>
                  <div style={{ fontSize: '12px', color: '#718096' }}>
                    {entry.result_count} results • {entry.entity_type}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          to { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
