import { memoryService } from '@/features/memory/services/memory-service';
import { embeddingService } from '@/features/memory/services/embedding-service';
import { indexedDBService } from '@/features/memory/services/indexeddb-service';
import { extractMemorableFacts } from '@/features/memory/utils/memory-extractor';

// Mock dependencies
jest.mock('@/features/memory/services/embedding-service', () => ({
  embeddingService: {
    initialize: jest.fn(),
    generateEmbedding: jest.fn(),
    getIsReady: jest.fn(),
  },
}));

jest.mock('@/features/memory/services/indexeddb-service', () => ({
  indexedDBService: {
    addMemory: jest.fn(),
    getAllMemories: jest.fn(),
    getCount: jest.fn(),
    pruneOldMemories: jest.fn(),
  },
}));

jest.mock('@/features/memory/utils/memory-extractor', () => ({
  extractMemorableFacts: jest.fn(),
}));

// Mock logger to silence output during tests
jest.mock('@/shared/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('MemoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize embedding service', async () => {
      (embeddingService.initialize as jest.Mock).mockResolvedValue(undefined);
      (indexedDBService.pruneOldMemories as jest.Mock).mockResolvedValue(0);

      await memoryService.initialize();

      expect(embeddingService.initialize).toHaveBeenCalled();
    });
  });

  describe('extractAndStore', () => {
    it('should extract facts and store them', async () => {
      const turn = {
        userMessage: 'My name is Adrian',
        assistantMessage: 'Nice to meet you, Adrian.',
        timestamp: Date.now(),
        interactionCount: 1,
      };

      // Mock extractor to return a fact
      (extractMemorableFacts as jest.Mock).mockReturnValue(['User name is Adrian']);

      const mockEmbedding = new Float32Array([0.1, 0.2, 0.3]);
      (embeddingService.generateEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
      (indexedDBService.addMemory as jest.Mock).mockResolvedValue(undefined);
      (indexedDBService.getCount as jest.Mock).mockResolvedValue(10);

      await memoryService.extractAndStore(turn);

      expect(extractMemorableFacts).toHaveBeenCalledWith(turn);
      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith('User name is Adrian');
      expect(indexedDBService.addMemory).toHaveBeenCalled();
    });

    it('should handle extraction failure gracefully', async () => {
      const turn = {
        userMessage: 'Nothing',
        assistantMessage: 'Okay.',
        timestamp: Date.now(),
        interactionCount: 1,
      };

      (extractMemorableFacts as jest.Mock).mockReturnValue(['Fact']);
      // Mock generation failure
      (embeddingService.generateEmbedding as jest.Mock).mockRejectedValue(new Error('Embedding failed'));

      const result = await memoryService.extractAndStore(turn);

      // Should not throw
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('queryRelevant', () => {
    it('should return relevant memories', async () => {
      const query = 'What is my name?';
      const mockEmbedding = new Float32Array([0.1, 0.2, 0.3]);
      
      // Mock existing memories
      const mockMemories = [
        { content: 'User name is Adrian', embedding: new Float32Array([0.1, 0.2, 0.35]), timestamp: Date.now(), interactionCount: 1 },
        { content: 'User likes pizza', embedding: new Float32Array([0.9, 0.8, 0.7]), timestamp: Date.now(), interactionCount: 2 },
      ];

      (embeddingService.generateEmbedding as jest.Mock).mockResolvedValue(mockEmbedding);
      (indexedDBService.getAllMemories as jest.Mock).mockResolvedValue(mockMemories);

      const results = await memoryService.queryRelevant(query);

      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(query);
      expect(indexedDBService.getAllMemories).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);
      // The first result should be the name one (based on similarity, though here we just check containment)
      // Since we didn't mock vector-similarity, it uses the real implementation.
      // Real implementation uses cosine similarity.
      // [0.1, 0.2, 0.3] vs [0.1, 0.2, 0.35] is very close.
      expect(results[0].content).toContain('Adrian');
    });

    it('should return empty array if no memories exist', async () => {
      (embeddingService.generateEmbedding as jest.Mock).mockResolvedValue(new Float32Array([0.1]));
      (indexedDBService.getAllMemories as jest.Mock).mockResolvedValue([]);

      const results = await memoryService.queryRelevant('hello');

      expect(results).toEqual([]);
    });
  });
});
