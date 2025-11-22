import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/shared/lib/logger';
import { useSpeechRecognition } from './use-speech-recognition';
import { useTTS } from './use-tts';

export type VoiceAgentState = 'idle' | 'listening' | 'processing' | 'speaking' | 'permission-denied' | 'muted';

export function useVoiceAgent(
  onInputComplete: (text: string) => void,
  onSilence?: () => void
) {
  const [state, setState] = useState<VoiceAgentState>('idle');
  
  // 1. Speech Recognition
  const { 
    isListening, 
    transcript, 
    error: recognitionError, 
    startListening: startSR, 
    stopListening: stopSR 
  } = useSpeechRecognition({
    onInputComplete: (text) => {
      setState('processing');
      onInputComplete(text);
    },
    onSilence: () => {
        if (onSilence) onSilence();
        setState('idle');
    }
  });

  // 2. Text-to-Speech
  const { 
    isSpeaking, 
    speak: speakTTS, 
    stop: stopTTS 
  } = useTTS();

  // State Synchronization
  useEffect(() => {
    if (recognitionError === 'permission-denied') {
        setState('permission-denied');
    } else if (isSpeaking) {
        setState('speaking');
    } else if (isListening) {
        setState('listening');
    } else if (state !== 'processing') {
        // Only revert to idle if we aren't processing input (which is manually set)
        setState('idle');
    }
  }, [isListening, isSpeaking, recognitionError]); // We don't depend on 'state' to avoid loops, but we check processing

  // Actions
  const startListening = useCallback(() => {
    stopTTS();
    setState('listening');
    startSR();
  }, [startSR, stopTTS]);

  const stopListening = useCallback(() => {
    stopSR();
    stopTTS();
    setState('idle');
  }, [stopSR, stopTTS]);

  const toggleMute = useCallback(() => {
    if (state === 'muted') {
      logger.info('VOICE', 'Unmuting microphone');
      setState('idle');
    } else {
      logger.info('VOICE', 'Muting microphone');
      stopSR(); // Stop listening but allow speaking to continue
      setState('muted');
    }
  }, [state, stopSR]);

  const reset = useCallback(() => {
    logger.info('VOICE', 'Resetting state');
    stopSR();
    stopTTS();
    setState('idle');
  }, [stopSR, stopTTS]);

  const speak = useCallback(async (text: string, options: { autoResume?: boolean; onStart?: () => void } = { autoResume: true }) => {
      // Stop listening while speaking
      stopSR();
      setState('speaking');
      
      await speakTTS(text, options, () => {
          // On Complete
          if (options.autoResume && state !== 'muted') {
              logger.info('VOICE', 'Auto-resuming listening');
              startListening();
          } else {
              setState(state === 'muted' ? 'muted' : 'idle');
          }
      });
  }, [speakTTS, stopSR, startListening, state]);

  return {
    state,
    transcript,
    startListening,
    stopListening,
    reset,
    speak,
    toggleMute,
    setState // Exposed for manual overrides if needed
  };
}
