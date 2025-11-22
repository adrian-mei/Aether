import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/shared/lib/logger';

// Minimal types for Web Speech API
interface SpeechRecognitionEvent {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
    };
    length: number;
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface UseSpeechRecognitionProps {
  onInputComplete: (text: string) => void;
  onSilence?: () => void;
}

export function useSpeechRecognition({ onInputComplete, onSilence }: UseSpeechRecognitionProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);
  const watchdogTimer = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef('');
  const retryCount = useRef(0);
  const shouldKeepListening = useRef(false);
  
  const MAX_RETRIES = 2;
  const SILENCE_TIMEOUT_MS = 1000;
  const WATCHDOG_TIMEOUT_MS = 8000;

  // Initialize
  useEffect(() => {
    if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        logger.info('VOICE', 'SpeechRecognition started');
        setIsListening(true);
        transcriptRef.current = '';
        setTranscript('');
        setError(null);

        // Start watchdog
        if (watchdogTimer.current) clearTimeout(watchdogTimer.current);
        watchdogTimer.current = setTimeout(() => {
            logger.warn('VOICE', 'Watchdog timeout (no speech detected) - Restarting', { timeoutMs: WATCHDOG_TIMEOUT_MS });
            rec.stop();
            // Don't call onSilence here, let onend restart it if shouldKeepListening is true
        }, WATCHDOG_TIMEOUT_MS);
      };

      rec.onresult = (event: SpeechRecognitionEvent) => {
        retryCount.current = 0;
        
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
        if (watchdogTimer.current) clearTimeout(watchdogTimer.current);

        const currentTranscript = Array.from({ length: event.results.length }, (_, i) => event.results[i])
          .map((result) => result[0].transcript)
          .join('');
        
        transcriptRef.current = currentTranscript;
        setTranscript(currentTranscript);
        logger.debug('VOICE', 'Partial speech result', { transcript: currentTranscript });

        silenceTimer.current = setTimeout(() => {
          if (transcriptRef.current.trim()) {
            logger.info('VOICE', 'Silence detected (end of turn)', { 
              transcript: transcriptRef.current,
              timeoutMs: SILENCE_TIMEOUT_MS
            });
            shouldKeepListening.current = false; // Intentional stop for processing
            rec.stop();
            onInputComplete(transcriptRef.current);
          }
        }, SILENCE_TIMEOUT_MS);
      };

      rec.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
        
        if (event.error === 'not-allowed') {
          setError('permission-denied');
          retryCount.current = 0;
          logger.error('VOICE', 'Microphone permission denied', { error: event.error });
        } else if (event.error === 'no-speech') {
          logger.info('VOICE', 'No speech detected (silence)');
          retryCount.current += 1;
        } else if (event.error === 'aborted') {
          logger.info('VOICE', 'Speech recognition aborted');
          retryCount.current = 0;
        } else {
          logger.error('VOICE', 'Speech recognition error', { error: event.error });
          retryCount.current = 0;
        }
      };

      rec.onend = () => {
        logger.info('VOICE', 'SpeechRecognition session ended');
        setIsListening(false);
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
        if (watchdogTimer.current) clearTimeout(watchdogTimer.current);

        // Auto-restart if we should be listening
        if (shouldKeepListening.current) {
            logger.info('VOICE', 'Auto-restarting listening (continuous mode)');
            try {
                rec.start();
            } catch (e) {
                logger.error('VOICE', 'Failed to auto-restart recognition', e as Error);
                // If restart fails, maybe wait a bit? 
                // But preventing infinite loops is handled by browser limits usually.
                // For now, if start throws, we might be in a bad state.
                // Maybe trigger error?
                shouldKeepListening.current = false;
                if (onSilence) onSilence();
            }
        } else {
            // Only check retries if we weren't trying to keep listening (e.g. if it stopped due to error but we didn't set shouldKeepListening yet?)
            // Actually shouldKeepListening covers the "Intentional" state.
            // If error happened, we might want to retry even if shouldKeepListening was false? 
            // No, startListening sets it true.
            
            if (retryCount.current > MAX_RETRIES) {
                 logger.info('VOICE', 'Max retries reached, triggering silence handler');
                 retryCount.current = 0;
                 if (onSilence) onSilence();
            }
        }
      };

      recognitionRef.current = rec;
    }
  }, [onInputComplete, onSilence]);

  const startListening = useCallback(() => {
    logger.info('VOICE', 'Starting listening');
    shouldKeepListening.current = true;
    try {
      recognitionRef.current?.start();
    } catch (e: unknown) {
      const error = e as Error;
      if (error.name === 'InvalidStateError' || error.message?.includes('already started')) {
        logger.debug('VOICE', 'Recognition already started');
      } else {
        logger.error('VOICE', 'Failed to start recognition', error);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    logger.info('VOICE', 'Stopping listening');
    shouldKeepListening.current = false;
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    if (watchdogTimer.current) clearTimeout(watchdogTimer.current);
    retryCount.current = 0;
    recognitionRef.current?.stop();
  }, []);

  const resetTranscript = useCallback(() => {
      setTranscript('');
      transcriptRef.current = '';
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript
  };
}
