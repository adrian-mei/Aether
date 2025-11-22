import { logger } from '@/shared/lib/logger';

export type PermissionStatus = 'idle' | 'pending' | 'granted' | 'denied';

export async function requestMicrophonePermission(): Promise<boolean> {
  logger.info('PERMISSIONS', 'Requesting microphone permission...');
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    logger.error('PERMISSIONS', 'getUserMedia not supported on this browser.');
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // We don't need to use the stream, just requesting it is enough to get permission.
    // It's good practice to stop the tracks immediately to release the microphone.
    stream.getTracks().forEach(track => track.stop());
    logger.info('PERMISSIONS', 'Microphone permission granted.');
    return true;
  } catch (err: unknown) {
    const error = err as Error;
    logger.error('PERMISSIONS', 'Microphone permission denied or error.', { error: error.name, message: error.message }, error.stack);
    return false;
  }
}
