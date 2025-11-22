import { useEffect, useRef } from 'react';
import { useOceanSound } from './use-ocean-sound';
import { useWakingSound } from './use-waking-sound';
import { useWakeLock } from './use-wake-lock';
import { SessionStatus } from './use-session-manager';

interface UseSessionAudioProps {
  sessionStatus: SessionStatus;
}

export function useSessionAudio({ sessionStatus }: UseSessionAudioProps) {
  const { play: playOcean } = useOceanSound(0.05);
  const { playWakingSound } = useWakingSound();
  const { requestWakeLock, releaseWakeLock } = useWakeLock();
  const hasPlayedWakeRef = useRef(false);

  // Manage Wake Lock based on session status
  useEffect(() => {
    if (sessionStatus === 'running') {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [sessionStatus, requestWakeLock, releaseWakeLock]);

  // Play waking sound on initialization (once)
  useEffect(() => {
    if (sessionStatus === 'initializing' && !hasPlayedWakeRef.current) {
      hasPlayedWakeRef.current = true;
      playWakingSound();
    }
  }, [sessionStatus, playWakingSound]);

  return {
    playOcean
  };
}
