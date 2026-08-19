import { useParams, useSearchParams } from 'react-router-dom';

export type DeskTab = 'leads' | 'invoices' | 'registrations' | 'billing' | 'reports' | 'settings';

export const DESK_TABS: DeskTab[] = ['leads', 'invoices', 'registrations', 'billing', 'reports', 'settings'];

export const DESK_TAB_LABELS: Record<DeskTab, string> = {
  leads: 'Leads',
  invoices: 'Invoices',
  registrations: 'Registrations',
  billing: 'Billing',
  reports: 'Reports',
  settings: 'Settings',
};

/**
 * Hook to get the current desk ID from URL params.
 * Assumes route pattern: /lms/office-desk/:deskId/*
 */
export function useDesk() {
  const params = useParams();
  const deskId = params.deskId ?? null;
  return { deskId };
}

/**
 * Hook to get desk ID + lead ID from URL params.
 * Assumes route pattern: /lms/office-desk/leads/:leadId
 */
export function useLead() {
  const params = useParams();
  const deskId = params.deskId ?? null;
  const leadId = params.leadId ?? null;
  return { deskId, leadId };
}

/**
 * Hook to get desk ID + invoice ID from URL params.
 * Assumes route pattern: /lms/office-desk/invoices/:invoiceId
 */
export function useInvoice() {
  const params = useParams();
  const deskId = params.deskId ?? null;
  const invoiceId = params.invoiceId ?? null;
  return { deskId, invoiceId };
}

/**
 * Hook to get the current desk tab from URL path.
 * Defaults to 'leads' if path doesn't match a known tab.
 */
export function useDeskTab() {
  const params = useParams();
  const deskId = params.deskId ?? null;

  // Extract tab from the wildcard path segment
  // Route pattern: /lms/office-desk/:deskId/*
  const location = window.location.pathname;
  const basePattern = `/lms/office-desk/${deskId ?? ''}`;
  const pathSuffix = location.replace(basePattern, '').replace(/^\//, '');

  // Parse first segment as tab
  const firstSegment = pathSuffix.split('/')[0] as DeskTab;
  const tab: DeskTab = DESK_TABS.includes(firstSegment) ? firstSegment : 'leads';

  return { deskId, tab };
}

/**
 * Hook to get search/query params for list views.
 */
export function useListParams() {
  const [searchParams] = useSearchParams();

  return {
    search: searchParams.get('search') ?? '',
    status: searchParams.get('status') ?? '',
    sort: searchParams.get('sort') ?? 'created_at',
    order: searchParams.get('order') ?? 'desc',
    view: searchParams.get('view') ?? 'active',
  };
}

/**
 * Helper to build URL paths for desk routes.
 */
export const deskRoutes = {
  list: () => '/lms/office-desk',
  leads: (deskId: string) => `/lms/office-desk/${deskId}/leads`,
  lead: (deskId: string, leadId: string) => `/lms/office-desk/${deskId}/leads/${leadId}`,
  invoices: (deskId: string) => `/lms/office-desk/${deskId}/invoices`,
  invoice: (deskId: string, invoiceId: string) =>
    `/lms/office-desk/${deskId}/invoices/${invoiceId}`,
  registrations: (deskId: string) => `/lms/office-desk/${deskId}/registrations`,
  registration: (deskId: string, registrationId: string) =>
    `/lms/office-desk/${deskId}/registrations/${registrationId}`,
  billing: (deskId: string) => `/lms/office-desk/${deskId}/billing`,
  reports: (deskId: string) => `/lms/office-desk/${deskId}/reports`,
  settings: (deskId: string) => `/lms/office-desk/${deskId}/settings`,
  frontDesk: () => '/lms/front-desk',
  schoolDesk: () => '/lms/school-desk',
} as const;
