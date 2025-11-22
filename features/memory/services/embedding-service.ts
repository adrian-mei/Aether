/**
 * Embedding Service
 *
 * Manages the embedding worker and provides a high-level API for generating
 * vector embeddings from text. Follows the same pattern as KokoroService.
 */

import { logger } from '@/shared/lib/logger';
import type { EmbeddingWorkerMessage, EmbeddingWorkerResponse } from '../types/memory.types';

export class EmbeddingService {
  private static instance: EmbeddingService;
  private worker: Worker | null = null;
  private modelName = 'Xenova/all-MiniLM-L6-v2';
  private isInitializing = false;
  private isReady = false;
  private initializationPromise: Promise<void> | null = null;

  // Promise resolvers for active requests
  private initPromise: {
    resolve: () => void;
    reject: (err: unknown) => void;
  } | null = null;
  private generatePromise: {
    resolve: (result: Float32Array) => void;
    reject: (err: unknown) => void;
  } | null = null;

  private constructor() {}

  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Initialize the embedding worker and load the model
   */
  public async initialize(): Promise<void> {
    if (this.isReady) return Promise.resolve();
    if (this.initializationPromise) return this.initializationPromise;

    this.isInitializing = true;
    logger.info('EMBEDDING', 'Initializing embedding worker...');

    this.initializationPromise = new Promise((resolve, reject) => {
      this.initPromise = { resolve, reject };

      try {
        if (!this.worker) {
          this.worker = new Worker(
            new URL('../workers/embedding.worker.ts', import.meta.url),
            { type: 'module' }
          );

          this.worker.onmessage = this.handleWorkerMessage.bind(this);
          this.worker.onerror = (err) => {
            logger.error('EMBEDDING', 'Worker error', err);
            this.handleError(err.message);
          };
        }

        this.worker.postMessage({ type: 'init', modelName: this.modelName });
      } catch (error: unknown) {
        this.isInitializing = false;
        this.initializationPromise = null;
        logger.error('EMBEDDING', 'Failed to create worker', error);
        reject(error);
      }
    });

    return this.initializationPromise;
  }

  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(event: MessageEvent<EmbeddingWorkerResponse>) {
    if (!event.data) return;
    const { type } = event.data;

    if (type === 'ready') {
      logger.info('EMBEDDING', 'Worker ready, model loaded');
      this.isReady = true;
      this.isInitializing = false;

      if (this.initPromise) {
        this.initPromise.resolve();
        this.initPromise = null;
      }
      this.initializationPromise = null;
    } else if (type === 'embedding') {
      const { data } = event.data as { data: Float32Array };

      if (this.generatePromise) {
        this.generatePromise.resolve(data);
        this.generatePromise = null;
      }
    } else if (type === 'error') {
      const { error } = event.data as { error: string };
      this.handleError(error);
    }
  }

  /**
   * Handle errors from the worker
   */
  private handleError(error: unknown) {
    logger.error('EMBEDDING', 'Worker reported error', error);

    if (this.initPromise) {
      this.initPromise.reject(error);
      this.initPromise = null;
      this.isInitializing = false;
    }

    if (this.generatePromise) {
      this.generatePromise.reject(error);
      this.generatePromise = null;
    }
  }

  /**
   * Generate an embedding for the given text
   */
  public async generateEmbedding(text: string): Promise<Float32Array> {
    try {
      // Ensure worker is initialized
      if (!this.isReady) {
        await this.initialize();
      }

      if (!this.worker) {
        throw new Error('Worker not initialized');
      }

      // Validate input
      if (!text || text.trim().length === 0) {
        throw new Error('Cannot generate embedding for empty text');
      }

      logger.info(
        'EMBEDDING',
        `Requesting embedding for: "${text.substring(0, 30)}..."`
      );

      return new Promise((resolve, reject) => {
        this.generatePromise = { resolve, reject };
        this.worker!.postMessage({
          type: 'generate',
          text,
        } as EmbeddingWorkerMessage);
      });
    } catch (error: unknown) {
      logger.error('EMBEDDING', 'Generate request failed', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  public async generateEmbeddings(texts: string[]): Promise<Float32Array[]> {
    const embeddings: Float32Array[] = [];

    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * Check if the service is ready
   */
  public getIsReady(): boolean {
    return this.isReady;
  }

  /**
   * Shutdown the worker (cleanup)
   */
  public shutdown(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'shutdown' } as EmbeddingWorkerMessage);
      this.worker = null;
      this.isReady = false;
      this.isInitializing = false;
      this.initializationPromise = null;
      logger.info('EMBEDDING', 'Worker shut down');
    }
  }
}

// Export singleton instance
export const embeddingService = EmbeddingService.getInstance();
