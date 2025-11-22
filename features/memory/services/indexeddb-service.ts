/**
 * IndexedDB Storage Service
 *
 * Handles persistent storage of memory chunks with vector embeddings.
 * Uses the idb library for improved developer experience and Promise-based API.
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { Memory } from '../types/memory.types';

const DB_NAME = 'aether_memory';
const STORE_NAME = 'memories';
const DB_VERSION = 1;

/**
 * Service for managing IndexedDB operations for long-term memory storage
 */
class IndexedDBService {
  private db: IDBPDatabase | null = null;
  private initPromise: Promise<IDBPDatabase> | null = null;

  /**
   * Initialize the database connection (lazy initialization)
   */
  private async init(): Promise<IDBPDatabase> {
    if (this.db) return this.db;

    // Prevent multiple simultaneous initialization attempts
    if (this.initPromise) return this.initPromise;

    this.initPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create the memories object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });

          // Create indexes for efficient querying
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('mood', 'mood', { unique: false });
          store.createIndex('topic', 'topic', { unique: false });
        }
      },
    });

    this.db = await this.initPromise;
    return this.db;
  }

  /**
   * Store a new memory in IndexedDB
   */
  async addMemory(memory: Omit<Memory, 'id'>): Promise<number> {
    const db = await this.init();
    const id = await db.add(STORE_NAME, memory);
    return id as number;
  }

  /**
   * Retrieve all memories from the database
   */
  async getAllMemories(): Promise<Memory[]> {
    const db = await this.init();
    const memories = await db.getAll(STORE_NAME);
    return memories;
  }

  /**
   * Get a specific memory by ID
   */
  async getMemory(id: number): Promise<Memory | undefined> {
    const db = await this.init();
    return db.get(STORE_NAME, id);
  }

  /**
   * Delete a memory by ID
   */
  async deleteMemory(id: number): Promise<void> {
    const db = await this.init();
    await db.delete(STORE_NAME, id);
  }

  /**
   * Clear all memories from the database
   */
  async clearAll(): Promise<void> {
    const db = await this.init();
    await db.clear(STORE_NAME);
  }

  /**
   * Get the total number of stored memories
   */
  async getCount(): Promise<number> {
    const db = await this.init();
    return db.count(STORE_NAME);
  }

  /**
   * Get memories within a specific time range
   */
  async getMemoriesByTimeRange(
    startTimestamp: number,
    endTimestamp: number
  ): Promise<Memory[]> {
    const db = await this.init();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.store.index('timestamp');
    const range = IDBKeyRange.bound(startTimestamp, endTimestamp);
    return index.getAll(range);
  }

  /**
   * Prune old memories based on age or count limit
   */
  async pruneOldMemories(maxAgeDays: number = 30, maxCount: number = 1000): Promise<number> {
    const db = await this.init();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.store;
    const index = store.index('timestamp');

    // Get all memories sorted by timestamp (oldest first)
    const allMemories = await index.getAll();

    if (allMemories.length === 0) return 0;

    const now = Date.now();
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    // Delete memories older than maxAgeDays
    for (const memory of allMemories) {
      if (now - memory.timestamp > maxAge && memory.id !== undefined) {
        await store.delete(memory.id);
        deletedCount++;
      }
    }

    // If still over maxCount, delete oldest memories
    const remainingCount = allMemories.length - deletedCount;
    if (remainingCount > maxCount) {
      const toDelete = remainingCount - maxCount;
      const sortedByAge = allMemories
        .filter((m) => now - m.timestamp <= maxAge)
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, toDelete);

      for (const memory of sortedByAge) {
        if (memory.id !== undefined) {
          await store.delete(memory.id);
          deletedCount++;
        }
      }
    }

    await tx.done;
    return deletedCount;
  }

  /**
   * Export all memories as JSON (for backup/portability)
   */
  async exportMemories(): Promise<string> {
    const memories = await this.getAllMemories();
    // Convert Float32Array to regular arrays for JSON serialization
    const serializable = memories.map((m) => ({
      ...m,
      embedding: Array.from(m.embedding),
    }));
    return JSON.stringify(serializable, null, 2);
  }

  /**
   * Import memories from JSON (for restore)
   */
  async importMemories(jsonData: string): Promise<number> {
    const data = JSON.parse(jsonData);
    const db = await this.init();
    const tx = db.transaction(STORE_NAME, 'readwrite');

    let count = 0;
    for (const item of data) {
      // Convert array back to Float32Array
      const memory: Omit<Memory, 'id'> = {
        ...item,
        embedding: new Float32Array(item.embedding),
      };
      await tx.store.add(memory);
      count++;
    }

    await tx.done;
    return count;
  }
}

// Export singleton instance
export const indexedDBService = new IndexedDBService();
