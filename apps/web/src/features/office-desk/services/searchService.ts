// SearchService — Full-text search, filters, saved searches (Row 2)

import { supabase, supabaseUntyped } from './supabase';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type SearchEntityType = 'contacts' | 'leads' | 'invoices' | 'all';

export interface SearchFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is_null' | 'is_not_null';
  value: unknown;
}

export interface SearchFilters {
  date_from?: string;
  date_to?: string;
  status?: string[];
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  conditions?: SearchFilter[];
  [key: string]: unknown;
}

export interface SearchOptions {
  entity_type: SearchEntityType;
  query?: string;
  filters?: SearchFilters;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
  tenant_id: string;
}

export interface SearchResult<T = Record<string, unknown>> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SavedSearch {
  id: string;
  tenant_id: string;
  user_id: string;
  name: string;
  description: string | null;
  entity_type: SearchEntityType;
  search_query: string | null;
  filters: SearchFilters;
  sort_by: string;
  sort_order: 'asc' | 'desc';
  is_default: boolean;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchHistoryEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  entity_type: SearchEntityType;
  search_query: string;
  filters: SearchFilters;
  result_count: number;
  searched_at: string;
}

// ═══════════════════════════════════════════════════════════
// FULL-TEXT SEARCH
// ═══════════════════════════════════════════════════════════

function buildSearchQuery(
  entityType: SearchEntityType,
  query: string,
  tenantId: string
) {
  const searchTerms = query.trim().split(/\s+/).join(' & ');

  switch (entityType) {
    case 'contacts':
    case 'leads':
      return supabaseUntyped
        .from('front_desk.leads')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%,phone.ilike.%${query}%`)
        .order('created_at', { ascending: false });

    case 'invoices':
      return supabaseUntyped
        .from('office_desk.invoices')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .or(`invoice_number.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false });

    case 'all':
      // Search across all entities - return combined results
      return null; // Handled separately
  }
}

export async function search<T = Record<string, unknown>>(
  options: SearchOptions
): Promise<SearchResult<T>> {
  const {
    entity_type,
    query,
    filters,
    sort_by = 'created_at',
    sort_order = 'desc',
    page = 1,
    page_size = 20,
    tenant_id,
  } = options;

  // If searching all entities, combine results
  if (entity_type === 'all' && query) {
    const [contactsResult, leadsResult, invoicesResult] = await Promise.all([
      search<T>({ ...options, entity_type: 'contacts', page: 1, page_size: 5 }),
      search<T>({ ...options, entity_type: 'leads', page: 1, page_size: 5 }),
      search<T>({ ...options, entity_type: 'invoices', page: 1, page_size: 5 }),
    ]);

    const allData = [
      ...contactsResult.data.map((d) => ({ ...d, _entity_type: 'contacts' })),
      ...leadsResult.data.map((d) => ({ ...d, _entity_type: 'leads' })),
      ...invoicesResult.data.map((d) => ({ ...d, _entity_type: 'invoices' })),
    ];

    return {
      data: allData.slice(0, page_size) as T[],
      total: allData.length,
      page: 1,
      page_size,
      total_pages: 1,
    };
  }

  // Build query based on entity type
  let queryBuilder = buildSearchQuery(entity_type, query || '', tenant_id);

  if (!queryBuilder) {
    return { data: [], total: 0, page: 1, page_size, total_pages: 0 };
  }

  // Apply filters
  if (filters) {
    if (filters.date_from) {
      queryBuilder = queryBuilder.gte('created_at', filters.date_from);
    }
    if (filters.date_to) {
      queryBuilder = queryBuilder.lte('created_at', filters.date_to);
    }
    if (filters.status && filters.status.length > 0) {
      queryBuilder = queryBuilder.in('status', filters.status);
    }
    if (filters.conditions) {
      for (const condition of filters.conditions) {
        queryBuilder = applyFilter(queryBuilder, condition);
      }
    }
  }

  // Apply sorting
  queryBuilder = queryBuilder.order(sort_by, { ascending: sort_order === 'asc' });

  // Apply pagination
  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  queryBuilder = queryBuilder.range(from, to);

  const { data, error, count } = await queryBuilder;

  if (error) throw error;

  return {
    data: (data as T[]) || [],
    total: count || 0,
    page,
    page_size,
    total_pages: Math.ceil((count || 0) / page_size),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilter(queryBuilder: any, filter: SearchFilter): any {
  const { field, operator, value } = filter;

  switch (operator) {
    case 'eq':
      return queryBuilder.eq(field, value);
    case 'neq':
      return queryBuilder.neq(field, value);
    case 'gt':
      return queryBuilder.gt(field, value);
    case 'gte':
      return queryBuilder.gte(field, value);
    case 'lt':
      return queryBuilder.lt(field, value);
    case 'lte':
      return queryBuilder.lte(field, value);
    case 'like':
      return queryBuilder.like(field, `%${value}%`);
    case 'ilike':
      return queryBuilder.ilike(field, `%${value}%`);
    case 'in':
      return queryBuilder.in(field, value as unknown[]);
    case 'is_null':
      return queryBuilder.is(field, null);
    case 'is_not_null':
      return queryBuilder.not(field, 'is', null);
    default:
      return queryBuilder;
  }
}

// ═══════════════════════════════════════════════════════════
// AUTOCOMPLETE
// ═══════════════════════════════════════════════════════════

export interface AutocompleteResult {
  id: string;
  name: string;
  email?: string;
  company?: string;
  entity_type: string;
}

export async function autocomplete(
  query: string,
  tenantId: string,
  limit = 5
): Promise<AutocompleteResult[]> {
  if (!query || query.length < 2) return [];

  const results: AutocompleteResult[] = [];

  // Search contacts/leads
  const { data: leads } = await supabaseUntyped
    .from('front_desk.leads')
    .select('id, name, email, company')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .or(`name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
    .limit(limit);

  if (leads) {
    results.push(
      ...leads.map((l: Record<string, unknown>) => ({
        id: l.id as string,
        name: l.name as string,
        email: l.email as string | undefined,
        company: l.company as string | undefined,
        entity_type: 'leads',
      }))
    );
  }

  // Search invoices
  const { data: invoices } = await supabaseUntyped
    .from('office_desk.invoices')
    .select('id, invoice_number, description')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .or(`invoice_number.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(limit);

  if (invoices) {
    results.push(
      ...invoices.map((i: Record<string, unknown>) => ({
        id: i.id as string,
        name: (i.invoice_number as string) || 'Untitled Invoice',
        email: i.description as string | undefined,
        entity_type: 'invoices',
      }))
    );
  }

  return results.slice(0, limit);
}

// ═══════════════════════════════════════════════════════════
// SAVED SEARCHES CRUD
// ═══════════════════════════════════════════════════════════

export async function selectSavedSearches(userId: string, tenantId: string) {
  return supabaseUntyped
    .from('office_desk.saved_searches')
    .select('*')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .order('use_count', { ascending: false })
    .order('created_at', { ascending: false });
}

export async function getSavedSearch(searchId: string) {
  return supabaseUntyped
    .from('office_desk.saved_searches')
    .select('*')
    .eq('id', searchId)
    .single();
}

export async function createSavedSearch(search: Omit<SavedSearch, 'id' | 'created_at' | 'updated_at' | 'use_count' | 'last_used_at'>) {
  return supabaseUntyped
    .from('office_desk.saved_searches')
    .insert(search)
    .select()
    .single();
}

export async function updateSavedSearch(searchId: string, updates: Partial<SavedSearch>) {
  return supabaseUntyped
    .from('office_desk.saved_searches')
    .update(updates)
    .eq('id', searchId)
    .select()
    .single();
}

export async function deleteSavedSearch(searchId: string) {
  return supabaseUntyped
    .from('office_desk.saved_searches')
    .delete()
    .eq('id', searchId);
}

export async function incrementSearchUsage(searchId: string) {
  return supabaseUntyped
    .from('office_desk.saved_searches')
    .update({
      use_count: supabaseUntyped.rpc('increment', { x: 1 }),
      last_used_at: new Date().toISOString(),
    })
    .eq('id', searchId);
}

// ═══════════════════════════════════════════════════════════
// SEARCH HISTORY
// ═══════════════════════════════════════════════════════════

export async function selectSearchHistory(userId: string, tenantId: string, limit = 10) {
  return supabaseUntyped
    .from('office_desk.search_history')
    .select('*')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .order('searched_at', { ascending: false })
    .limit(limit);
}

export async function addSearchHistory(entry: Omit<SearchHistoryEntry, 'id' | 'searched_at'>) {
  return supabaseUntyped
    .from('office_desk.search_history')
    .insert({
      ...entry,
      searched_at: new Date().toISOString(),
    })
    .select()
    .single();
}

export async function clearSearchHistory(userId: string) {
  return supabaseUntyped
    .from('office_desk.search_history')
    .delete()
    .eq('user_id', userId);
}

// ═══════════════════════════════════════════════════════════
// QUICK FILTERS (predefined common searches)
// ═══════════════════════════════════════════════════════════

export interface QuickFilter {
  id: string;
  name: string;
  entity_type: SearchEntityType;
  filters: SearchFilters;
}

export const QUICK_FILTERS: QuickFilter[] = [
  {
    id: 'recent_contacts',
    name: 'Recent Contacts',
    entity_type: 'contacts',
    filters: { date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
  },
  {
    id: 'new_leads',
    name: 'New Leads (This Week)',
    entity_type: 'leads',
    filters: {
      status: ['enquiry'],
      date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    id: 'overdue_invoices',
    name: 'Overdue Invoices',
    entity_type: 'invoices',
    filters: { status: ['overdue'] },
  },
  {
    id: 'paid_invoices',
    name: 'Paid Invoices',
    entity_type: 'invoices',
    filters: { status: ['paid'] },
  },
  {
    id: 'qualified_leads',
    name: 'Qualified Leads',
    entity_type: 'leads',
    filters: { status: ['qualified'] },
  },
];
