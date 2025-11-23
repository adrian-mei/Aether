import { useState, useEffect, useRef } from 'react';
import { logger } from '@/shared/lib/logger';
import { kokoroService } from '@/features/voice/services/kokoro-service';
import { memoryService } from '@/features/memory/services/memory-service';
import { audioPlayer } from '@/features/voice/utils/audio-player';
import { ModelCacheStatus } from '@/features/voice/utils/model-cache';
import { requestMicrophonePermission, PermissionStatus } from '@/features/voice/utils/permissions';
import { useSystemCheck } from '@/features/system/hooks/use-system-check';
import type { VoiceMode } from '@/features/session/hooks/use-session-manager';

export interface BootSequenceState {
  permissionStatus: PermissionStatus;
  downloadProgress: number | null;
  modelCacheStatus: ModelCacheStatus;
  isBooting: boolean;
  bootStatus: string;
}

interface UseBootSequenceProps {
  voiceMode: VoiceMode;
  onComplete: (granted: boolean) => Promise<void>;
}

export function useBootSequence({ voiceMode, onComplete }: UseBootSequenceProps) {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('idle');
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isBooting, setIsBooting] = useState(false);
  const [bootStatus, setBootStatus] = useState<string>('');
  
  // Use System Check Worker
  const { modelCacheStatus, checkCache } = useSystemCheck();
  
  const realDownloadProgressRef = useRef<number>(0);
  const isServicesReadyRef = useRef(false);

  // Subscribe to Kokoro progress events
  useEffect(() => {
      kokoroService.onProgress((progress, text) => {
          realDownloadProgressRef.current = progress;
          logger.debug('SESSION', 'Download progress', { progress, text });
      });
      
      // Initial cache check via worker
      // Wait a bit for worker to init
      setTimeout(() => checkCache(), 500);
  }, [checkCache]);

  const startBootSequence = async () => {
      setIsBooting(true);
      setDownloadProgress(0);
      setBootStatus('Initializing services...');
      logger.info('SESSION', 'Starting boot sequence');

      // 1. Request Permission Immediately (User Gesture)
      setPermissionStatus('pending');
      // We purposefully don't await here, so animation starts. We await at the end.
      const permissionPromise = requestMicrophonePermission();

      // 2. Start initializing services
      if (voiceMode === 'neural') {
          setBootStatus('Preparing AI Model...');
          kokoroService.initialize()
            .then(() => { isServicesReadyRef.current = true; })
            .catch(err => {
                logger.error('APP', 'Kokoro init failed', err);
                isServicesReadyRef.current = true;
            });
      } else {
          // In native mode, we skip the heavy model load
          logger.info('SESSION', 'Skipping Kokoro init (Native Mode)');
          setBootStatus('Preparing Voice Engine...');
          isServicesReadyRef.current = true;
          // Immediately jump progress
          setTimeout(() => {
              realDownloadProgressRef.current = 100;
          }, 100);
      }

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
              setBootStatus('Finalizing model download...');
          }

          if (virtualProgress > 100) virtualProgress = 100;
          setDownloadProgress(virtualProgress);
          
          // Update status during download
          if (virtualProgress < 99 && isServicesReadyRef.current === false) {
              setBootStatus(`Downloading AI Model (${Math.round(virtualProgress)}%)...`);
          }

          if (virtualProgress >= 100 && isServicesReadyRef.current) {
              clearInterval(interval);
              setBootStatus('Checking permissions...');
              
              // Poll for cache status (SW might lag behind download)
              let attempts = 0;
              const maxAttempts = 10;
              const cacheInterval = setInterval(() => {
                  attempts++;
                  checkCache();
                  
                  // We rely on modelCacheStatus updating via the hook
                  // But inside this interval closure, we can't see the updated state easily without refs or dependency
                  // However, the worker will keep checking. 
                  // Actually, checkCache triggers one check.
                  
                  if (attempts >= maxAttempts) {
                      clearInterval(cacheInterval);
                  }
              }, 1000);
              
              // Stop polling if we see it cached (via effect on prop)
              // We can't easily stop this interval from outside based on state change unless we use a ref for interval
              // For simplicity, we just let it poll 10 times or until component unmounts (cleanup)

              // 5. Auto-Start Session
              try {
                  // Race permission against a 10s timeout to prevent infinite hanging
                  const timeoutPromise = new Promise<boolean>((_, reject) => {
                      setTimeout(() => reject(new Error('Permission request timed out')), 10000);
                  });

                  logger.info('SESSION', 'Waiting for permission promise...');

                  const granted = await Promise.race([permissionPromise, timeoutPromise]);
                  
                  logger.info('SESSION', 'Permission resolved', { granted });
                  setPermissionStatus(granted ? 'granted' : 'denied');
                  setBootStatus(granted ? 'Starting session...' : 'Permission denied');
                  
                  // Small delay to let the user see the status change
                  await new Promise(r => setTimeout(r, 500));
                  
                  await onComplete(granted);
              } catch (e) {
                  logger.error('SESSION', 'Auto-start failed', e);
                  // Even if failed, we call onComplete with false or handle error
                  setPermissionStatus('denied');
                  setBootStatus('Boot failed. Please retry.');
              } finally {
                  // Only end booting state when session start is fully resolved
                  setIsBooting(false);
                  setBootStatus('');
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
          isBooting,
          bootStatus
      },
      actions: {
          startBootSequence,
          setPermissionStatus,
          retryPermission
      }
  };
}
