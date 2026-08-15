// useSearch — Hook for search state, filters, pagination (Row 2)

import { useState, useCallback, useEffect } from 'react';
import {
  search,
  autocomplete,
  selectSavedSearches,
  createSavedSearch,
  updateSavedSearch,
  deleteSavedSearch,
  selectSearchHistory,
  addSearchHistory,
  clearSearchHistory,
  type SearchEntityType,
  type SearchFilters,
  type SearchOptions,
  type SearchResult,
  type AutocompleteResult,
  type SavedSearch,
  type SearchHistoryEntry,
} from '../features/office-desk/services/searchService';

interface UseSearchOptions {
  tenantId: string;
  userId: string;
  defaultEntityType?: SearchEntityType;
  defaultPageSize?: number;
}

export function useSearch({
  tenantId,
  userId,
  defaultEntityType = 'all',
  defaultPageSize = 20,
}: UseSearchOptions) {
  // Search state
  const [query, setQuery] = useState('');
  const [entityType, setEntityType] = useState<SearchEntityType>(defaultEntityType);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Results state
  const [results, setResults] = useState<SearchResult>({
    data: [],
    total: 0,
    page: 1,
    page_size: defaultPageSize,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Saved searches state
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Search history state
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Execute search
  const executeSearch = useCallback(async (overrides?: Partial<SearchOptions>) => {
    setLoading(true);
    setError(null);

    try {
      const options: SearchOptions = {
        entity_type: entityType,
        query,
        filters,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        page_size: pageSize,
        tenant_id: tenantId,
        ...overrides,
      };

      const result = await search(options);
      setResults(result);

      // Add to search history if there's a query or filters
      if (query || Object.keys(filters).length > 0) {
        await addSearchHistory({
          tenant_id: tenantId,
          user_id: userId,
          entity_type: entityType,
          search_query: query,
          filters,
          result_count: result.total,
        });
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [query, entityType, filters, sortBy, sortOrder, page, pageSize, tenantId, userId]);

  // Fetch autocomplete suggestions
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const results = await autocomplete(searchQuery, tenantId, 5);
      setSuggestions(results);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [tenantId]);

  // Load saved searches
  const loadSavedSearches = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const { data, error: fetchError } = await selectSavedSearches(userId, tenantId);
      if (!fetchError && data) {
        setSavedSearches(data);
      }
    } finally {
      setLoadingSaved(false);
    }
  }, [userId, tenantId]);

  // Save current search
  const saveSearch = useCallback(async (name: string, description?: string) => {
    try {
      const { data, error: createError } = await createSavedSearch({
        tenant_id: tenantId,
        user_id: userId,
        name,
        description: description || null,
        entity_type: entityType,
        search_query: query || null,
        filters,
        sort_by: sortBy,
        sort_order: sortOrder,
        is_default: false,
      });

      if (!createError && data) {
        setSavedSearches((prev) => [data, ...prev]);
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }, [tenantId, userId, entityType, query, filters, sortBy, sortOrder]);

  // Apply saved search
  const applySavedSearch = useCallback(async (savedSearch: { search_query?: string | null; filters?: Record<string, unknown>; entity_type?: string; sort_by?: string; sort_order?: string; id?: string; use_count?: number; [key: string]: unknown }) => {
    setQuery(savedSearch.search_query || '');
    if (savedSearch.entity_type) {
      setEntityType(savedSearch.entity_type as SearchEntityType);
    }
    if (savedSearch.filters) {
      setFilters(savedSearch.filters as SearchFilters);
    }
    if (savedSearch.sort_by) setSortBy(savedSearch.sort_by);
    if (savedSearch.sort_order) setSortOrder(savedSearch.sort_order as 'asc' | 'desc');
    setPage(1);

    // Increment usage count if it's a full SavedSearch
    if (savedSearch.id && savedSearch.use_count !== undefined) {
      await updateSavedSearch(savedSearch.id, {
        use_count: savedSearch.use_count + 1,
        last_used_at: new Date().toISOString(),
      });
    }
  }, []);

  // Delete saved search
  const deleteSaved = useCallback(async (searchId: string) => {
    const { error: deleteError } = await deleteSavedSearch(searchId);
    if (!deleteError) {
      setSavedSearches((prev) => prev.filter((s) => s.id !== searchId));
      return true;
    }
    return false;
  }, []);

  // Load search history
  const loadSearchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data, error: fetchError } = await selectSearchHistory(userId, tenantId, 10);
      if (!fetchError && data) {
        setSearchHistory(data);
      }
    } finally {
      setLoadingHistory(false);
    }
  }, [userId, tenantId]);

  // Clear search history
  const clearHistory = useCallback(async () => {
    const { error: clearError } = await clearSearchHistory(userId);
    if (!clearError) {
      setSearchHistory([]);
      return true;
    }
    return false;
  }, [userId]);

  // Reset search
  const resetSearch = useCallback(() => {
    setQuery('');
    setEntityType(defaultEntityType);
    setFilters({});
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(1);
    setResults({
      data: [],
      total: 0,
      page: 1,
      page_size: defaultPageSize,
      total_pages: 0,
    });
    setError(null);
  }, [defaultEntityType, defaultPageSize]);

  // Load saved searches and history on mount
  useEffect(() => {
    loadSavedSearches();
    loadSearchHistory();
  }, [loadSavedSearches, loadSearchHistory]);

  return {
    // Search state
    query,
    setQuery,
    entityType,
    setEntityType,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    page,
    setPage,
    pageSize,
    setPageSize,

    // Results
    results,
    loading,
    error,

    // Actions
    executeSearch,
    resetSearch,

    // Autocomplete
    suggestions,
    loadingSuggestions,
    fetchSuggestions,

    // Saved searches
    savedSearches,
    loadingSaved,
    saveSearch,
    applySavedSearch,
    deleteSavedSearch: deleteSaved,
    loadSavedSearches,

    // Search history
    searchHistory,
    loadingHistory,
    loadSearchHistory,
    clearHistory,
  };
}
