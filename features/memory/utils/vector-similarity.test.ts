import { 
  cosineSimilarity, 
  averageEmbedding, 
  normalizeVector,
  findTopSimilar 
} from '@/features/memory/utils/vector-similarity';
import { Memory } from '@/features/memory/types/memory.types';

describe('Vector Similarity Algorithms', () => {
  
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vecA = new Float32Array([1, 0, 0]);
      const vecB = new Float32Array([1, 0, 0]);
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vecA = new Float32Array([1, 0, 0]);
      const vecB = new Float32Array([0, 1, 0]);
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(0);
    });

    it('should return -1 for opposite vectors', () => {
      const vecA = new Float32Array([1, 0]);
      const vecB = new Float32Array([-1, 0]);
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(-1);
    });

    it('should handle varying magnitudes correctly', () => {
      const vecA = new Float32Array([1, 2, 3]);
      const vecB = new Float32Array([2, 4, 6]); // Same direction, double magnitude
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1);
    });

    it('should throw error for mismatched dimensions', () => {
      const vecA = new Float32Array([1, 2]);
      const vecB = new Float32Array([1, 2, 3]);
      expect(() => cosineSimilarity(vecA, vecB)).toThrow();
    });
    
    it('should return 0 for zero vectors to avoid NaN', () => {
        const vecA = new Float32Array([0, 0]);
        const vecB = new Float32Array([1, 1]);
        expect(cosineSimilarity(vecA, vecB)).toBe(0);
    });
  });

  describe('averageEmbedding', () => {
    it('should calculate the average correctly', () => {
      const embeddings = [
        new Float32Array([1, 2]),
        new Float32Array([3, 4])
      ];
      const result = averageEmbedding(embeddings);
      expect(result[0]).toBe(2); // (1+3)/2
      expect(result[1]).toBe(3); // (2+4)/2
    });

    it('should throw for empty input', () => {
      expect(() => averageEmbedding([])).toThrow();
    });
  });

  describe('normalizeVector', () => {
    it('should normalize vector to unit length', () => {
      const vec = new Float32Array([3, 4]); // Magnitude 5
      const normalized = normalizeVector(vec);
      
      expect(normalized[0]).toBeCloseTo(3/5); // 0.6
      expect(normalized[1]).toBeCloseTo(4/5); // 0.8
      
      // Check L2 norm is 1
      const norm = Math.sqrt(normalized[0]**2 + normalized[1]**2);
      expect(norm).toBeCloseTo(1);
    });

    it('should handle zero vector gracefully', () => {
      const vec = new Float32Array([0, 0]);
      const normalized = normalizeVector(vec);
      expect(normalized[0]).toBe(0);
      expect(normalized[1]).toBe(0);
    });
  });

  describe('findTopSimilar', () => {
      const baseMemory: Memory = {
          id: 1,
          content: 'test',
          embedding: new Float32Array([1, 0]),
          timestamp: 0,
          interactionCount: 0
      };

      const memories: Memory[] = [
          { ...baseMemory, id: 10, embedding: new Float32Array([1, 0]) }, // Sim 1.0
          { ...baseMemory, id: 20, embedding: new Float32Array([0, 1]) }, // Sim 0.0
          { ...baseMemory, id: 30, embedding: new Float32Array([0.707, 0.707]) }, // Sim ~0.7
      ];

      it('should rank memories by similarity', () => {
          const query = new Float32Array([1, 0]);
          const results = findTopSimilar(query, memories);
          
          expect(results[0].id).toBe(10);
          expect(results[1].id).toBe(30);
          expect(results[2].id).toBe(20);
      });

      it('should filter by minSimilarity', () => {
        const query = new Float32Array([1, 0]);
        const results = findTopSimilar(query, memories, { minSimilarity: 0.8 });
        
        expect(results.length).toBe(1);
        expect(results[0].id).toBe(10);
      });
  });

});
