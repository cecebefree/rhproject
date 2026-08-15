/**
 * useEmailTemplate — Hook for email template CRUD, preview, and usage.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type EmailTemplate,
  type EmailTemplateCreateInput,
  type EmailTemplateUpdateInput,
  type EmailTemplateUsage,
  type TemplateUsageStatus,
  deleteTemplate,
  getTemplateById,
  getTemplateStats,
  getTemplateUsageStats,
  insertTemplate,
  logTemplateUsage,
  renderPreview,
  selectAllTemplateUsage,
  selectTemplateUsage,
  selectTemplates,
  subscribeToTemplateUsage,
  subscribeToTemplates,
  updateTemplate,
  updateTemplateUsageStatus,
} from '../features/office-desk/services/emailTemplateService';

// ═══════════════════════════════════════════════════════════
// HOOK: useEmailTemplates
// ═══════════════════════════════════════════════════════════

export function useEmailTemplates(tenantId: string, includeInactive = false) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await selectTemplates(tenantId, includeInactive);
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  }, [tenantId, includeInactive]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Realtime subscription
  useEffect(() => {
    const channel = subscribeToTemplates(tenantId, () => {
      fetchTemplates();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [tenantId, fetchTemplates]);

  const create = useCallback(
    async (input: EmailTemplateCreateInput, userId?: string) => {
      const { data, error: createError } = await insertTemplate(input, tenantId, userId);
      if (createError) {
        return { data: null, error: createError.message };
      }
      await fetchTemplates();
      return { data, error: null };
    },
    [tenantId, fetchTemplates]
  );

  const update = useCallback(
    async (templateId: string, updates: EmailTemplateUpdateInput) => {
      const { data, error: updateError } = await updateTemplate(templateId, updates);
      if (updateError) {
        return { data: null, error: updateError.message };
      }
      await fetchTemplates();
      return { data, error: null };
    },
    [fetchTemplates]
  );

  const remove = useCallback(
    async (templateId: string) => {
      const { error: deleteError } = await deleteTemplate(templateId);
      if (deleteError) {
        return { error: deleteError.message };
      }
      await fetchTemplates();
      return { error: null };
    },
    [fetchTemplates]
  );

  return {
    templates,
    loading,
    error,
    create,
    update,
    remove,
    refresh: fetchTemplates,
  };
}

// ═══════════════════════════════════════════════════════════
// HOOK: useEmailTemplate
// ═══════════════════════════════════════════════════════════

export function useEmailTemplate(templateId: string | null) {
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplate = useCallback(async () => {
    if (!templateId) {
      setTemplate(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await getTemplateById(templateId);
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setTemplate(data);
    }
    setLoading(false);
  }, [templateId]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const update = useCallback(
    async (updates: EmailTemplateUpdateInput) => {
      if (!templateId) return { data: null, error: 'No template ID' };
      const { data, error: updateError } = await updateTemplate(templateId, updates);
      if (updateError) {
        return { data: null, error: updateError.message };
      }
      await fetchTemplate();
      return { data, error: null };
    },
    [templateId, fetchTemplate]
  );

  const remove = useCallback(async () => {
    if (!templateId) return { error: 'No template ID' };
    const { error: deleteError } = await deleteTemplate(templateId);
    if (deleteError) {
      return { error: deleteError.message };
    }
    return { error: null };
  }, [templateId]);

  return {
    template,
    loading,
    error,
    update,
    remove,
    refresh: fetchTemplate,
  };
}

// ═══════════════════════════════════════════════════════════
// HOOK: useTemplatePreview
// ═══════════════════════════════════════════════════════════

export function useTemplatePreview(
  template: { subject: string; body: string } | null,
  variables: Record<string, string>
) {
  const preview = useMemo(() => {
    if (!template) return null;
    return renderPreview(template, variables);
  }, [template, variables]);

  return { preview, error: null };
}

// ═══════════════════════════════════════════════════════════
// HOOK: useTemplateStats
// ═══════════════════════════════════════════════════════════

export function useTemplateStats(tenantId: string) {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTemplateStats(tenantId);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh: fetchStats,
  };
}

// ═══════════════════════════════════════════════════════════
// HOOK: useTemplateUsage
// ═══════════════════════════════════════════════════════════

export function useTemplateUsage(
  tenantId: string,
  templateId?: string,
  statusFilter?: TemplateUsageStatus
) {
  const [usages, setUsages] = useState<EmailTemplateUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsages = useCallback(async () => {
    setLoading(true);
    setError(null);

    let result;
    if (templateId) {
      result = await selectTemplateUsage(templateId);
    } else {
      result = await selectAllTemplateUsage(tenantId, 50, 0, statusFilter);
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      setUsages(result.data || []);
    }
    setLoading(false);
  }, [tenantId, templateId, statusFilter]);

  useEffect(() => {
    fetchUsages();
  }, [fetchUsages]);

  // Realtime subscription
  useEffect(() => {
    const channel = subscribeToTemplateUsage(tenantId, () => {
      fetchUsages();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [tenantId, fetchUsages]);

  const logUsage = useCallback(
    async (
      templateId: string,
      contactId: string | null,
      status: TemplateUsageStatus,
      variablesUsed: Record<string, string> = {}
    ) => {
      const { data, error: logError } = await logTemplateUsage(
        templateId,
        contactId,
        tenantId,
        status,
        variablesUsed
      );
      if (logError) {
        return { data: null, error: logError.message };
      }
      await fetchUsages();
      return { data, error: null };
    },
    [tenantId, fetchUsages]
  );

  const updateStatus = useCallback(
    async (usageId: string, status: TemplateUsageStatus) => {
      const { data, error: updateError } = await updateTemplateUsageStatus(usageId, status);
      if (updateError) {
        return { data: null, error: updateError.message };
      }
      await fetchUsages();
      return { data, error: null };
    },
    [fetchUsages]
  );

  return {
    usages,
    loading,
    error,
    logUsage,
    updateStatus,
    refresh: fetchUsages,
  };
}

// ═══════════════════════════════════════════════════════════
// HOOK: useTemplateUsageStats
// ═══════════════════════════════════════════════════════════

export function useTemplateUsageStats(templateId: string | null) {
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!templateId) {
      setStats({ total: 0, sent: 0, failed: 0, pending: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getTemplateUsageStats(templateId);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage stats');
    }
    setLoading(false);
  }, [templateId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh: fetchStats,
  };
}
