/**
 * Memory Service
 *
 * High-level orchestration service for the client-side RAG memory system.
 * Coordinates embedding generation, storage, and retrieval.
 */

import { logger } from '@/shared/lib/logger';
import { embeddingService } from './embedding-service';
import { indexedDBService } from './indexeddb-service';
import { diversityRanking } from '../utils/vector-similarity';
import {
  extractMemorableFacts,
} from '../utils/memory-extractor';
import type {
  ConversationTurn,
  Memory,
  ScoredMemory,
  QueryOptions,
  MemoryConfig,
} from '../types/memory.types';

/**
 * Main memory service for managing long-term conversational memory
 */
export class MemoryService {
  private static instance: MemoryService;
  private config: MemoryConfig;
  private isInitialized = false;

  private constructor(config: MemoryConfig = {}) {
    this.config = {
      maxMemories: config.maxMemories ?? 1000,
      maxAgeDays: config.maxAgeDays ?? 30,
      autoPrune: config.autoPrune ?? true,
      modelName: config.modelName ?? 'Xenova/all-MiniLM-L6-v2',
    };
  }

  public static getInstance(config?: MemoryConfig): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService(config);
    }
    return MemoryService.instance;
  }

  /**
   * Initialize the memory service (loads embedding model)
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    logger.info('MEMORY', 'Initializing memory service...');

    try {
      // Initialize embedding service (loads model in worker)
      await embeddingService.initialize();

      // Auto-prune old memories on startup if enabled
      if (this.config.autoPrune) {
        await this.pruneOldMemories();
      }

      this.isInitialized = true;
      logger.info('MEMORY', 'Memory service initialized successfully');
    } catch (error) {
      logger.error('MEMORY', 'Failed to initialize memory service', error);
      throw error;
    }
  }

  /**
   * Extract memorable facts from a conversation turn and store them
   * This should be called after each conversation turn
   */
  public async extractAndStore(turn: ConversationTurn): Promise<number> {
    try {
      // Ensure service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      logger.info('MEMORY', 'Extracting facts from conversation turn...');

      // Extract facts using rule-based extraction
      const facts = extractMemorableFacts(turn);

      if (facts.length === 0) {
        logger.info('MEMORY', 'No memorable facts found in this turn');
        return 0;
      }

      logger.info('MEMORY', `Extracted ${facts.length} facts`, { facts });

      // Store each fact as a separate memory
      let storedCount = 0;
      for (const fact of facts) {
        try {
          // Generate embedding for the fact
          const embedding = await embeddingService.generateEmbedding(fact);

          // Create memory object
          const memory: Omit<Memory, 'id'> = {
            content: fact,
            embedding,
            timestamp: turn.timestamp,
            mood: turn.mood,
            interactionCount: turn.interactionCount ?? 0,
          };

          // Store in IndexedDB
          await indexedDBService.addMemory(memory);
          storedCount++;

          logger.info('MEMORY', `Stored fact: "${fact.substring(0, 50)}..."`);
        } catch (error) {
          logger.error('MEMORY', 'Failed to store fact', { fact, error });
          // Continue with other facts even if one fails
        }
      }

      // Auto-prune if we're over the limit
      if (this.config.autoPrune) {
        const count = await indexedDBService.getCount();
        if (count > this.config.maxMemories!) {
          await this.pruneOldMemories();
        }
      }

      logger.info('MEMORY', `Stored ${storedCount} memories successfully`);
      return storedCount;
    } catch (error) {
      logger.error('MEMORY', 'Extract and store failed', error);
      // Don't throw - memory extraction is optional, shouldn't break conversation
      return 0;
    }
  }

  /**
   * Query relevant memories based on user input
   * Returns the most similar memories for context injection
   */
  public async queryRelevant(
    query: string,
    options: QueryOptions = {}
  ): Promise<ScoredMemory[]> {
    try {
      // Ensure service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      logger.info('MEMORY', `Querying memories for: "${query.substring(0, 30)}..."`);

      // Generate embedding for the query
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // Retrieve all memories from IndexedDB
      const allMemories = await indexedDBService.getAllMemories();

      if (allMemories.length === 0) {
        logger.info('MEMORY', 'No memories stored yet');
        return [];
      }

      logger.info('MEMORY', `Searching through ${allMemories.length} memories`);

      // Use diversity-aware ranking to get diverse, relevant results
      const relevantMemories = diversityRanking(queryEmbedding, allMemories, {
        limit: options.limit ?? 5,
        lambda: 0.7, // 70% relevance, 30% diversity
        minSimilarity: options.minSimilarity ?? 0.3, // Minimum threshold
      });

      logger.info('MEMORY', `Found ${relevantMemories.length} relevant memories`, {
        scores: relevantMemories.map((m) => m.score.toFixed(3)),
      });

      return relevantMemories;
    } catch (error) {
      logger.error('MEMORY', 'Query failed', error);
      // Return empty array on error - memory retrieval is optional
      return [];
    }
  }

  /**
   * Get memory statistics
   */
  public async getStats(): Promise<{
    totalMemories: number;
    oldestMemory: number | null;
    newestMemory: number | null;
  }> {
    const allMemories = await indexedDBService.getAllMemories();

    if (allMemories.length === 0) {
      return {
        totalMemories: 0,
        oldestMemory: null,
        newestMemory: null,
      };
    }

    const timestamps = allMemories.map((m) => m.timestamp);
    return {
      totalMemories: allMemories.length,
      oldestMemory: Math.min(...timestamps),
      newestMemory: Math.max(...timestamps),
    };
  }

  /**
   * Prune old memories based on age and count limits
   */
  public async pruneOldMemories(): Promise<number> {
    try {
      logger.info('MEMORY', 'Pruning old memories...');

      const deletedCount = await indexedDBService.pruneOldMemories(
        this.config.maxAgeDays,
        this.config.maxMemories
      );

      if (deletedCount > 0) {
        logger.info('MEMORY', `Pruned ${deletedCount} old memories`);
      }

      return deletedCount;
    } catch (error) {
      logger.error('MEMORY', 'Pruning failed', error);
      return 0;
    }
  }

  /**
   * Clear all memories from the database
   */
  public async clearAll(): Promise<void> {
    logger.info('MEMORY', 'Clearing all memories...');
    await indexedDBService.clearAll();
    logger.info('MEMORY', 'All memories cleared');
  }

  /**
   * Export all memories as JSON (for backup/portability)
   */
  public async exportMemories(): Promise<string> {
    logger.info('MEMORY', 'Exporting memories...');
    return indexedDBService.exportMemories();
  }

  /**
   * Import memories from JSON (for restore)
   */
  public async importMemories(jsonData: string): Promise<number> {
    logger.info('MEMORY', 'Importing memories...');
    const count = await indexedDBService.importMemories(jsonData);
    logger.info('MEMORY', `Imported ${count} memories`);
    return count;
  }

  /**
   * Manually store a custom memory (useful for testing or manual entries)
   */
  public async storeCustomMemory(content: string, metadata?: {
    mood?: string;
    topic?: string;
    interactionCount?: number;
  }): Promise<void> {
    // Ensure service is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Generate embedding
    const embedding = await embeddingService.generateEmbedding(content);

    // Create memory object
    const memory: Omit<Memory, 'id'> = {
      content,
      embedding,
      timestamp: Date.now(),
      mood: metadata?.mood,
      topic: metadata?.topic,
      interactionCount: metadata?.interactionCount ?? 0,
    };

    // Store in IndexedDB
    await indexedDBService.addMemory(memory);

    logger.info('MEMORY', `Stored custom memory: "${content.substring(0, 50)}..."`);
  }

  /**
   * Check if the service is ready to use
   */
  public getIsReady(): boolean {
    return this.isInitialized && embeddingService.getIsReady();
  }
}

// Export singleton instance with default config
export const memoryService = MemoryService.getInstance();
