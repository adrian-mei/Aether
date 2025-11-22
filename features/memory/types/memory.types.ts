/**
 * Memory System Type Definitions
 *
 * Defines the data structures for the client-side RAG memory system.
 */

/**
 * A stored memory chunk in IndexedDB
 */
export interface Memory {
  /** Auto-incremented unique identifier */
  id?: number;

  /** The text content of the memory (fact or summary) */
  content: string;

  /** Vector embedding for similarity search (384 dimensions for all-MiniLM-L6-v2) */
  embedding: Float32Array;

  /** Timestamp when the memory was created */
  timestamp: number;

  /** User's mood at the time of the conversation (optional) */
  mood?: string;

  /** Detected topic or category (optional) */
  topic?: string;

  /** Interaction count when this memory was created */
  interactionCount: number;
}

/**
 * A conversation turn used for memory extraction
 */
export interface ConversationTurn {
  /** The user's message */
  userMessage: string;

  /** The assistant's response */
  assistantMessage: string;

  /** Timestamp of the conversation */
  timestamp: number;

  /** User's mood (optional) */
  mood?: string;

  /** Current interaction count */
  interactionCount?: number;
}

/**
 * Query options for retrieving relevant memories
 */
export interface QueryOptions {
  /** Maximum number of memories to retrieve */
  limit?: number;

  /** Minimum similarity threshold (0-1) */
  minSimilarity?: number;

  /** Filter by mood (optional) */
  mood?: string;

  /** Filter by topic (optional) */
  topic?: string;
}

/**
 * A retrieved memory with similarity score
 */
export interface ScoredMemory extends Memory {
  /** Cosine similarity score (0-1, higher is more similar) */
  score: number;
}

/**
 * Worker message types for embedding generation
 */
export type EmbeddingWorkerMessage =
  | { type: 'init' }
  | { type: 'generate'; text: string }
  | { type: 'shutdown' };

/**
 * Worker response types
 */
export type EmbeddingWorkerResponse =
  | { type: 'ready' }
  | { type: 'embedding'; data: Float32Array }
  | { type: 'log'; level: 'info' | 'warn' | 'error' | 'debug'; message: string }
  | { type: 'error'; error: string };

/**
 * Memory service configuration
 */
export interface MemoryConfig {
  /** Maximum number of memories to store */
  maxMemories?: number;

  /** Maximum age of memories in days */
  maxAgeDays?: number;

  /** Enable automatic pruning of old memories */
  autoPrune?: boolean;

  /** Embedding model name */
  modelName?: string;
}
