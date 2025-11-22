import { verifyAccessCode } from '@/features/rate-limit/utils/access-code';

// Mock Crypto API
const mockDigest = jest.fn();

Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: mockDigest,
    },
  },
  writable: true,
});

describe('verifyAccessCode', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    mockDigest.mockReset();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return true for the correct code configured in env', async () => {
    const DUMMY_SECRET = 'dummy-secret';
    // Use a dummy hash for testing (this matches what we'll tell the mock to produce for the secret)
    const DUMMY_HASH = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    
    process.env.NEXT_PUBLIC_ACCESS_CODE_HASH = DUMMY_HASH;

    // Mock digest to return the DUMMY_HASH bytes when called
    // We convert the hex string back to bytes to simulate what crypto.subtle.digest returns
    const buffer = new Uint8Array(DUMMY_HASH.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    mockDigest.mockResolvedValue(buffer.buffer);

    const result = await verifyAccessCode(DUMMY_SECRET);
    expect(result).toBe(true);
    expect(mockDigest).toHaveBeenCalledWith('SHA-256', expect.anything());
  });

  it('should return false for an incorrect code', async () => {
    const DUMMY_HASH = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    process.env.NEXT_PUBLIC_ACCESS_CODE_HASH = DUMMY_HASH;

    // Mock digest to return a DIFFERENT hash (e.g. for 'wrong-code')
    const WRONG_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
    const buffer = new Uint8Array(WRONG_HASH.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    mockDigest.mockResolvedValue(buffer.buffer);

    const result = await verifyAccessCode('wrong-code');
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
