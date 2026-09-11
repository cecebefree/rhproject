// useSearch — Hook for search functionality with autocomplete and history

import { useCallback, useRef, useState } from 'react';
import {
  type AutocompleteResult,
  type SearchEntityType,
  type SearchHistoryEntry,
  type SearchFilters,
  autocomplete,
  selectSearchHistory,
  addSearchHistory,
  search,
} from '../features/office-desk/services/searchService';

interface UseSearchOptions {
  tenantId: string;
  userId: string;
}

interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  entityType: SearchEntityType;
  setEntityType: (type: SearchEntityType) => void;
  suggestions: AutocompleteResult[];
  searchHistory: SearchHistoryEntry[];
  loadingSuggestions: boolean;
  results: Record<string, unknown>[];
  loading: boolean;
  total: number;
  fetchSuggestions: (q: string) => void;
  executeSearch: () => Promise<void>;
  applyHistory: (entry: SearchHistoryEntry) => void;
  clearResults: () => void;
}

export function useSearch({ tenantId, userId }: UseSearchOptions): UseSearchReturn {
  const [query, setQuery] = useState('');
  const [entityType, setEntityType] = useState<SearchEntityType>('all');
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback(
    (q: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!q || q.length < 2) {
        setSuggestions([]);
        setLoadingSuggestions(false);
        return;
      }

      setLoadingSuggestions(true);

      debounceRef.current = setTimeout(async () => {
        try {
          const data = await autocomplete(q, tenantId, 5);
          setSuggestions(data);
        } catch (err) {
          console.error('Failed to fetch suggestions:', err);
          setSuggestions([]);
        } finally {
          setLoadingSuggestions(false);
        }
      }, 300);
    },
    [tenantId]
  );

  // Execute search
  const executeSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const result = await search({
        entity_type: entityType,
        query: query.trim(),
        tenant_id: tenantId,
        page: 1,
        page_size: 20,
      });

      setResults(result.data);
      setTotal(result.total);

      // Add to search history
      await addSearchHistory({
        tenant_id: tenantId,
        user_id: userId,
        entity_type: entityType,
        search_query: query.trim(),
        filters: {},
        result_count: result.total,
      });

      // Refresh history
      const history = await selectSearchHistory(userId, tenantId, 10);
      setSearchHistory(history);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, [query, entityType, tenantId, userId]);

  // Apply history entry
  const applyHistory = useCallback((entry: SearchHistoryEntry) => {
    setQuery(entry.search_query);
    setEntityType(entry.entity_type);
  }, []);

  // Clear results
  const clearResults = useCallback(() => {
    setResults([]);
    setTotal(0);
    setQuery('');
  }, []);

  return {
    query,
    setQuery,
    entityType,
    setEntityType,
    suggestions,
    searchHistory,
    loadingSuggestions,
    results,
    loading,
    total,
    fetchSuggestions,
    executeSearch,
    applyHistory,
    clearResults,
  };
}
