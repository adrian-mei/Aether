import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/shared/lib/logger';
import { useSpeechRecognition } from '../recognition/use-speech-recognition';
import { useTTS } from '../synthesis/use-tts';

export type VoiceInteractionState = 'idle' | 'listening' | 'processing' | 'speaking' | 'permission-denied' | 'muted';

export interface VoiceEvent {
    type: 'input' | 'silence';
    payload?: string | number;
}

export function useVoiceInteraction() {
  // Explicit overrides for states that cannot be purely derived from sub-hooks
  const [manualState, setManualState] = useState<'processing' | 'muted' | null>(null);
  
  // 1. Speech Recognition
  const { 
    isListening, 
    transcript, 
    error: recognitionError, 
    lastInput,
    silenceDetected,
    startListening: startSR, 
    stopListening: stopSR,
    resetTranscript
  } = useSpeechRecognition();

  // Reactive State Logic
  useEffect(() => {
      if (lastInput) {
          setManualState('processing');
      }
  }, [lastInput]);

  useEffect(() => {
      if (silenceDetected) {
          setManualState(null);
      }
  }, [silenceDetected]);

  // 2. Text-to-Speech
  const { 
    isSpeaking, 
    speak: speakTTS, 
    stop: stopTTS 
  } = useTTS();

  // Derived State
  let state: VoiceInteractionState = 'idle';
  if (recognitionError === 'permission-denied') {
      state = 'permission-denied';
  } else if (isSpeaking) {
      state = 'speaking';
  } else if (manualState) {
      state = manualState;
  } else if (isListening) {
      state = 'listening';
  }

  const stateRef = useRef(state);
  // Keep ref in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Actions
  const startListening = useCallback(() => {
    stopTTS();
    setManualState(null);
    startSR();
  }, [startSR, stopTTS]);

  const stopListening = useCallback(() => {
    stopSR();
    stopTTS();
    setManualState(null);
  }, [stopSR, stopTTS]);

  const toggleMute = useCallback(() => {
    if (stateRef.current === 'muted') {
      logger.info('VOICE', 'Unmuting microphone');
      setManualState(null);
    } else {
      logger.info('VOICE', 'Muting microphone');
      stopSR(); // Stop listening but allow speaking to continue
      setManualState('muted');
    }
  }, [stopSR]); // Removed stateRef dependency as we use .current

  const reset = useCallback(() => {
    logger.info('VOICE', 'Resetting state');
    stopSR();
    stopTTS();
    setManualState(null);
  }, [stopSR, stopTTS]);

  const speak = useCallback(async (text: string, options: { autoResume?: boolean; onStart?: (duration: number) => void } = { autoResume: true }) => {
      // Stop listening while speaking
      stopSR();
      // Show 'processing' (Reflecting) state while buffering audio, instead of 'speaking' immediately
      setManualState('processing');
      
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
              // If manualState is 'muted', it stays muted. If it was 'processing', we clear it.
              if (stateRef.current !== 'muted') {
                  setManualState(null);
              }
          }
      });
  }, [speakTTS, stopSR, startListening, resetTranscript]);

  return {
    state,
    transcript,
    lastInput,
    silenceDetected,
    startListening,
    stopListening,
    reset,
    speak,
    toggleMute,
    setState: () => logger.warn('VOICE', 'setState is deprecated in useVoiceInteraction') // No-op for compatibility
  };
}
