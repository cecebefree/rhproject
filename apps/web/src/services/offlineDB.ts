/**
 * OfflineDB — IndexedDB wrapper for offline data persistence.
 * Stores leads, invoices, and contacts for offline access.
 */

const DB_NAME = 'redhouse_offline';
const DB_VERSION = 2;

export interface OfflineRecord {
  id: string;
  tenant_id: string;
  table: string;
  data: Record<string, unknown>;
  lastSynced: string;
  isDirty: boolean;
  version: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create records store
      if (!db.objectStoreNames.contains('records')) {
        const store = db.createObjectStore('records', { keyPath: 'id' });
        store.createIndex('tenant_id', 'tenant_id', { unique: false });
        store.createIndex('table', 'table', { unique: false });
        store.createIndex('table_tenant', ['table', 'tenant_id'], { unique: false });
        store.createIndex('isDirty', 'isDirty', { unique: false });
        store.createIndex('lastSynced', 'lastSynced', { unique: false });
      }

      // Create mutations store (for offline queue)
      if (!db.objectStoreNames.contains('mutations')) {
        const store = db.createObjectStore('mutations', { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('table', 'table', { unique: false });
      }
    };
  });
}

export class OfflineDB {
  /**
   * Store a record for offline access.
   */
  static async putRecord(record: OfflineRecord): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('records', 'readwrite');
      const store = transaction.objectStore('records');
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  }

  /**
   * Get a record by ID.
   */
  static async getRecord(id: string): Promise<OfflineRecord | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('records', 'readonly');
      const store = transaction.objectStore('records');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  }

  /**
   * Get all records for a table and tenant.
   */
  static async getRecordsByTable(table: string, tenantId: string): Promise<OfflineRecord[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('records', 'readonly');
      const store = transaction.objectStore('records');
      const index = store.index('table_tenant');
      const request = index.getAll([table, tenantId]);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  }

  /**
   * Get all dirty (unsynced) records.
   */
  static async getDirtyRecords(): Promise<OfflineRecord[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('records', 'readonly');
      const store = transaction.objectStore('records');
      const index = store.index('isDirty');
      const request = index.getAll(1); // IDB treats boolean true as 1

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  }

  /**
   * Mark a record as synced.
   */
  static async markSynced(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('records', 'readwrite');
      const store = transaction.objectStore('records');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const record = getRequest.result as OfflineRecord;
        if (record) {
          record.isDirty = false;
          record.lastSynced = new Date().toISOString();
          store.put(record);
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
    });
  }

  /**
   * Delete a record.
   */
  static async deleteRecord(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('records', 'readwrite');
      const store = transaction.objectStore('records');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  }

  /**
   * Clear all records for a table and tenant.
   */
  static async clearTable(table: string, tenantId: string): Promise<void> {
    const records = await this.getRecordsByTable(table, tenantId);
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('records', 'readwrite');
      const store = transaction.objectStore('records');

      for (const record of records) {
        store.delete(record.id);
      }

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get record count for a table and tenant.
   */
  static async getRecordCount(table: string, tenantId: string): Promise<number> {
    const records = await this.getRecordsByTable(table, tenantId);
    return records.length;
  }

  /**
   * Bulk put records.
   */
  static async putRecords(records: OfflineRecord[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('records', 'readwrite');
      const store = transaction.objectStore('records');

      for (const record of records) {
        store.put(record);
      }

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }
}
