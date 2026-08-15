/**
 * OptimisticUpdateManager — Manages optimistic UI updates before server confirmation.
 * Tracks pending updates and provides rollback on failure.
 */

export interface OptimisticUpdate<T = Record<string, unknown>> {
  id: string;
  table: string;
  recordId: string;
  previousData: T;
  pendingData: T;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'rolled_back';
}

export class OptimisticUpdateManager {
  private updates = new Map<string, OptimisticUpdate>();

  /**
   * Apply an optimistic update. Returns the update ID for tracking.
   */
  apply<T extends Record<string, unknown>>(
    table: string,
    recordId: string,
    previousData: T,
    pendingData: T
  ): string {
    const id = `${table}-${recordId}-${Date.now()}`;

    const update: OptimisticUpdate<T> = {
      id,
      table,
      recordId,
      previousData,
      pendingData,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    this.updates.set(id, update);
    return id;
  }

  /**
   * Confirm that an optimistic update was applied on the server.
   */
  confirm(updateId: string): void {
    const update = this.updates.get(updateId);
    if (update) {
      update.status = 'confirmed';
      // Clean up confirmed updates after a delay
      setTimeout(() => {
        this.updates.delete(updateId);
      }, 5000);
    }
  }

  /**
   * Roll back an optimistic update, returning the previous data.
   */
  rollback<T>(updateId: string): T | null {
    const update = this.updates.get(updateId);
    if (update) {
      update.status = 'rolled_back';
      const previousData = update.previousData as T;
      // Clean up rolled back updates after a delay
      setTimeout(() => {
        this.updates.delete(updateId);
      }, 5000);
      return previousData;
    }
    return null;
  }

  /**
   * Get pending updates for a specific record.
   */
  getPendingForRecord<T>(table: string, recordId: string): OptimisticUpdate<T>[] {
    return Array.from(this.updates.values())
      .filter(u => u.table === table && u.recordId === recordId && u.status === 'pending') as OptimisticUpdate<T>[];
  }

  /**
   * Get all pending updates.
   */
  getAllPending(): OptimisticUpdate[] {
    return Array.from(this.updates.values()).filter(u => u.status === 'pending');
  }

  /**
   * Check if a record has pending optimistic updates.
   */
  hasPendingUpdate(table: string, recordId: string): boolean {
    return this.getPendingForRecord(table, recordId).length > 0;
  }

  /**
   * Get the optimistic data for a record (if any pending update exists).
   */
  getOptimisticData<T extends Record<string, unknown>>(table: string, recordId: string): T | null {
    const pending = this.getPendingForRecord<T>(table, recordId);
    if (pending.length > 0) {
      // Return the most recent pending update
      return pending[pending.length - 1].pendingData;
    }
    return null;
  }

  /**
   * Clear all updates for a table (used on logout or error recovery).
   */
  clearTable(table: string): void {
    for (const [id, update] of this.updates) {
      if (update.table === table) {
        this.updates.delete(id);
      }
    }
  }

  /**
   * Clear all updates.
   */
  clearAll(): void {
    this.updates.clear();
  }

  /**
   * Get count of pending updates.
   */
  get pendingCount(): number {
    return this.getAllPending().length;
  }
}
