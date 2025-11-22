import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/shared/lib/logger';
import { kokoroService } from '@/features/voice/services/kokoro-service';

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

// Extend Window interface
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export type VoiceAgentState = 'idle' | 'listening' | 'processing' | 'speaking' | 'permission-denied' | 'muted';
export type Engine = 'web-speech' | 'kokoro';

export function useVoiceAgent(
  onInputComplete: (text: string) => void,
  onSilence?: () => void
) {
  const [state, setState] = useState<VoiceAgentState>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const stateRef = useRef<VoiceAgentState>(state);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  
  // Fixed Configuration: Kokoro Heart
  const engine: Engine = 'kokoro';
  
  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Refs for silence detection
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);
  const watchdogTimer = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef<string>('');
  
  // Retry mechanism to extend listening window
  const retryCount = useRef(0);
  const MAX_RETRIES = 2;
  // Reduced from 2000ms to 1000ms to make conversation snappier
  const SILENCE_TIMEOUT_MS = 1000; 
  // Safety timeout: If no speech detected for 8s, assume silence/issue and stop
  const WATCHDOG_TIMEOUT_MS = 8000;

  // Cleanup audio on page refresh/unload
  useEffect(() => {
    const handleUnload = () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      kokoroService.stop();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = true; // Keep listening to handle pauses
      rec.interimResults = true; // Get real-time updates for silence detection
      rec.lang = 'en-US';

      rec.onstart = () => {
        logger.info('VOICE', 'SpeechRecognition started');
        setState('listening');
        transcriptRef.current = '';
        setTranscript('');

        // Start watchdog
        if (watchdogTimer.current) clearTimeout(watchdogTimer.current);
        watchdogTimer.current = setTimeout(() => {
            logger.warn('VOICE', 'Watchdog timeout (no speech detected)', { timeoutMs: WATCHDOG_TIMEOUT_MS });
            rec.stop();
            // We treat this as silence/no-input
            if (onSilence) onSilence();
        }, WATCHDOG_TIMEOUT_MS);
      };
      
      rec.onresult = (event: SpeechRecognitionEvent) => {
        retryCount.current = 0;
        
        // Clear timers on new input
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
        if (watchdogTimer.current) clearTimeout(watchdogTimer.current);

        // Reconstruct full transcript from results
        const currentTranscript = Array.from({ length: event.results.length }, (_, i) => event.results[i])
          .map((result) => result[0].transcript)
          .join('');
        
        transcriptRef.current = currentTranscript;
        setTranscript(currentTranscript);
        logger.debug('VOICE', 'Partial speech result', { transcript: currentTranscript });

        // Set new timer
        silenceTimer.current = setTimeout(() => {
          if (transcriptRef.current.trim()) {
            logger.info('VOICE', 'Silence detected (end of turn)', { 
              transcript: transcriptRef.current,
              timeoutMs: SILENCE_TIMEOUT_MS
            });
            rec.stop(); // Stop listening
            setState('processing');
            onInputComplete(transcriptRef.current);
          }
        }, SILENCE_TIMEOUT_MS);
      };

      rec.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
        
        if (event.error === 'not-allowed') {
          setState('permission-denied');
          retryCount.current = 0;
          logger.error('VOICE', 'Microphone permission denied', { error: event.error }, new Error().stack);
        } else if (event.error === 'no-speech') {
          logger.info('VOICE', 'No speech detected (silence)');
          // Increment retry count to trigger restart in onend
          retryCount.current += 1;
        } else if (event.error === 'aborted') {
          logger.info('VOICE', 'Speech recognition aborted');
          retryCount.current = 0;
        } else {
          logger.error('VOICE', 'Speech recognition error', { 
            error: event.error, 
            message: event.message 
          }, new Error().stack);
          retryCount.current = 0;
        }
      };

      rec.onend = () => {
        logger.info('VOICE', 'SpeechRecognition session ended');
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
        if (watchdogTimer.current) clearTimeout(watchdogTimer.current);

        // Check if we should restart to extend the listening window
        if (retryCount.current > 0 && retryCount.current <= MAX_RETRIES) {
            logger.info('VOICE', 'Restarting listening (retry strategy)', { retry: retryCount.current });
            try {
                rec.start();
            } catch (e) {
                logger.error('VOICE', 'Failed to restart recognition', e as Error);
                setState('idle');
            }
        } else if (stateRef.current === 'listening' && retryCount.current === 0) {
             // If it ended normally but we are still in 'listening' state (meaning no result was processed)
             // We should reset to idle. If a result came in, state would be 'processing'.
             setState('idle');
        } else if (retryCount.current > MAX_RETRIES) {
             logger.info('VOICE', 'Max retries reached, triggering silence handler');
             retryCount.current = 0;
             setState('idle');
             if (onSilence) onSilence();
        }
      };

      recognitionRef.current = rec;
      logger.debug('VOICE', 'SpeechRecognition initialized');
    }
  }, [onInputComplete]);

  const startListening = useCallback(() => {
    if (synth?.speaking) {
        logger.info('VOICE', 'Stopping speech to listen');
        synth.cancel(); 
    }
    kokoroService.stop(); // Stop any Kokoro audio
    
    logger.info('VOICE', 'Starting listening');
    try {
      recognitionRef.current?.start();
    } catch (e: unknown) {
      const error = e as Error;
      if (error.name === 'InvalidStateError' || error.message?.includes('already started')) {
        logger.debug('VOICE', 'Recognition already started, ignoring duplicate start');
      } else {
        logger.error('VOICE', 'Failed to start recognition', error);
      }
    }
  }, [synth]);

  const stopListening = useCallback(() => {
    logger.info('VOICE', 'Stopping listening');
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    if (watchdogTimer.current) clearTimeout(watchdogTimer.current);
    retryCount.current = 0; // Prevent auto-restart
    recognitionRef.current?.stop();
    if (synth?.speaking) {
        synth.cancel();
    }
    kokoroService.stop();
    setState('idle');
  }, [synth]);

  const toggleMute = useCallback(() => {
    if (state === 'muted') {
      // Unmute: go back to idle, don't auto-start listening
      logger.info('VOICE', 'Unmuting microphone');
      setState('idle');
    } else {
      // Mute: stop listening but allow AI to continue speaking
      logger.info('VOICE', 'Muting microphone');
      recognitionRef.current?.stop();
      setState('muted');
    }
  }, [state]);

  const reset = useCallback(() => {
    logger.info('VOICE', 'Resetting state');
    retryCount.current = 0;
    if (synth?.speaking) synth.cancel();
    kokoroService.stop();
    recognitionRef.current?.stop();
    setState('idle');
  }, [synth]);

  // The "Soft, Tender" Voice Logic
  const speak = useCallback(async (text: string, options: { autoResume?: boolean } = { autoResume: true }) => {
    // 1. INTERRUPTION HANDLING
    if (synth?.speaking) {
        logger.info('VOICE', 'Interrupting current speech');
        synth.cancel();
    }
    kokoroService.stop();

    logger.info('VOICE', 'Requesting speech', { textLength: text.length, engine });
    
    // Handle Neural Engine (Primary)
    setState('processing'); // Show spinner while generating
    try {
        // Fixed to Heart
        const voiceId = 'af_heart';
        
        // Get the playback promise (resolves when audio finishes playing)
        // kokoroService.speak resolves immediately after queuing (pipeline parallelism)
        const playbackPromise = await kokoroService.speak(
            text, 
            voiceId,
            () => setState('speaking') // Switch to speaking wave on audio start
        );
        
        // If we need to autoResume (last chunk), we MUST wait for playback to finish.
        // If not (intermediate chunk), we return immediately to allow next generation.
        if (options.autoResume && playbackPromise) {
            await playbackPromise;
        }
        
        // On finish
        if (stateRef.current !== 'muted') {
            if (options.autoResume) {
                logger.info('VOICE', 'Kokoro speech finished, resuming listening');
                setState('idle');
                startListening();
            } else {
                logger.debug('VOICE', 'Speech finished, keeping mic off for next chunk');
                // Keep state as 'speaking' to maintain UI consistency (visualizer) during gaps
                setState('speaking');
            }
        } else {
            setState('muted');
        }
        return;
    } catch (e) {
        logger.error('VOICE', 'Kokoro failed, falling back to Web Speech', e as Error);
        // Fallback: Continue to Web Speech logic below
    }

    // Web Speech API Logic
    setState('speaking');
    if (!synth) {
        logger.warn('VOICE', 'SpeechSynthesis not available');
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // 2. VOICE SELECTION (Fallback)
    const voices = synth.getVoices();
    
    // Priority: Catherine -> Google US Female -> Microsoft Zira -> Generic Female
    const preferredVoice = 
        voices.find(v => v.name.includes('Catherine')) || 
        voices.find(v => v.name.includes('Google') && v.name.includes('US') && v.name.includes('Female')) ||
        voices.find(v => v.name.includes('Zira')) || 
        voices.find(v => v.name.includes('Female'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      logger.info('VOICE', 'Auto-selected fallback voice', { name: preferredVoice.name });
    }

    // 3. VOICE TUNING (Cute & Normal Speed)
    utterance.rate = 1.0; 
    // Higher pitch for "cute" tone
    utterance.pitch = 1.2; 
    utterance.volume = 1.0;

    utterance.onstart = () => {
      logger.info('VOICE', 'Speech synthesis started');
    };

    utterance.onend = () => {
      logger.info('VOICE', 'Speech synthesis ended');
      // Only auto-start listening if not muted
      if (stateRef.current !== 'muted') {
        if (options.autoResume) {
            logger.info('VOICE', 'Auto-resuming listening');
            retryCount.current = 0; // Reset retries for new turn
            setState('idle');
            startListening();
        }
      } else {
        logger.info('VOICE', 'Mic is muted, staying muted');
        setState('muted');
      }
    };

    utterance.onerror = (e) => {
        // Ignore interruptions as they are expected when user talks/cancels
        if (e.error === 'interrupted' || e.error === 'canceled') {
            logger.info('VOICE', 'Speech interrupted', { elapsedTime: e.elapsedTime });
        } else {
            // Extract meaningful error info from the event
            logger.error('VOICE', 'Speech synthesis error', { 
                error: e.error, 
                elapsedTime: e.elapsedTime 
            });
        }
        setState('idle');
    };

    synth.speak(utterance);
  }, [synth, startListening]);

  return {
    state,
    transcript,
    startListening,
    stopListening,
    reset,
    speak,
    toggleMute,
    setState
  };
}
