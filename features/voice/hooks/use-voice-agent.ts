import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/shared/lib/logger';
import { kokoroService, KOKORO_VOICES, KokoroVoice } from '@/features/voice/services/kokoro-service';

export type VoiceAgentState = 'idle' | 'listening' | 'processing' | 'speaking' | 'permission-denied' | 'muted';
export type Engine = 'web-speech' | 'kokoro';

export function useVoiceAgent(
  onInputComplete: (text: string) => void
) {
  const [state, setState] = useState<VoiceAgentState>('idle');
  const stateRef = useRef<VoiceAgentState>(state);
  const [recognition, setRecognition] = useState<any>(null);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  
  // Fixed Configuration: Kokoro Heart
  const engine: Engine = 'kokoro';
  
  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Eager Load Kokoro on Mount
  useEffect(() => {
    logger.info('VOICE', 'Eager loading Kokoro engine');
    kokoroService.initialize().catch(e => {
        logger.error('VOICE', 'Failed to eager load Kokoro', e);
    });
  }, []);


  // Refs for silence detection
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef<string>('');
  
  // Retry mechanism to extend listening window
  const retryCount = useRef(0);
  const MAX_RETRIES = 2;
  const SILENCE_TIMEOUT_MS = 2000; // Wait 2s of silence before sending

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
    if (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = true; // Keep listening to handle pauses
      rec.interimResults = true; // Get real-time updates for silence detection
      rec.lang = 'en-US';

      rec.onstart = () => {
        logger.info('VOICE', 'SpeechRecognition started');
        setState('listening');
        transcriptRef.current = '';
      };
      
      rec.onresult = (event: any) => {
        retryCount.current = 0;
        
        // Clear existing timer on new input
        if (silenceTimer.current) clearTimeout(silenceTimer.current);

        // Reconstruct full transcript from results
        const currentTranscript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        
        transcriptRef.current = currentTranscript;

        // Set new timer
        silenceTimer.current = setTimeout(() => {
          if (transcriptRef.current.trim()) {
            logger.info('VOICE', 'Silence detected, processing input', { 
              transcript: transcriptRef.current 
            });
            rec.stop(); // Stop listening
            setState('processing');
            onInputComplete(transcriptRef.current);
          }
        }, SILENCE_TIMEOUT_MS);
      };

      rec.onerror = (event: any) => {
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
        logger.info('VOICE', 'SpeechRecognition ended');
        if (silenceTimer.current) clearTimeout(silenceTimer.current);

        // Check if we should restart to extend the listening window
        if (retryCount.current > 0 && retryCount.current <= MAX_RETRIES) {
            logger.info('VOICE', 'Restarting listening to extend window', { retry: retryCount.current });
            try {
                rec.start();
            } catch (e) {
                logger.error('VOICE', 'Failed to restart recognition', e);
                setState('idle');
            }
        } else if (stateRef.current === 'listening' && retryCount.current === 0) {
             // If it ended normally but we are still in 'listening' state (meaning no result was processed)
             // We should reset to idle. If a result came in, state would be 'processing'.
             setState('idle');
        } else if (retryCount.current > MAX_RETRIES) {
             logger.info('VOICE', 'Max retries reached, stopping');
             retryCount.current = 0;
             setState('idle');
        }
      };

      setRecognition(rec);
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
      recognition?.start();
    } catch (e: any) {
      if (e.name === 'InvalidStateError' || e.message?.includes('already started')) {
        logger.debug('VOICE', 'Recognition already started, ignoring duplicate start');
      } else {
        logger.error('VOICE', 'Failed to start recognition', e);
      }
    }
  }, [recognition, synth]);

  const stopListening = useCallback(() => {
    logger.info('VOICE', 'Stopping listening');
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    retryCount.current = 0; // Prevent auto-restart
    recognition?.stop();
    if (synth?.speaking) {
        synth.cancel();
    }
    kokoroService.stop();
    setState('idle');
  }, [recognition, synth]);

  const toggleMute = useCallback(() => {
    if (state === 'muted') {
      // Unmute: go back to idle, don't auto-start listening
      logger.info('VOICE', 'Unmuting microphone');
      setState('idle');
    } else {
      // Mute: stop listening but allow AI to continue speaking
      logger.info('VOICE', 'Muting microphone');
      recognition?.stop();
      setState('muted');
    }
  }, [state, recognition]);

  const reset = useCallback(() => {
    logger.info('VOICE', 'Resetting state');
    retryCount.current = 0;
    if (synth?.speaking) synth.cancel();
    kokoroService.stop();
    recognition?.stop();
    setState('idle');
  }, [recognition, synth]);

  // The "Soft, Tender" Voice Logic
  const speak = useCallback(async (text: string) => {
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
        
        await kokoroService.speak(
            text, 
            voiceId,
            () => setState('speaking') // Switch to speaking wave on audio start
        );
        
        // On finish
        if (stateRef.current !== 'muted') {
            logger.info('VOICE', 'Kokoro speech finished, resuming listening');
            setState('idle');
            startListening();
        } else {
            setState('muted');
        }
        return;
    } catch (e) {
        logger.error('VOICE', 'Kokoro failed, falling back to Web Speech', e);
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
      if (state !== 'muted') {
        logger.info('VOICE', 'Auto-resuming listening');
        retryCount.current = 0; // Reset retries for new turn
        setState('idle');
        startListening();
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
    startListening,
    stopListening,
    reset,
    speak,
    toggleMute,
    setState
  };
}
