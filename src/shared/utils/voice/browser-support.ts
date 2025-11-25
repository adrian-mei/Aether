import { logger } from '@/shared/lib/logger';

export function isSecureContext(): boolean {
    return typeof window !== 'undefined' && window.isSecureContext;
}

export function isBrowserSupported(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    // Modern browsers require getUserMedia and AudioContext
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasAudioContext = 'AudioContext' in window || 'webkitAudioContext' in window;
    
    logger.debug('BROWSER_SUPPORT', 'Checking compatibility', { hasGetUserMedia, hasAudioContext });

    if (hasGetUserMedia && hasAudioContext) {
        resolve(true);
    } else {
        logger.error('BROWSER_SUPPORT', 'Missing required APIs', { hasGetUserMedia, hasAudioContext });
        resolve(false);
    }
  });
}
