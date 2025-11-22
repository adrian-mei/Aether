import { useState, useEffect, useRef } from 'react';
import { logger } from '@/shared/lib/logger';
import { kokoroService } from '@/features/voice/services/kokoro-service';
import { memoryService } from '@/features/memory/services/memory-service';
import { audioPlayer } from '@/features/voice/utils/audio-player';
import { checkModelCache, ModelCacheStatus } from '@/features/voice/utils/model-cache';
import { requestMicrophonePermission, PermissionStatus } from '@/features/voice/utils/permissions';

export interface BootSequenceState {
  permissionStatus: PermissionStatus;
  downloadProgress: number | null;
  modelCacheStatus: ModelCacheStatus;
  isBooting: boolean;
}

interface UseBootSequenceProps {
  onComplete: (granted: boolean) => Promise<void>;
}

export function useBootSequence({ onComplete }: UseBootSequenceProps) {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('idle');
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [modelCacheStatus, setModelCacheStatus] = useState<ModelCacheStatus>('checking');
  const [isBooting, setIsBooting] = useState(false);
  
  const realDownloadProgressRef = useRef<number>(0);
  const isServicesReadyRef = useRef(false);

  // Subscribe to Kokoro progress events
  useEffect(() => {
      kokoroService.onProgress((progress, text) => {
          realDownloadProgressRef.current = progress;
          logger.debug('SESSION', 'Download progress', { progress, text });
      });
      
      // Initial cache check
      checkModelCache().then(status => {
          setModelCacheStatus(status);
          logger.info('SESSION', 'Model cache status', { status });
      });
  }, []);

  const startBootSequence = async () => {
      setIsBooting(true);
      setDownloadProgress(0);
      logger.info('SESSION', 'Starting boot sequence');

      // 1. Request Permission Immediately (User Gesture)
      setPermissionStatus('pending');
      // We purposefully don't await here, so animation starts. We await at the end.
      const permissionPromise = requestMicrophonePermission();

      // 2. Start initializing services
      kokoroService.initialize()
        .then(() => { isServicesReadyRef.current = true; })
        .catch(err => {
            logger.error('APP', 'Kokoro init failed', err);
            isServicesReadyRef.current = true;
        });
      memoryService.initialize().catch(err => logger.error('APP', 'Memory init failed', err));
      
      // 3. Initialize audio context
      audioPlayer.resume().catch(err => logger.warn('APP', 'Failed to resume audio context', err));

      // 4. Run Animation Loop
      const TARGET_DURATION = 2500;
      const UPDATE_INTERVAL = 50;
      let startTime = Date.now();

      const interval = setInterval(async () => {
          const elapsed = Date.now() - startTime;
          let virtualProgress = (elapsed / TARGET_DURATION) * 100;
          
          // Hybrid Progress: Sync with real download if active
          const realProgress = realDownloadProgressRef.current;
          if (realProgress > 0 && realProgress < 100) {
              const maxAllowed = realProgress + 5; // Allow 5% buffer
              if (virtualProgress > maxAllowed) {
                  virtualProgress = maxAllowed;
                  // Slow down time-based progress to match download speed
                  // Recalculate startTime so 'elapsed' matches the clamped progress
                  startTime = Date.now() - ((virtualProgress / 100) * TARGET_DURATION);
              }
          }

          // Wait for services at 99%
          if (virtualProgress > 99 && !isServicesReadyRef.current) {
              virtualProgress = 99;
          }

          if (virtualProgress > 100) virtualProgress = 100;
          setDownloadProgress(virtualProgress);

          if (virtualProgress >= 100 && isServicesReadyRef.current) {
              clearInterval(interval);
              
<<<<<<< Updated upstream
              // Re-check cache status now that download should be complete
              checkModelCache().then(status => {
                  setModelCacheStatus(status);
                  logger.info('SESSION', 'Final model cache status', { status });
              });
=======
              // Poll for cache status (SW might lag behind download)
              let attempts = 0;
              const maxAttempts = 10;
              const cacheInterval = setInterval(async () => {
                  attempts++;
                  const status = await checkModelCache();
                  setModelCacheStatus(status);
                  
                  if (status === 'cached' || attempts >= maxAttempts) {
                      clearInterval(cacheInterval);
                      logger.info('SESSION', 'Final model cache status', { status, attempts });
                  }
              }, 1000);
>>>>>>> Stashed changes

              // 5. Auto-Start Session
              try {
                  const granted = await permissionPromise;
                  setPermissionStatus(granted ? 'granted' : 'denied');
                  await onComplete(granted);
              } catch (e) {
                  logger.error('SESSION', 'Auto-start failed', e);
                  // Even if failed, we call onComplete with false or handle error
                  setPermissionStatus('denied');
              } finally {
                  // Only end booting state when session start is fully resolved
                  setIsBooting(false);
              }
          }
      }, UPDATE_INTERVAL);
  };
  
  const retryPermission = async () => {
      setPermissionStatus('pending');
      const granted = await requestMicrophonePermission();
      setPermissionStatus(granted ? 'granted' : 'denied');
      if (granted) {
          onComplete(true);
      }
  };

  return {
      state: {
          permissionStatus,
          downloadProgress,
          modelCacheStatus,
          isBooting
      },
      actions: {
          startBootSequence,
          setPermissionStatus,
          retryPermission
      }
  };
}
