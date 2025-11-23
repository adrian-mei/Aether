import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/shared/lib/logger';
import { kokoroService } from '@/features/voice/services/kokoro-service';
import type { VoiceMode } from '@/features/session/hooks/use-session-manager';

export function useTTS(voiceMode: VoiceMode = 'neural') {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      kokoroService.stop();
    };
  }, []);

  const speak = useCallback(async (text: string, options: { autoResume?: boolean; waitForPlayback?: boolean; onStart?: (duration: number) => void } = { autoResume: true, waitForPlayback: true }, onComplete?: () => void) => {
    // Interruption handling
    if (synth?.speaking) {
        logger.info('VOICE', 'Interrupting current speech');
        synth.cancel();
    }
    // Only hard stop if we are strictly interrupting (not pipelining)
    // But for now, we keep it safe.
    // Note: Pipelining relies on KokoroService not breaking when stop() is called?
    // Actually, useMessageQueue ensures serial execution of generation.
    // If we call stop() here, it might kill the previous sentence if it's still playing!
    // But useTTS is called per sentence.
    // If we pipeline, we call speak() for S2 while S1 is playing.
    // If we call stop(), S1 stops. That's bad.
    // But wait, useMessageQueue manages the stream.
    // It only calls speak() when it wants to add to the stream.
    // It shouldn't stop previous audio?
    // Ah, `kokoroService.stop()` clears the audio player queue!
    // So calling `speak` for S2 kills S1 playback if we call `stop()` here.
    
    // FIX: We should NOT call stop() if we are pipelining (i.e., part of a stream).
    // But `useTTS` doesn't know if it's a stream.
    // We can infer from `waitForPlayback`?
    // If `waitForPlayback` is false, it implies we are streaming chunks.
    // But the *next* chunk calling `speak` will kill the previous one?
    // YES.
    
    // We need to remove `kokoroService.stop()` from here if we want pipelining to work across multiple calls.
    // But we need `stop()` if the user interrupts.
    // `useTTS` is stateful `isSpeaking`.
    // The caller (`useVoiceInteraction` -> `speak`) handles interruption by calling `stopSR`.
    // `useVoiceInteraction` doesn't explicitly call `stopTTS` before `speak`.
    
    // If we remove `kokoroService.stop()`, we risk overlapping audio if called rapidly?
    // `AudioPlayer` queues audio. So they will play sequentially.
    // This is exactly what we want for pipelining!
    // So removing `kokoroService.stop()` is correct for sequential playback.
    // But we need a way to cancel. `stop()` method handles cancellation.
    
    // So, let's remove `kokoroService.stop()` from the start of `speak`.
    // The `stop()` method is available for explicit cancellation.
    
    // setIsSpeaking(true); // Delayed until actual playback starts
    logger.info('VOICE', 'Requesting speech', { textLength: text.length, pipeline: !options.waitForPlayback, mode: voiceMode });

    // Priority 1: Kokoro (Neural)
    if (voiceMode === 'neural') {
        try {
            const voiceId = 'af_heart';
            
            // Force cast to avoid TS confusion about Promise nesting
            const playbackPromise = (await kokoroService.speak(
                text, 
                voiceId,
                (duration: number) => {
                    setIsSpeaking(true);
                    if (options.onStart) options.onStart(duration);
                }
            )) as unknown as Promise<void>;
            
            if (playbackPromise) {
                if (options.waitForPlayback !== false) {
                    await playbackPromise;
                    setIsSpeaking(false);
                    if (onComplete) onComplete();
                } else {
                    // Pipeline Mode: Don't await playback.
                    playbackPromise.then(() => {
                        if (onComplete) onComplete();
                    });
                }
            }
            return;
        } catch (e) {
            logger.error('VOICE', 'Kokoro failed, falling back to Web Speech', e as Error);
        }
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

    logger.info('VOICE', 'Using Web Speech', { 
        voice: preferredVoice?.name || 'Default',
        voicesAvailable: voices.length 
    });

    // Tuning
    utterance.rate = 1.0; 
    utterance.pitch = 1.2; 
    utterance.volume = 1.0;

    let hasStarted = false;

    utterance.onstart = () => {
        hasStarted = true;
        setIsSpeaking(true);
        // Web Speech doesn't give duration upfront easily, fallback to 0 or estimate?
        // Estimated duration: 15 chars per second?
        const estimatedDuration = text.length / 15; 
        if (options.onStart) options.onStart(estimatedDuration);
    };

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
        // Ensure we clean up if error occurs before start
        if (!hasStarted && onComplete) onComplete();
    };

    try {
        synth.speak(utterance);
        
        // Safety timeout for mobile browsers that might block autoplay
        setTimeout(() => {
            if (!hasStarted) {
                logger.warn('VOICE', 'Web Speech failed to start (autoplay blocked?)');
                // Force cleanup/continuation
                setIsSpeaking(false);
                if (options.onStart) options.onStart(0);
                if (onComplete) onComplete();
                // Cancel pending utterance
                synth.cancel();
            }
        }, 1000); // 1s timeout
    } catch (e) {
        logger.error('VOICE', 'Failed to call synth.speak', e);
        if (onComplete) onComplete();
    }
  }, [synth, voiceMode]);

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
