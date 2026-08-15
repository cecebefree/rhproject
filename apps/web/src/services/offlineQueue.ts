/**
 * OfflineQueueManager — Queues mutations when offline and replays when online.
 * Uses IndexedDB for persistence across page reloads.
 */

export type HttpMethod = 'INSERT' | 'UPDATE' | 'DELETE';

export interface OfflineMutation {
  id: string;
  table: string;
  method: HttpMethod;
  recordId: string;
  data: Record<string, unknown>;
  previousData: Record<string, unknown> | null;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

const DB_NAME = 'redhouse_offline';
const DB_VERSION = 1;
const STORE_NAME = 'mutations';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('table', 'table', { unique: false });
      }
    };
  });
}

export class OfflineQueueManager {
  private isOnline = navigator.onLine;
  private processing = false;
  private processCallback: ((mutation: OfflineMutation) => Promise<boolean>) | null = null;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processPending();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Set the callback function to process mutations.
   */
  setProcessCallback(callback: (mutation: OfflineMutation) => Promise<boolean>): void {
    this.processCallback = callback;
  }

  /**
   * Add a mutation to the offline queue.
   */
  async addMutation(
    table: string,
    method: HttpMethod,
    recordId: string,
    data: Record<string, unknown>,
    previousData: Record<string, unknown> | null = null
  ): Promise<string> {
    const mutation: OfflineMutation = {
      id: `${table}-${recordId}-${Date.now()}`,
      table,
      method,
      recordId,
      data,
      previousData,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3,
      status: 'pending',
    };

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(mutation);

      request.onsuccess = () => resolve(mutation.id);
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  }

  /**
   * Get all pending mutations.
   */
  async getPendingMutations(): Promise<OfflineMutation[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  }

  /**
   * Update mutation status.
   */
  async updateMutationStatus(
    mutationId: string,
    status: OfflineMutation['status'],
    error?: string
  ): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(mutationId);

      getRequest.onsuccess = () => {
        const mutation = getRequest.result as OfflineMutation;
        if (mutation) {
          mutation.status = status;
          if (error) mutation.error = error;
          if (status === 'failed') mutation.retryCount++;
          store.put(mutation);
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
   * Remove a mutation from the queue.
   */
  async removeMutation(mutationId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(mutationId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  }

  /**
   * Clear all mutations from the queue.
   */
  async clearQueue(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  }

  /**
   * Process all pending mutations when online.
   */
  async processPending(): Promise<void> {
    if (!this.isOnline || this.processing || !this.processCallback) return;

    this.processing = true;

    try {
      const pending = await this.getPendingMutations();

      for (const mutation of pending) {
        if (mutation.retryCount >= mutation.maxRetries) {
          await this.updateMutationStatus(mutation.id, 'failed', 'Max retries exceeded');
          continue;
        }

        await this.updateMutationStatus(mutation.id, 'processing');

        try {
          const success = await this.processCallback(mutation);
          if (success) {
            await this.removeMutation(mutation.id);
          } else {
            await this.updateMutationStatus(mutation.id, 'failed', 'Processing failed');
          }
        } catch (error) {
          await this.updateMutationStatus(
            mutation.id,
            'failed',
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Get queue status.
   */
  async getQueueStatus(): Promise<{
    total: number;
    pending: number;
    processing: number;
    failed: number;
  }> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const mutations = request.result as OfflineMutation[];
        resolve({
          total: mutations.length,
          pending: mutations.filter(m => m.status === 'pending').length,
          processing: mutations.filter(m => m.status === 'processing').length,
          failed: mutations.filter(m => m.status === 'failed').length,
        });
      };

      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  }
}
