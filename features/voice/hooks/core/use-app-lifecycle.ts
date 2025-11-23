import { useEffect, useRef } from 'react';
import { logger } from '@/shared/lib/logger';
import { audioPlayer } from '@/features/voice/utils/audio-player';

interface UseAppLifecycleProps {
  isListening: boolean;
  isSpeaking: boolean;
  onPauseListening: () => void;
  onResumeListening: () => void;
}

export function useAppLifecycle({
  isListening,
  isSpeaking,
  onPauseListening,
  onResumeListening
}: UseAppLifecycleProps) {
  const wasListeningRef = useRef(false);
  const stateRef = useRef({ isListening, isSpeaking }); // Track latest state

  useEffect(() => {
    stateRef.current = { isListening, isSpeaking };
  }, [isListening, isSpeaking]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        if (stateRef.current.isListening) {
            logger.info('VOICE', 'App backgrounded, pausing listening');
            wasListeningRef.current = true;
            onPauseListening();
        } else {
            wasListeningRef.current = false;
        }
        
        // Note: We deliberately DO NOT stop TTS here to allow background playback.
      } else {
        // App foregrounded
        logger.info('VOICE', 'App foregrounded');
        
        // Resume Audio Context (Vital for iOS)
        try {
            await audioPlayer.resume();
        } catch (e) {
            logger.warn('VOICE', 'Failed to resume audio context on foreground', e);
        }

        if (wasListeningRef.current) {
            logger.info('VOICE', 'Resuming listening from background state');
            onResumeListening();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [onPauseListening, onResumeListening]);
}
