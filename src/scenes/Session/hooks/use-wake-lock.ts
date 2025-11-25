import { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@/shared/lib/logger';

export const useWakeLock = () => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [shouldBeActive, setShouldBeActive] = useState(false);

  const requestWakeLock = useCallback(async () => {
    setShouldBeActive(true);
    
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      // Don't request if hidden (it will fail), wait for visibility change
      if (document.visibilityState !== 'visible') {
          logger.debug('WAKE_LOCK', 'Page hidden, deferring wake lock request');
          return;
      }

      try {
        const sentinel = await navigator.wakeLock.request('screen');
        wakeLockRef.current = sentinel;
        setIsActive(true);
        logger.debug('WAKE_LOCK', 'Screen Wake Lock active');

        sentinel.addEventListener('release', () => {
          setIsActive(false);
          logger.debug('WAKE_LOCK', 'Screen Wake Lock released');
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'NotAllowedError') {
            logger.warn('WAKE_LOCK', 'Wake Lock denied (possibly due to visibility/focus)');
        } else {
            logger.error('WAKE_LOCK', 'Failed to request Wake Lock', err);
        }
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    setShouldBeActive(false);
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
      if (document.visibilityState === 'visible' && !wakeLockRef.current && shouldBeActive) {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [shouldBeActive, requestWakeLock]);

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
