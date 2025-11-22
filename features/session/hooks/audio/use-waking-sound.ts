import { useRef, useCallback, useEffect } from 'react';
import { logger } from '@/shared/lib/logger';

export function useWakingSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);

  const playWakingSound = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      // Handle Autoplay Policy
      if (ctx.state === 'suspended') {
        ctx.resume().catch((e) => logger.warn('AUDIO', 'Failed to resume AudioContext', e));
      }

      const masterGain = ctx.createGain();
      masterGain.gain.value = 0; // Start silent
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      // C Major 9th Chord (Spread Voicing) - Warmer, lower register
      // Frequencies: C3=130.81, G3=196.00, D4=293.66, E4=329.63, G4=392.00
      const frequencies = [130.81, 196.00, 293.66, 329.63, 392.00];
      
      const now = ctx.currentTime;

      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        // Slight detune for warmth
        const detune = (Math.random() - 0.5) * 10;
        osc.detune.value = detune;

        const oscGain = ctx.createGain();
        oscGain.gain.value = 0.15; // Individual volume

        osc.connect(oscGain);
        oscGain.connect(masterGain);

        osc.start(now);
        // Extend stop time to allow for full fade out (envelope ends at 6s)
        osc.stop(now + 6.5 + (index * 0.1)); 
        
        oscillatorsRef.current.push(osc);
      });

      // Envelope: Very gentle swelling fade in and out (adjusted for softness)
      // Attack: 3s (very slow build)
      // Sustain: 1s
      // Release: 2s
      masterGain.gain.setValueAtTime(0, now);
      // Use exponential ramp for more natural "fade in" feeling, avoiding sudden onset
      // We start at 0.001 because exponential ramp cannot start at 0
      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.gain.exponentialRampToValueAtTime(0.15, now + 3.0); // Slow swell to low volume
      masterGain.gain.setValueAtTime(0.15, now + 4.0); // Short hold
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 6.0); // Slow fade out

      logger.info('AUDIO', 'Playing waking sound');

    } catch (e) {
      logger.error('AUDIO', 'Failed to play waking sound', e as Error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        oscillatorsRef.current = [];
      }
    };
  }, []);

  return { playWakingSound };
}
