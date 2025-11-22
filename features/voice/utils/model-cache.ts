import { logger } from '@/shared/lib/logger';

export type ModelCacheStatus = 'checking' | 'cached' | 'missing' | 'unsupported';

const MODEL_CACHE_NAME = 'aether-models-v1';

/**
 * Checks if the Kokoro model files are present in the browser cache.
 * Returns 'cached' if significant model files are found, 'missing' otherwise.
 */
export async function checkModelCache(): Promise<ModelCacheStatus> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return 'unsupported';
  }

  try {
    // Check all caches since Kokoro/Transformers.js might use its own cache name
    const cacheKeys = await caches.keys();
    logger.info('CACHE', 'Checking available caches', { caches: cacheKeys });

    for (const key of cacheKeys) {
        const cache = await caches.open(key);
        const requests = await cache.keys();
        
        // Check for ONNX files in this cache
        const hasWeights = requests.some(req => req.url.includes('.onnx'));
        
        if (hasWeights) {
            logger.info('CACHE', 'Found model weights in cache', { cacheName: key });
            return 'cached';
        }
    }

    logger.info('CACHE', 'No model weights found in any cache');
    return 'missing';
  } catch (error) {
    logger.error('CACHE', 'Failed to check model cache', error);
    return 'missing'; // Default to assuming we need to download
  }
}
