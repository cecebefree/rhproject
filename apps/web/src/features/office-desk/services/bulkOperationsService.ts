import { supabase } from './supabase';
import type { EntityType } from '../components/BulkSelectionContext';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type OperationType = 'bulk_edit' | 'bulk_delete' | 'bulk_assign' | 'bulk_status_change';

export interface BulkOperationResult {
  success: boolean;
  totalAffected: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ id: string; error: string }>;
  operationId?: string;
}

export interface BulkEditValues {
  status?: string;
  assigned_to?: string;
  tags?: string[];
  category?: string;
  priority?: string;
  notes?: string;
}

export interface BulkOperationHistory {
  id: string;
  tenant_id: string;
  user_id: string;
  operation_type: OperationType;
  entity_type: EntityType;
  entity_ids: string[];
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  is_undoable: boolean;
  undone_at: string | null;
  undone_by: string | null;
  total_affected: number;
  success_count: number;
  error_count: number;
  errors: Array<{ id: string; error: string }> | null;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// TABLE NAME HELPER
// ═══════════════════════════════════════════════════════════

function getTableName(entityType: EntityType): string {
  switch (entityType) {
    case 'lead':
      return 'front_desk.leads';
    case 'contact':
      return 'office_desk.contacts';
    case 'invoice':
      return 'office_desk.invoices';
  }
}

function getDeleteColumn(entityType: EntityType): string {
  return entityType === 'invoice' ? 'deleted_at' : 'archived_at';
}

// ═══════════════════════════════════════════════════════════
// BULK EDIT
// ═══════════════════════════════════════════════════════════

export async function bulkEdit(
  entityType: EntityType,
  entityIds: string[],
  values: BulkEditValues,
  tenantId: string,
  userId: string
): Promise<BulkOperationResult> {
  const tableName = getTableName(entityType);
  const errors: Array<{ id: string; error: string }> = [];
  let successCount = 0;

  // Get old values for undo
  const { data: oldRecords } = await supabase
    .from(tableName)
    .select('id, status, assigned_to, tags, category, priority, notes')
    .in('id', entityIds)
    .eq('tenant_id', tenantId);

  const oldValuesMap = new Map(oldRecords?.map((r) => [r.id, r]) || []);

  // Apply updates
  for (const id of entityIds) {
    try {
      const updateData: Record<string, unknown> = {};
      
      if (values.status !== undefined) updateData.status = values.status;
      if (values.assigned_to !== undefined) updateData.assigned_to = values.assigned_to;
      if (values.tags !== undefined) updateData.tags = values.tags;
      if (values.category !== undefined) updateData.category = values.category;
      if (values.priority !== undefined) updateData.priority = values.priority;
      if (values.notes !== undefined) updateData.notes = values.notes;

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) {
        errors.push({ id, error: error.message });
      } else {
        successCount++;
      }
    } catch (err) {
      errors.push({ id, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  // Record operation for undo
  const oldValues: Record<string, unknown> = {};
  if (oldRecords && oldRecords.length > 0) {
    const firstRecord = oldRecords[0];
    if (values.status !== undefined && firstRecord.status) oldValues.status = firstRecord.status;
    if (values.assigned_to !== undefined && firstRecord.assigned_to) oldValues.assigned_to = firstRecord.assigned_to;
    if (values.tags !== undefined && firstRecord.tags) oldValues.tags = firstRecord.tags;
    if (values.category !== undefined && firstRecord.category) oldValues.category = firstRecord.category;
    if (values.priority !== undefined && firstRecord.priority) oldValues.priority = firstRecord.priority;
    if (values.notes !== undefined && firstRecord.notes) oldValues.notes = firstRecord.notes;
  }

  const { data: operation } = await supabase
    .from('office_desk.bulk_operation_history')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      operation_type: 'bulk_edit',
      entity_type: entityType,
      entity_ids: entityIds,
      old_values: Object.keys(oldValues).length > 0 ? oldValues : null,
      new_values: values,
      total_affected: entityIds.length,
      success_count: successCount,
      error_count: errors.length,
      errors: errors.length > 0 ? errors : null,
    })
    .select('id')
    .single();

  return {
    success: errors.length === 0,
    totalAffected: entityIds.length,
    successCount,
    errorCount: errors.length,
    errors,
    operationId: operation?.id,
  };
}

// ═══════════════════════════════════════════════════════════
// BULK DELETE (Soft Delete)
// ═══════════════════════════════════════════════════════════

export async function bulkDelete(
  entityType: EntityType,
  entityIds: string[],
  tenantId: string,
  userId: string
): Promise<BulkOperationResult> {
  const tableName = getTableName(entityType);
  const deleteColumn = getDeleteColumn(entityType);
  const errors: Array<{ id: string; error: string }> = [];
  let successCount = 0;

  for (const id of entityIds) {
    try {
      const { error } = await supabase
        .from(tableName)
        .update({ [deleteColumn]: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) {
        errors.push({ id, error: error.message });
      } else {
        successCount++;
      }
    } catch (err) {
      errors.push({ id, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  // Record operation for undo
  const { data: operation } = await supabase
    .from('office_desk.bulk_operation_history')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      operation_type: 'bulk_delete',
      entity_type: entityType,
      entity_ids: entityIds,
      old_values: null,
      new_values: null,
      total_affected: entityIds.length,
      success_count: successCount,
      error_count: errors.length,
      errors: errors.length > 0 ? errors : null,
    })
    .select('id')
    .single();

  return {
    success: errors.length === 0,
    totalAffected: entityIds.length,
    successCount,
    errorCount: errors.length,
    errors,
    operationId: operation?.id,
  };
}

// ═══════════════════════════════════════════════════════════
// BULK ASSIGN
// ═══════════════════════════════════════════════════════════

export async function bulkAssign(
  entityType: EntityType,
  entityIds: string[],
  assignedTo: string,
  tenantId: string,
  userId: string
): Promise<BulkOperationResult> {
  const tableName = getTableName(entityType);
  const errors: Array<{ id: string; error: string }> = [];
  let successCount = 0;

  // Get old assigned_to values for undo
  const { data: oldRecords } = await supabase
    .from(tableName)
    .select('id, assigned_to')
    .in('id', entityIds)
    .eq('tenant_id', tenantId);

  const oldAssignedTo = oldRecords?.[0]?.assigned_to || null;

  for (const id of entityIds) {
    try {
      const { error } = await supabase
        .from(tableName)
        .update({ assigned_to: assignedTo })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) {
        errors.push({ id, error: error.message });
      } else {
        successCount++;
      }
    } catch (err) {
      errors.push({ id, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  // Record operation for undo
  const { data: operation } = await supabase
    .from('office_desk.bulk_operation_history')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      operation_type: 'bulk_assign',
      entity_type: entityType,
      entity_ids: entityIds,
      old_values: oldAssignedTo ? { assigned_to: oldAssignedTo } : null,
      new_values: { assigned_to: assignedTo },
      total_affected: entityIds.length,
      success_count: successCount,
      error_count: errors.length,
      errors: errors.length > 0 ? errors : null,
    })
    .select('id')
    .single();

  return {
    success: errors.length === 0,
    totalAffected: entityIds.length,
    successCount,
    errorCount: errors.length,
    errors,
    operationId: operation?.id,
  };
}

// ═══════════════════════════════════════════════════════════
// BULK STATUS CHANGE
// ═══════════════════════════════════════════════════════════

export async function bulkStatusChange(
  entityType: EntityType,
  entityIds: string[],
  newStatus: string,
  tenantId: string,
  userId: string
): Promise<BulkOperationResult> {
  const tableName = getTableName(entityType);
  const errors: Array<{ id: string; error: string }> = [];
  let successCount = 0;

  // Get old statuses for undo
  const { data: oldRecords } = await supabase
    .from(tableName)
    .select('id, status')
    .in('id', entityIds)
    .eq('tenant_id', tenantId);

  const oldStatus = oldRecords?.[0]?.status || null;

  for (const id of entityIds) {
    try {
      const { error } = await supabase
        .from(tableName)
        .update({ status: newStatus })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) {
        errors.push({ id, error: error.message });
      } else {
        successCount++;
      }
    } catch (err) {
      errors.push({ id, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  // Record operation for undo
  const { data: operation } = await supabase
    .from('office_desk.bulk_operation_history')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      operation_type: 'bulk_status_change',
      entity_type: entityType,
      entity_ids: entityIds,
      old_values: oldStatus ? { status: oldStatus } : null,
      new_values: { status: newStatus },
      total_affected: entityIds.length,
      success_count: successCount,
      error_count: errors.length,
      errors: errors.length > 0 ? errors : null,
    })
    .select('id')
    .single();

  return {
    success: errors.length === 0,
    totalAffected: entityIds.length,
    successCount,
    errorCount: errors.length,
    errors,
    operationId: operation?.id,
  };
}

// ═══════════════════════════════════════════════════════════
// UNDO OPERATION
// ═══════════════════════════════════════════════════════════

export async function undoBulkOperation(operationId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('undo_bulk_operation', {
    p_operation_id: operationId,
  });

  if (error) {
    console.error('Undo failed:', error);
    return false;
  }

  return data as boolean;
}

// ═══════════════════════════════════════════════════════════
// GET OPERATION HISTORY
// ═══════════════════════════════════════════════════════════

export async function getBulkOperationHistory(
  tenantId: string,
  limit = 50
): Promise<BulkOperationHistory[]> {
  const { data, error } = await supabase
    .from('office_desk.bulk_operation_history')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch operation history:', error);
    return [];
  }

  return data || [];
}

// ═══════════════════════════════════════════════════════════
// GET TEAM MEMBERS (for assign)
// ═══════════════════════════════════════════════════════════

export async function getTeamMembers(tenantId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('tenant_id', tenantId)
    .order('full_name');

  if (error) {
    console.error('Failed to fetch team members:', error);
    return [];
  }

  return data || [];
}