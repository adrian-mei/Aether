import { useState, useEffect, useRef } from 'react';

export const useTypewriter = (text: string | undefined, speed: number = 30, delay: number = 0) => {
  const [displayedText, setDisplayedText] = useState('');

  // Keep track of the latest target text without triggering re-renders of the interval
  const targetTextRef = useRef(text || '');

  // Update ref when prop changes
  useEffect(() => {
    targetTextRef.current = text || '';

    // If text is cleared, reset display immediately
    if (!text) {
      setDisplayedText('');
    }
  }, [text]);

  useEffect(() => {
    // If delay is provided, we could use setTimeout, but for streaming
    // it's better to just let the interval handle "chasing".
    // We'll respect delay only for the initial mount if needed, but
    // usually we want immediate response to streaming.

    const intervalId = setInterval(() => {
      setDisplayedText((current) => {
        const target = targetTextRef.current;

        // 1. If we match, do nothing
        if (current === target) return current;

        // 2. Find common prefix (case-insensitive)
        let i = 0;
        const minLen = Math.min(current.length, target.length);
        while (i < minLen && current[i].toLowerCase() === target[i].toLowerCase()) {
            i++;
        }

        // 3. If current has diverged (or is longer), snap back to the common prefix
        // This handles corrections/deletions gracefully by "backspacing" instantly to the stable part
        if (current.length > i) {
             return target.slice(0, i);
        }

        // 4. Otherwise, we are safe to append the next character
        return target.slice(0, current.length + 1);
      });
    }, speed);

    return () => clearInterval(intervalId);
  }, [speed]); // Only re-run if speed changes

  return displayedText;
};

/**
 * Audio-synced typewriter hook that dynamically adjusts speed based on audio duration.
 * Uses requestAnimationFrame for jitter-free, premium animation experience.
 *
 * @param text - The text to display
 * @param audioDuration - Duration of the audio in seconds (if available)
 * @param baseSpeed - Default speed in ms per character if no audio duration provided
 */
export const useTypewriterWithAudioSync = (
  text: string | undefined,
  audioDuration?: number,
  baseSpeed: number = 30
) => {
  const [displayedText, setDisplayedText] = useState('');
  const targetTextRef = useRef(text || '');
  const animationSpeedRef = useRef(baseSpeed);
  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);

  // Calculate optimal speed based on audio duration
  useEffect(() => {
    const textLength = (text || '').length;
    if (audioDuration && textLength > 0) {
      // Calculate speed to match audio duration: (duration in ms) / textLength
      const calculatedSpeed = (audioDuration * 1000) / textLength;

      // Clamp between min/max for readability
      const MIN_SPEED = 15;   // Don't go faster than user input (66 chars/sec)
      const MAX_SPEED = 100;  // Don't go slower than this (10 chars/sec)
      animationSpeedRef.current = Math.max(MIN_SPEED, Math.min(MAX_SPEED, calculatedSpeed));
    } else {
      animationSpeedRef.current = baseSpeed;
    }
  }, [text, audioDuration, baseSpeed]);

  // Update target text ref when prop changes
  useEffect(() => {
    targetTextRef.current = text || '';
    if (!text) {
      setDisplayedText('');
      accumulatedTimeRef.current = 0;
    }
  }, [text]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    accumulatedTimeRef.current = 0;

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      accumulatedTimeRef.current += deltaTime;

      // Only update when enough time has passed for the next character
      if (accumulatedTimeRef.current >= animationSpeedRef.current) {
        accumulatedTimeRef.current = 0; // Reset accumulator

        setDisplayedText((current) => {
          const target = targetTextRef.current;

          // 1. If we match, do nothing
          if (current === target) return current;

          // 2. Find common prefix (case-insensitive)
          let i = 0;
          const minLen = Math.min(current.length, target.length);
          while (i < minLen && current[i].toLowerCase() === target[i].toLowerCase()) {
            i++;
          }

          // 3. If current has diverged (or is longer), snap back to the common prefix
          // This handles corrections/deletions gracefully by "backspacing" instantly to the stable part
          if (current.length > i) {
            return target.slice(0, i);
          }

          // 4. Otherwise, we are safe to append the next character
          return target.slice(0, current.length + 1);
        });
      }

      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []); // Empty deps - use refs for dynamic values

  return displayedText;
};
