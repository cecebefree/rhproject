/**
 * useTwoFactor — Hook for 2FA status, setup, and verification.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  type TwoFactorSetupResult,
  type TwoFactorStatus,
  confirmTwoFactorSetup,
  disableTwoFactor,
  getBackupCodesCount,
  getTwoFactorStatus,
  initiateTwoFactorSetup,
  regenerateBackupCodes,
  validateBackupCode,
  verifyTwoFactor,
} from '../features/office-desk/services/twoFactorService';

// ═══════════════════════════════════════════════════════════
// HOOK: useTwoFactorStatus
// ═══════════════════════════════════════════════════════════

export function useTwoFactorStatus(userId: string | null) {
  const [status, setStatus] = useState<TwoFactorStatus>({
    enabled: false,
    createdAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const fetchStatus = useCallback(async () => {
    if (!userId) {
      setStatus({ enabled: false, createdAt: null });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const result = await getTwoFactorStatus(userId);
      setStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch 2FA status');
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    enabled: status.enabled,
    createdAt: status.createdAt,
    loading,
    error,
    refresh: fetchStatus,
  };
}

// ═══════════════════════════════════════════════════════════
// HOOK: useTwoFactorSetup
// ═══════════════════════════════════════════════════════════

export function useTwoFactorSetup() {
  const [setupResult, setSetupResult] = useState<TwoFactorSetupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const setup = useCallback(async (userId: string, email: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const result = initiateTwoFactorSetup(userId, email);
      setSetupResult(result);
      setLoading(false);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initiate 2FA setup';
      setError(message);
      setLoading(false);
      throw new Error(message);
    }
  }, []);

  const confirm = useCallback(
    async (
      userId: string,
      tenantId: string,
      totpCode: string,
      backupCodes: string[]
    ) => {
      if (!setupResult) {
        setError('No setup in progress');
        return false;
      }

      setLoading(true);
      setError(undefined);
      try {
        const result = await confirmTwoFactorSetup(
          userId,
          tenantId,
          totpCode,
          setupResult.secret,
          backupCodes
        );
        setLoading(false);
        if (!result.success) {
          setError(result.error);
        }
        return result.success;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to confirm 2FA setup';
        setError(message);
        setLoading(false);
        return false;
      }
    },
    [setupResult]
  );

  const clearSetup = useCallback(() => {
    setSetupResult(null);
    setError(undefined);
  }, []);

  return {
    setupResult,
    setup,
    confirm,
    clearSetup,
    loading,
    error,
  };
}

// ═══════════════════════════════════════════════════════════
// HOOK: useTwoFactorVerify
// ═══════════════════════════════════════════════════════════

export function useTwoFactorVerify() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const verify = useCallback(async (userId: string, totpCode: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await verifyTwoFactor(userId, totpCode);
      setLoading(false);
      if (!result.valid && result.error) {
        setError(result.error);
      }
      return result.valid;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify 2FA';
      setError(message);
      setLoading(false);
      return false;
    }
  }, []);

  const verifyBackup = useCallback(async (userId: string, backupCode: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await validateBackupCode(userId, backupCode);
      setLoading(false);
      if (!result.valid && result.error) {
        setError(result.error);
      }
      return result.valid;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify backup code';
      setError(message);
      setLoading(false);
      return false;
    }
  }, []);

  return {
    verify,
    verifyBackup,
    loading,
    error,
  };
}

// ═══════════════════════════════════════════════════════════
// HOOK: useTwoFactorDisable
// ═══════════════════════════════════════════════════════════

export function useTwoFactorDisable() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const disable = useCallback(async (userId: string, totpCode: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await disableTwoFactor(userId, totpCode);
      setLoading(false);
      if (!result.success) {
        setError(result.error);
      }
      return result.success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disable 2FA';
      setError(message);
      setLoading(false);
      return false;
    }
  }, []);

  return {
    disable,
    loading,
    error,
  };
}

// ═══════════════════════════════════════════════════════════
// HOOK: useTwoFactorRegenerate
// ═══════════════════════════════════════════════════════════

export function useTwoFactorRegenerate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const regenerate = useCallback(async (userId: string, totpCode: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await regenerateBackupCodes(userId, totpCode);
      setLoading(false);
      if (result.error) {
        setError(result.error);
      }
      return result.backupCodes;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate backup codes';
      setError(message);
      setLoading(false);
      return [];
    }
  }, []);

  return {
    regenerate,
    loading,
    error,
  };
}

// ═══════════════════════════════════════════════════════════
// HOOK: useBackupCodesCount
// ═══════════════════════════════════════════════════════════

export function useBackupCodesCount(userId: string | null) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const fetchCount = useCallback(async () => {
    if (!userId) {
      setCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const result = await getBackupCodesCount(userId);
      setCount(result.count);
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch backup codes count');
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return {
    count,
    loading,
    error,
    refresh: fetchCount,
  };
}
