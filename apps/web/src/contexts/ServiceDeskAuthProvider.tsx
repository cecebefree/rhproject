import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface ServiceDeskAuthState {
  isAuthenticated: boolean;
  userId: string | null;
  deskId: string | null;
  password: string;
}

interface ServiceDeskAuthContextValue extends ServiceDeskAuthState {
  login: (password: string) => boolean;
  logout: () => void;
  selectDesk: (deskId: string) => void;
}

const SESSION_KEY = 'serviceDeskAuth';

const DESK_PASSWORD = import.meta.env.VITE_DESK_PASSWORD || '';

function readPersistedState(): ServiceDeskAuthState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ServiceDeskAuthState;
      return {
        isAuthenticated: parsed.isAuthenticated ?? false,
        userId: parsed.userId ?? null,
        deskId: parsed.deskId ?? null,
        password: parsed.password ?? '',
      };
    }
  } catch {
    // malformed JSON — fall through to defaults
  }
  return { isAuthenticated: false, userId: null, deskId: null, password: '' };
}

function persistState(state: ServiceDeskAuthState): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
}

function clearPersistedState(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

const ServiceDeskAuthContext = createContext<ServiceDeskAuthContextValue | null>(null);

export function ServiceDeskAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ServiceDeskAuthState>(readPersistedState);

  // Restore from sessionStorage on mount
  useEffect(() => {
    setState(readPersistedState());
  }, []);

  const login = useCallback((password: string): boolean => {
    if (password === DESK_PASSWORD) {
      const next: ServiceDeskAuthState = {
        isAuthenticated: true,
        userId: `desk-user-${Date.now()}`,
        deskId: null,
        password,
      };
      setState(next);
      persistState(next);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    const next: ServiceDeskAuthState = {
      isAuthenticated: false,
      userId: null,
      deskId: null,
      password: '',
    };
    setState(next);
    clearPersistedState();
  }, []);

  const selectDesk = useCallback((deskId: string) => {
    setState((prev) => {
      const next = { ...prev, deskId };
      persistState(next);
      return next;
    });
  }, []);

  const value = useMemo<ServiceDeskAuthContextValue>(
    () => ({ ...state, login, logout, selectDesk }),
    [state, login, logout, selectDesk]
  );

  return (
    <ServiceDeskAuthContext.Provider value={value}>{children}</ServiceDeskAuthContext.Provider>
  );
}

export function useServiceDeskAuth(): ServiceDeskAuthContextValue {
  const ctx = useContext(ServiceDeskAuthContext);
  if (!ctx) {
    throw new Error('useServiceDeskAuth must be used within a ServiceDeskAuthProvider');
  }
  return ctx;
}
