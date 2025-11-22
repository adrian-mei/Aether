import { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@/shared/lib/logger';

export const useWakeLock = () => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [isActive, setIsActive] = useState(false);

  const requestWakeLock = useCallback(async () => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        wakeLockRef.current = sentinel;
        setIsActive(true);
        logger.debug('WAKE_LOCK', 'Screen Wake Lock active');

        sentinel.addEventListener('release', () => {
          setIsActive(false);
          logger.debug('WAKE_LOCK', 'Screen Wake Lock released');
        });
      } catch (err) {
        logger.error('WAKE_LOCK', 'Failed to request Wake Lock', err);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
      } catch (err) {
        logger.error('WAKE_LOCK', 'Failed to release Wake Lock', err);
      }
    }
  }, []);

  // Re-request lock if visibility changes (e.g., tab switch)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current && isActive) {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, requestWakeLock]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return {
    isWakeLockActive: isActive,
    requestWakeLock,
    releaseWakeLock
  };
};
