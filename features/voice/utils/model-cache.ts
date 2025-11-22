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
    const hasCache = await caches.has(MODEL_CACHE_NAME);
    if (!hasCache) {
      logger.info('CACHE', 'Model cache does not exist yet');
      return 'missing';
    }

    const cache = await caches.open(MODEL_CACHE_NAME);
    const keys = await cache.keys();
    
    // Check for ONNX files (the heavy weights)
    // The Kokoro model downloads multiple files (config.json, model.onnx, etc.)
    // Finding at least one .onnx file is a strong indicator that the model was downloaded.
    const hasModelWeights = keys.some(request => request.url.includes('.onnx'));
    
    logger.info('CACHE', 'Cache check result', { 
        fileCount: keys.length, 
        hasModelWeights 
    });

    return hasModelWeights ? 'cached' : 'missing';
  } catch (error) {
    logger.error('CACHE', 'Failed to check model cache', error);
    return 'missing'; // Default to assuming we need to download
  }
}
