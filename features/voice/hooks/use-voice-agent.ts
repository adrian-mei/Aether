import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/shared/lib/logger';

export type VoiceAgentState = 'idle' | 'listening' | 'processing' | 'speaking' | 'permission-denied' | 'muted';

export function useVoiceAgent(
  onInputComplete: (text: string) => void
) {
  const [state, setState] = useState<VoiceAgentState>('idle');
  const [recognition, setRecognition] = useState<any>(null);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false; // Capture one phrase at a time for fluid turn-taking
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        logger.info('VOICE', 'SpeechRecognition started');
        setState('listening');
      };
      
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        logger.info('VOICE', 'Speech recognized', { 
          transcript, 
          confidence: event.results[0][0].confidence 
        });
        setState('processing');
        onInputComplete(transcript); // Send to AI
      };

      rec.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setState('permission-denied');
          logger.error('VOICE', 'Microphone permission denied', { error: event.error }, new Error().stack);
        } else if (event.error === 'no-speech' || event.error === 'aborted') {
          logger.info('VOICE', 'Speech recognition stopped', { reason: event.error });
        } else {
          logger.error('VOICE', 'Speech recognition error', { 
            error: event.error, 
            message: event.message 
          }, new Error().stack);
        }
      };

      rec.onend = () => {
        logger.info('VOICE', 'SpeechRecognition ended');
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
    recognition?.stop();
    if (synth?.speaking) {
        synth.cancel();
    }
    setState('idle');
  }, [recognition, synth]);

  const toggleMute = useCallback(() => {
    if (state === 'muted') {
      setState('idle');
      startListening();
    } else {
      recognition?.stop();
      synth?.cancel();
      setState('muted');
    }
  }, [state, recognition, synth, startListening]);

  const reset = useCallback(() => {
    logger.info('VOICE', 'Resetting state');
    if (synth?.speaking) synth.cancel();
    recognition?.stop();
    setState('idle');
  }, [recognition, synth]);

  // The "Soft, Tender" Voice Logic
  const speak = useCallback((text: string) => {
    if (!synth) {
        logger.warn('VOICE', 'SpeechSynthesis not available');
        return;
    }

    // 1. INTERRUPTION HANDLING: Cancel any current speech
    if (synth.speaking) {
        logger.info('VOICE', 'Interrupting current speech');
        synth.cancel();
    }

    logger.info('VOICE', 'Speaking text', { textLength: text.length });
    setState('speaking');
    const utterance = new SpeechSynthesisUtterance(text);

    // 2. VOICE SELECTION (Finding a female voice)
    const voices = synth.getVoices();
    // Prioritize Google/Microsoft female voices which tend to be higher quality
    const preferredVoice = voices.find(v => 
      (v.name.includes('Google') && v.name.includes('Female')) || 
      (v.name.includes('Zira')) || 
      (v.name.includes('Female'))
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    // 3. TENDERNESS TUNING
    // Rate < 1.0 is slower and more calming
    utterance.rate = 0.85; 
    // Pitch > 1.0 often sounds softer/lighter (adjust based on specific voice engine)
    utterance.pitch = 1.1; 
    utterance.volume = 1.0;

    utterance.onstart = () => {
      logger.info('VOICE', 'Speech synthesis started');
    };

    utterance.onend = () => {
      logger.info('VOICE', 'Speech synthesis ended, auto-listening');
      setState('idle');
      // Automatically start listening again for fluid conversation
      startListening(); 
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
