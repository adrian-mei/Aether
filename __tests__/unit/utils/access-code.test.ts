import { verifyAccessCode } from '@/features/rate-limit/utils/access-code';

// Mock Crypto API for Node.js environment (Jest runs in Node)
// Jest 29+ with jsdom might have crypto, but subtle might need polyfill or mock if not present
// Let's check if we need to mock it. Node 19+ has global crypto.
// If running in older node or jsdom without full crypto support, we mock it.

const mockDigest = jest.fn();

Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: mockDigest,
    },
  },
  writable: true,
});

// Helper to mock SHA-256 hash
const mockSha256 = (input: string, outputHex: string) => {
  // Simple mock that returns a buffer corresponding to the hex
  // We ignore input matching for simplicity in this mock setup, 
  // assuming the test calls it with specific values.
  // Real implementation uses TextEncoder, so we just return the buffer.
  const buffer = new Uint8Array(outputHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  mockDigest.mockResolvedValue(buffer.buffer);
};

describe('verifyAccessCode', () => {
  beforeEach(() => {
    mockDigest.mockReset();
  });

  it('should return true for the correct code', async () => {
    const CORRECT_HASH = 'fa1baeb8e6f5c28f26997f63cc08bf08ff2632a58a578b8b971dd24d5c7d7863';
    mockSha256('lovelove', CORRECT_HASH);

    const result = await verifyAccessCode('lovelove');
    expect(result).toBe(true);
    expect(mockDigest).toHaveBeenCalledWith('SHA-256', expect.anything());
  });

  it('should return false for an incorrect code', async () => {
    const WRONG_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
    mockSha256('wrong', WRONG_HASH);

    const result = await verifyAccessCode('wrong');
    expect(result).toBe(false);
  });

  it('should return false if hashing fails', async () => {
    mockDigest.mockRejectedValue(new Error('Crypto error'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const result = await verifyAccessCode('any');
    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});
