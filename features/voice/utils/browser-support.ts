import { logger } from '@/shared/lib/logger';

export function isSecureContext(): boolean {
    return typeof window !== 'undefined' && window.isSecureContext;
}

function checkApis(): { hasGetUserMedia: boolean; hasSpeechRecognition: boolean } {
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasSpeechRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    return { hasGetUserMedia, hasSpeechRecognition };
}

export function isBrowserSupported(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    const MAX_CHECKS = 5;
    let checkCount = 0;

    const intervalId = setInterval(() => {
      checkCount++;
      const { hasGetUserMedia, hasSpeechRecognition } = checkApis();
      
      logger.debug('BROWSER_SUPPORT', `Check #${checkCount}`, { hasGetUserMedia, hasSpeechRecognition });

      if (hasGetUserMedia && hasSpeechRecognition) {
        clearInterval(intervalId);
        resolve(true);
      } else if (checkCount >= MAX_CHECKS) {
        clearInterval(intervalId);
        logger.error('BROWSER_SUPPORT', 'API checks failed after multiple attempts.', { hasGetUserMedia, hasSpeechRecognition });
        resolve(false);
      }
    }, 500);
  });
}
