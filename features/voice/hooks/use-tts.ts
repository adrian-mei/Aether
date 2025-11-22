import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/shared/lib/logger';
import { kokoroService } from '@/features/voice/services/kokoro-service';

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      kokoroService.stop();
    };
  }, []);

  const speak = useCallback(async (text: string, options: { autoResume?: boolean } = { autoResume: true }, onComplete?: () => void) => {
    // Interruption handling
    if (synth?.speaking) {
        logger.info('VOICE', 'Interrupting current speech');
        synth.cancel();
    }
    kokoroService.stop();

    setIsSpeaking(true);
    logger.info('VOICE', 'Requesting speech', { textLength: text.length });

    try {
        // Kokoro (Primary)
        const voiceId = 'af_heart';
        
        const playbackPromise = await kokoroService.speak(
            text, 
            voiceId,
            () => setIsSpeaking(true)
        );
        
        if (playbackPromise !== undefined) {
            await playbackPromise;
        }
        
        setIsSpeaking(false);
        if (onComplete) onComplete();
        return;
    } catch (e) {
        logger.error('VOICE', 'Kokoro failed, falling back to Web Speech', e as Error);
    }

    // Fallback: Web Speech API
    if (!synth) {
        logger.warn('VOICE', 'SpeechSynthesis not available');
        setIsSpeaking(false);
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Priority Voice Selection
    const voices = synth.getVoices();
    const preferredVoice = 
        voices.find(v => v.name.includes('Catherine')) || 
        voices.find(v => v.name.includes('Google') && v.name.includes('US') && v.name.includes('Female')) ||
        voices.find(v => v.name.includes('Zira')) || 
        voices.find(v => v.name.includes('Female'));
    
    if (preferredVoice) utterance.voice = preferredVoice;

    // Tuning
    utterance.rate = 1.0; 
    utterance.pitch = 1.2; 
    utterance.volume = 1.0;

    utterance.onend = () => {
      logger.info('VOICE', 'Speech synthesis ended');
      setIsSpeaking(false);
      if (onComplete) onComplete();
    };

    utterance.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
            logger.error('VOICE', 'Speech synthesis error', { error: e.error });
        }
        setIsSpeaking(false);
    };

    synth.speak(utterance);
  }, [synth]);

  const stop = useCallback(() => {
      if (synth?.speaking) synth.cancel();
      kokoroService.stop();
      setIsSpeaking(false);
  }, [synth]);

  return {
      isSpeaking,
      speak,
      stop
  };
}
