import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { type DeskTab, deskRoutes } from './useRouting';

export interface NavigateState {
  from?: string;
  search?: string;
  filters?: Record<string, string>;
}

/**
 * Hook providing navigation helper functions for desk routes.
 * Wraps react-router's navigate with typed desk-specific paths.
 */
export function useNavigateTo() {
  const navigate = useNavigate();

  const navigateToDeskList = useCallback(
    (state?: NavigateState) => {
      navigate(deskRoutes.list(), { state });
    },
    [navigate]
  );

  const navigateToDesk = useCallback(
    (deskId: string, state?: NavigateState) => {
      navigate(deskRoutes.leads(deskId), { state });
    },
    [navigate]
  );

  const navigateToLead = useCallback(
    (deskId: string, leadId: string, state?: NavigateState) => {
      navigate(deskRoutes.lead(deskId, leadId), { state });
    },
    [navigate]
  );

  const navigateToInvoice = useCallback(
    (deskId: string, invoiceId: string, state?: NavigateState) => {
      navigate(deskRoutes.invoice(deskId, invoiceId), { state });
    },
    [navigate]
  );

  const navigateToDeskTab = useCallback(
    (deskId: string, tab: DeskTab, state?: NavigateState) => {
      const routeFn = deskRoutes[tab];
      if (typeof routeFn === 'function') {
        navigate((routeFn as (id: string) => string)(deskId), { state });
      }
    },
    [navigate]
  );

  const navigateToBilling = useCallback(
    (deskId: string, state?: NavigateState) => {
      navigate(deskRoutes.billing(deskId), { state });
    },
    [navigate]
  );

  const navigateToReports = useCallback(
    (deskId: string, state?: NavigateState) => {
      navigate(deskRoutes.reports(deskId), { state });
    },
    [navigate]
  );

  const navigateToSettings = useCallback(
    (deskId: string, state?: NavigateState) => {
      navigate(deskRoutes.settings(deskId), { state });
    },
    [navigate]
  );

  const navigateToFrontDesk = useCallback(
    (state?: NavigateState) => {
      navigate(deskRoutes.frontDesk(), { state });
    },
    [navigate]
  );

  const navigateToSchoolDesk = useCallback(
    (state?: NavigateState) => {
      navigate(deskRoutes.schoolDesk(), { state });
    },
    [navigate]
  );

  const goBack = useCallback(
    (fallbackPath?: string) => {
      if (window.history.length > 1) {
        navigate(-1);
      } else if (fallbackPath) {
        navigate(fallbackPath);
      }
    },
    [navigate]
  );

  return {
    navigateToDeskList,
    navigateToDesk,
    navigateToLead,
    navigateToInvoice,
    navigateToDeskTab,
    navigateToBilling,
    navigateToReports,
    navigateToSettings,
    navigateToFrontDesk,
    navigateToSchoolDesk,
    goBack,
  };
}
