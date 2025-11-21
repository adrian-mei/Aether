import { useEffect, useRef, useState, useCallback } from 'react';

export function useOceanSound(initialVolume = 0.05) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const initAudio = useCallback(() => {
    if (audioContextRef.current) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioContextRef.current = ctx;

    // Create Pink Noise
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Compensate for gain loss
    }

    // Create Source
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Create Filter (Lowpass)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1;

    // Create LFO for wave motion
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1; // 10 seconds per wave cycle

    // Modulate filter frequency
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 400; // Modulation depth
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    filter.frequency.value = 500; // Base frequency

    // Master Gain
    const masterGain = ctx.createGain();
    masterGain.gain.value = initialVolume;
    gainNodeRef.current = masterGain;

    // Connect graph
    noiseSource.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Start generators
    noiseSource.start();
    lfo.start();
  }, [initialVolume]);

  const play = useCallback(async () => {
    if (!audioContextRef.current) {
      initAudio();
    }
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    // Fade in
    if (gainNodeRef.current) {
        const now = audioContextRef.current!.currentTime;
        gainNodeRef.current.gain.cancelScheduledValues(now);
        gainNodeRef.current.gain.setValueAtTime(0, now);
        gainNodeRef.current.gain.linearRampToValueAtTime(initialVolume, now + 2);
    }
    setIsPlaying(true);
  }, [initAudio, initialVolume]);

  const pause = useCallback(() => {
    if (gainNodeRef.current && audioContextRef.current) {
        const now = audioContextRef.current.currentTime;
        gainNodeRef.current.gain.cancelScheduledValues(now);
        gainNodeRef.current.gain.linearRampToValueAtTime(0, now + 2);
        setTimeout(() => {
            if (audioContextRef.current?.state === 'running') {
                audioContextRef.current.suspend();
            }
            setIsPlaying(false);
        }, 2000);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { play, pause, isPlaying };
}
