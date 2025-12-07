/**
 * Offline Queue using IndexedDB
 * Replaces localStorage with a more robust IndexedDB solution
 * for queuing writes while offline and syncing when reconnected
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface QueueEntry {
  id: string;
  timestamp: number;
  type: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  retryCount: number;
}

interface OfflineDB extends DBSchema {
  queue: {
    key: string;
    value: QueueEntry;
    indexes: { 'by-timestamp': number };
  };
}

const DB_NAME = 'stop-tracker-offline';
const DB_VERSION = 1;
const QUEUE_STORE = 'queue';

let dbInstance: IDBPDatabase<OfflineDB> | null = null;

/**
 * Initialize the IndexedDB database
 */
async function initDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create queue store if it doesn't exist
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
        store.createIndex('by-timestamp', 'timestamp');
      }
    },
  });

  return dbInstance;
}

/**
 * Add an entry to the offline queue
 */
export async function enqueue(
  type: 'create' | 'update' | 'delete',
  collection: string,
  data: any
): Promise<void> {
  const db = await initDB();

  const entry: QueueEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    type,
    collection,
    data,
    retryCount: 0,
  };

  await db.add(QUEUE_STORE, entry);
}

/**
 * Get all queued entries, sorted by timestamp
 */
export async function getQueue(): Promise<QueueEntry[]> {
  const db = await initDB();
  const tx = db.transaction(QUEUE_STORE, 'readonly');
  const index = tx.store.index('by-timestamp');
  return await index.getAll();
}

/**
 * Remove an entry from the queue by ID
 */
export async function dequeue(id: string): Promise<void> {
  const db = await initDB();
  await db.delete(QUEUE_STORE, id);
}

/**
 * Clear all entries from the queue
 */
export async function clearQueue(): Promise<void> {
  const db = await initDB();
  await db.clear(QUEUE_STORE);
}

/**
 * Get the count of pending entries
 */
export async function getQueueCount(): Promise<number> {
  const db = await initDB();
  return await db.count(QUEUE_STORE);
}

/**
 * Increment retry count for an entry
 */
export async function incrementRetry(id: string): Promise<void> {
  const db = await initDB();
  const entry = await db.get(QUEUE_STORE, id);

  if (entry) {
    entry.retryCount += 1;
    await db.put(QUEUE_STORE, entry);
  }
}

/**
 * Sync function type for processing queue entries
 */
export type SyncFunction = (entry: QueueEntry) => Promise<void>;

/**
 * Process the offline queue with a sync function
 * Automatically handles retries and error cases
 */
export async function syncQueue(
  syncFn: SyncFunction,
  maxRetries: number = 3
): Promise<{ success: number; failed: number; errors: any[] }> {
  const queue = await getQueue();
  let successCount = 0;
  let failedCount = 0;
  const errors: any[] = [];

  for (const entry of queue) {
    try {
      // Skip entries that have exceeded max retries
      if (entry.retryCount >= maxRetries) {
        console.warn(`Entry ${entry.id} exceeded max retries, skipping`);
        failedCount++;
        await dequeue(entry.id);
        continue;
      }

      // Attempt to sync the entry
      await syncFn(entry);

      // Success! Remove from queue
      await dequeue(entry.id);
      successCount++;
    } catch (error) {
      console.error(`Failed to sync entry ${entry.id}:`, error);

      // Increment retry count
      await incrementRetry(entry.id);
      failedCount++;
      errors.push({ entryId: entry.id, error });

      // If exceeded retries, remove from queue
      if (entry.retryCount + 1 >= maxRetries) {
        await dequeue(entry.id);
      }
    }
  }

  return { success: successCount, failed: failedCount, errors };
}

/**
 * Check if there are pending items in the queue
 */
export async function hasPendingItems(): Promise<boolean> {
  const count = await getQueueCount();
  return count > 0;
}

export default {
  enqueue,
  dequeue,
  getQueue,
  clearQueue,
  getQueueCount,
  syncQueue,
  hasPendingItems,
};
