/**
 * ConflictResolver — Detects and resolves data conflicts
 * between local optimistic state and server state.
 */

export type ConflictStrategy = 'last-write-wins' | 'client-wins' | 'server-wins' | 'manual';

export interface ConflictItem<T = Record<string, unknown>> {
  id: string;
  table: string;
  localData: T;
  serverData: T;
  localTimestamp: string;
  serverTimestamp: string;
  fieldDifferences: FieldDifference[];
}

export interface FieldDifference {
  field: string;
  localValue: unknown;
  serverValue: unknown;
  changedAt: string;
}

export interface ConflictResolution<T> {
  resolved: T;
  strategy: ConflictStrategy;
  conflicts: FieldDifference[];
  resolvedAt: string;
}

/**
 * Detects conflicts between local and server versions of a record.
 */
export function detectConflict<T extends Record<string, unknown>>(
  localData: T,
  serverData: T,
  table: string
): ConflictItem<T> | null {
  const localTimestamp = String(localData.updated_at || localData.created_at || '');
  const serverTimestamp = String(serverData.updated_at || serverData.created_at || '');

  // If server is newer or equal, no conflict
  if (serverTimestamp >= localTimestamp) {
    return null;
  }

  // Find field-level differences
  const fieldDifferences: FieldDifference[] = [];
  const allKeys = new Set([...Object.keys(localData), ...Object.keys(serverData)]);

  for (const key of allKeys) {
    if (key === 'updated_at' || key === 'created_at' || key === 'version_id') continue;

    const localVal = localData[key];
    const serverVal = serverData[key];

    // Skip if values are the same
    if (JSON.stringify(localVal) === JSON.stringify(serverVal)) continue;

    // Skip if only one side has a value and it's undefined/null on the other
    if ((localVal === undefined || localVal === null) && (serverVal === undefined || serverVal === null)) {
      continue;
    }

    fieldDifferences.push({
      field: key,
      localValue: localVal,
      serverValue: serverVal,
      changedAt: serverTimestamp,
    });
  }

  if (fieldDifferences.length === 0) {
    return null;
  }

  return {
    id: String(localData.id || ''),
    table,
    localData,
    serverData,
    localTimestamp,
    serverTimestamp,
    fieldDifferences,
  };
}

/**
 * Resolves a conflict using the specified strategy.
 */
export function resolveConflict<T extends Record<string, unknown>>(
  conflict: ConflictItem<T>,
  strategy: ConflictStrategy
): ConflictResolution<T> {
  let resolved: T;

  switch (strategy) {
    case 'client-wins':
      resolved = { ...conflict.serverData, ...conflict.localData, updated_at: new Date().toISOString() };
      break;

    case 'server-wins':
      resolved = { ...conflict.localData, ...conflict.serverData };
      break;

    case 'last-write-wins':
      // Server wins because server timestamp is always >= local in our detection
      resolved = { ...conflict.localData, ...conflict.serverData };
      break;

    case 'manual':
      // For manual resolution, return server data as base (caller will merge)
      resolved = { ...conflict.localData, ...conflict.serverData };
      break;

    default:
      resolved = { ...conflict.localData, ...conflict.serverData };
  }

  return {
    resolved,
    strategy,
    conflicts: conflict.fieldDifferences,
    resolvedAt: new Date().toISOString(),
  };
}

/**
 * Merge lead data from local and server, preferring local for specified fields.
 */
export function mergeLeadData(
  local: Record<string, unknown>,
  server: Record<string, unknown>,
  preferLocalFields?: string[]
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...server };

  if (preferLocalFields) {
    for (const field of preferLocalFields) {
      if (local[field] !== undefined) {
        merged[field] = local[field];
      }
    }
  } else {
    // Default: prefer local values for user-editable fields
    const userEditableFields = [
      'full_name', 'email', 'phone', 'status', 'source', 'notes',
      'assigned_to', 'priority', 'tags', 'custom_fields'
    ];

    for (const field of userEditableFields) {
      if (local[field] !== undefined && local[field] !== server[field]) {
        merged[field] = local[field];
      }
    }
  }

  merged.updated_at = new Date().toISOString();
  return merged;
}

/**
 * Merge invoice data from local and server.
 */
export function mergeInvoiceData(
  local: Record<string, unknown>,
  server: Record<string, unknown>,
  preferLocalFields?: string[]
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...server };

  if (preferLocalFields) {
    for (const field of preferLocalFields) {
      if (local[field] !== undefined) {
        merged[field] = local[field];
      }
    }
  } else {
    const userEditableFields = [
      'status', 'notes', 'due_date', 'tax_rate', 'discount',
      'shipping_address', 'billing_address'
    ];

    for (const field of userEditableFields) {
      if (local[field] !== undefined && local[field] !== server[field]) {
        merged[field] = local[field];
      }
    }
  }

  merged.updated_at = new Date().toISOString();
  return merged;
}

/**
 * Merge contact data from local and server.
 */
export function mergeContactData(
  local: Record<string, unknown>,
  server: Record<string, unknown>,
  preferLocalFields?: string[]
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...server };

  if (preferLocalFields) {
    for (const field of preferLocalFields) {
      if (local[field] !== undefined) {
        merged[field] = local[field];
      }
    }
  } else {
    const userEditableFields = [
      'full_name', 'email', 'phone', 'company', 'role',
      'notes', 'tags', 'custom_fields'
    ];

    for (const field of userEditableFields) {
      if (local[field] !== undefined && local[field] !== server[field]) {
        merged[field] = local[field];
      }
    }
  }

  merged.updated_at = new Date().toISOString();
  return merged;
}
