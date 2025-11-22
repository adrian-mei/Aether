/**
 * Vector Similarity Utilities
 *
 * Provides functions for calculating similarity between vector embeddings
 * and retrieving the most similar memories from a collection.
 */

import type { Memory, ScoredMemory, QueryOptions } from '../types/memory.types';

/**
 * Calculate the cosine similarity between two vectors
 * Returns a value between 0 (completely dissimilar) and 1 (identical)
 *
 * Formula: similarity = (A · B) / (||A|| × ||B||)
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(
      `Vector dimensions do not match: ${a.length} vs ${b.length}`
    );
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  // Avoid division by zero
  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find the top K most similar memories to the query embedding
 */
export function findTopSimilar(
  queryEmbedding: Float32Array,
  memories: Memory[],
  options: QueryOptions = {}
): ScoredMemory[] {
  const { limit = 5, minSimilarity = 0.0, mood, topic } = options;

  // Calculate similarity scores for all memories
  const scoredMemories: ScoredMemory[] = memories
    .map((memory) => ({
      ...memory,
      score: cosineSimilarity(queryEmbedding, memory.embedding),
    }))
    .filter((memory) => {
      // Apply filters
      if (memory.score < minSimilarity) return false;
      if (mood && memory.mood !== mood) return false;
      if (topic && memory.topic !== topic) return false;
      return true;
    });

  // Sort by similarity score (descending) and take top K
  scoredMemories.sort((a, b) => b.score - a.score);

  return scoredMemories.slice(0, limit);
}

/**
 * Calculate the average embedding from a collection of embeddings
 * Useful for combining multiple memories or creating aggregate representations
 */
export function averageEmbedding(embeddings: Float32Array[]): Float32Array {
  if (embeddings.length === 0) {
    throw new Error('Cannot calculate average of empty embeddings array');
  }

  const dimension = embeddings[0].length;
  const sum = new Float32Array(dimension);

  for (const embedding of embeddings) {
    if (embedding.length !== dimension) {
      throw new Error('All embeddings must have the same dimension');
    }

    for (let i = 0; i < dimension; i++) {
      sum[i] += embedding[i];
    }
  }

  // Normalize by count
  for (let i = 0; i < dimension; i++) {
    sum[i] /= embeddings.length;
  }

  return sum;
}

/**
 * Normalize a vector to unit length (L2 normalization)
 */
export function normalizeVector(vector: Float32Array): Float32Array {
  let norm = 0;

  for (let i = 0; i < vector.length; i++) {
    norm += vector[i] * vector[i];
  }

  norm = Math.sqrt(norm);

  // Avoid division by zero
  if (norm === 0) {
    return vector;
  }

  const normalized = new Float32Array(vector.length);
  for (let i = 0; i < vector.length; i++) {
    normalized[i] = vector[i] / norm;
  }

  return normalized;
}

/**
 * Calculate diversity-aware ranking
 * Penalizes memories that are too similar to already selected ones
 * Implements Maximal Marginal Relevance (MMR) algorithm
 */
export function diversityRanking(
  queryEmbedding: Float32Array,
  memories: Memory[],
  options: {
    limit?: number;
    lambda?: number; // Balance between relevance and diversity (0-1)
    minSimilarity?: number;
  } = {}
): ScoredMemory[] {
  const { limit = 5, lambda = 0.7, minSimilarity = 0.0 } = options;

  if (memories.length === 0) return [];

  // Calculate initial similarity scores
  const candidates = memories
    .map((memory) => ({
      ...memory,
      score: cosineSimilarity(queryEmbedding, memory.embedding),
    }))
    .filter((m) => m.score >= minSimilarity);

  const selected: ScoredMemory[] = [];
  const remaining = [...candidates];

  while (selected.length < limit && remaining.length > 0) {
    let bestScore = -Infinity;
    let bestIndex = -1;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];

      // Calculate relevance to query
      const relevance = candidate.score;

      // Calculate maximum similarity to already selected memories
      let maxSimilarity = 0;
      for (const selectedMemory of selected) {
        const similarity = cosineSimilarity(
          candidate.embedding,
          selectedMemory.embedding
        );
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }

      // MMR score: balance relevance and diversity
      const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;

      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIndex = i;
      }
    }

    if (bestIndex >= 0) {
      selected.push(remaining[bestIndex]);
      remaining.splice(bestIndex, 1);
    } else {
      break;
    }
  }

  return selected;
}
