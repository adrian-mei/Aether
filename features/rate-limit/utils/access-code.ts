import { Env } from '@/shared/config/env';

// Default hash - fallback if env var is missing
const DEFAULT_ACCESS_CODE_HASH = 'fa1baeb8e6f5c28f26997f63cc08bf08ff2632a58a578b8b971dd24d5c7d7863';

export const getAccessCodeHash = () => {
  return Env.NEXT_PUBLIC_ACCESS_CODE_HASH || DEFAULT_ACCESS_CODE_HASH;
};

/**
 * Verifies if the provided code matches the stored hash.
 * Uses SHA-256 hashing.
 */
export async function verifyAccessCode(code: string): Promise<boolean> {
  try {
    const msgBuffer = new TextEncoder().encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex === getAccessCodeHash();
  } catch (e) {
    console.error('Hash error', e);
    return false;
  }
}
