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

  const initializeServices = () => {
      if (voiceMode === 'neural') {
          setBootStatus('Preparing AI Model...');
          kokoroService.initialize()
            .then(() => { isServicesReadyRef.current = true; })
            .catch(err => {
                logger.error('APP', 'Kokoro init failed', err);
                isServicesReadyRef.current = true;
            });
      } else {
          logger.info('SESSION', 'Skipping Kokoro init (Native Mode)');
          setBootStatus('Preparing Voice Engine...');
          isServicesReadyRef.current = true;
          setTimeout(() => { realDownloadProgressRef.current = 100; }, 100);
      }
      memoryService.initialize().catch(err => logger.error('APP', 'Memory init failed', err));
      audioPlayer.resume().catch(err => logger.warn('APP', 'Failed to resume audio context', err));
  };

  const waitForPermissions = async (permissionPromise: Promise<boolean>) => {
      try {
          const timeoutPromise = new Promise<boolean>((_, reject) => {
              setTimeout(() => reject(new Error('Permission request timed out')), 10000);
          });

          logger.info('SESSION', 'Waiting for permission promise...');
          const granted = await Promise.race([permissionPromise, timeoutPromise]);
          
          logger.info('SESSION', 'Permission resolved', { granted });
          setPermissionStatus(granted ? 'granted' : 'denied');
          setBootStatus(granted ? 'Starting session...' : 'Permission denied');
          
          await new Promise(r => setTimeout(r, 500));
          await onComplete(granted);
      } catch (e) {
          logger.error('SESSION', 'Auto-start failed', e);
          setPermissionStatus('denied');
          setBootStatus('Boot failed. Please retry.');
      } finally {
          setIsBooting(false);
          setBootStatus('');
      }
  };

  const startBootSequence = async () => {
      setIsBooting(true);
      setDownloadProgress(0);
      setBootStatus('Initializing services...');
      logger.info('SESSION', 'Starting boot sequence');

      setPermissionStatus('pending');
      const permissionPromise = requestMicrophonePermission();

      initializeServices();

      const TARGET_DURATION = 2500;
      const UPDATE_INTERVAL = 50;
      let startTime = Date.now();

      const interval = setInterval(async () => {
          const elapsed = Date.now() - startTime;
          let virtualProgress = (elapsed / TARGET_DURATION) * 100;
          
          const realProgress = realDownloadProgressRef.current;
          if (realProgress > 0 && realProgress < 100) {
              const maxAllowed = realProgress + 5;
              if (virtualProgress > maxAllowed) {
                  virtualProgress = maxAllowed;
                  startTime = Date.now() - ((virtualProgress / 100) * TARGET_DURATION);
              }
          }

          if (virtualProgress > 99 && !isServicesReadyRef.current) {
              virtualProgress = 99;
              setBootStatus('Finalizing model download...');
          }

          if (virtualProgress > 100) virtualProgress = 100;
          setDownloadProgress(virtualProgress);
          
          if (virtualProgress < 99 && isServicesReadyRef.current === false) {
              setBootStatus(`Downloading AI Model (${Math.round(virtualProgress)}%)...`);
          }

          if (virtualProgress >= 100 && isServicesReadyRef.current) {
              clearInterval(interval);
              setBootStatus('Checking permissions...');
              
              // Trigger cache check polling
              let attempts = 0;
              const cacheInterval = setInterval(() => {
                  attempts++;
                  checkCache();
                  if (attempts >= 10) clearInterval(cacheInterval);
              }, 1000);

              await waitForPermissions(permissionPromise);
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
