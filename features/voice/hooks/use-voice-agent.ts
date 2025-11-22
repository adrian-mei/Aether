import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/shared/lib/logger';
import { useSpeechRecognition } from './use-speech-recognition';
import { useTTS } from './use-tts';

export type VoiceAgentState = 'idle' | 'listening' | 'processing' | 'speaking' | 'permission-denied' | 'muted';

export function useVoiceAgent(
  onInputComplete: (text: string) => void,
  onSilence?: () => void
) {
  const [state, setState] = useState<VoiceAgentState>('idle');
  const stateRef = useRef(state);

  // Keep ref in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  // 1. Speech Recognition
  const { 
    isListening, 
    transcript, 
    error: recognitionError, 
    startListening: startSR, 
    stopListening: stopSR,
    resetTranscript
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

  const speak = useCallback(async (text: string, options: { autoResume?: boolean; onStart?: (duration: number) => void } = { autoResume: true }) => {
      // Stop listening while speaking
      stopSR();
      // Show 'processing' (Reflecting) state while buffering audio, instead of 'speaking' immediately
      setState('processing');
      
      // Wrap options to reset transcript when speech starts
      const wrappedOptions = {
          ...options,
          onStart: (duration: number) => {
              // Clear user transcript now that Aether is speaking
              resetTranscript();
              if (options.onStart) options.onStart(duration);
          }
      };

      await speakTTS(text, wrappedOptions, () => {
          // On Complete
          // Use ref to check current state (avoiding closure staleness)
          if (options.autoResume && stateRef.current !== 'muted') {
              logger.info('VOICE', 'Auto-resuming listening');
              startListening();
          } else {
              // If we were muted during speech, stay muted. Otherwise idle.
              setState(stateRef.current === 'muted' ? 'muted' : 'idle');
          }
      });
  }, [speakTTS, stopSR, startListening]); // Removed 'state' dependency to avoid recreation loop, relying on ref

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
