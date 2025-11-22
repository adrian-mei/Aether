import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/shared/lib/logger';
import type { ModelCacheStatus } from '@/features/voice/utils/model-cache';

export function useSystemCheck() {
  const [modelCacheStatus, setModelCacheStatus] = useState<ModelCacheStatus>('checking');
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize Worker
    try {
      workerRef.current = new Worker(
        new URL('../workers/system-check.worker.ts', import.meta.url), 
        { type: 'module' }
      );

      workerRef.current.onmessage = (event) => {
        const { type } = event.data;

        if (type === 'log') {
          const { level, category, message, data } = event.data;
          logger.log(level, category, message, data);
        } else if (type === 'status') {
          const { check, status } = event.data;
          if (check === 'model-cache') {
            setModelCacheStatus(status);
          }
        }
      };

      logger.info('SYSTEM', 'System check worker initialized');
    } catch (e) {
      logger.error('SYSTEM', 'Failed to initialize system check worker', e);
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const checkCache = useCallback(() => {
    if (workerRef.current) {
      setModelCacheStatus('checking');
      workerRef.current.postMessage({ type: 'check-cache' });
    } else {
        logger.warn('SYSTEM', 'Worker not ready for cache check');
    }
  }, []);

  return {
    modelCacheStatus,
    checkCache
  };
}
