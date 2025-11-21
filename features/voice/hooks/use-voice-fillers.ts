import { useState, useCallback, useRef } from 'react';
import { kokoroService, AudioGenerationResult } from '@/features/voice/services/kokoro-service';
import { FILLER_PHRASES, FillerCategory } from '@/features/voice/config/fillers';
import { logger } from '@/shared/lib/logger';

interface FillerCacheItem {
  text: string;
  buffer: AudioGenerationResult;
}

export function useVoiceFillers() {
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioCache = useRef<Map<string, FillerCacheItem>>(new Map());
  const isGenerating = useRef(false);

  const generateFillers = useCallback(async () => {
    if (isGenerating.current) return;
    isGenerating.current = true;
    
    logger.info('FILLERS', 'Starting filler generation...', { count: FILLER_PHRASES.length });
    
    let loadedCount = 0;
    const total = FILLER_PHRASES.length;

    // Initialize service first if needed
    await kokoroService.initialize();

    // Process sequentially or in small batches to avoid overwhelming the worker
    // Sequential is safer for now to avoid race conditions in the single-threaded worker bridge
    for (const filler of FILLER_PHRASES) {
      if (audioCache.current.has(filler.text)) {
        loadedCount++;
        continue;
      }

      try {
        const result = await kokoroService.generateAudio(filler.text);
        audioCache.current.set(filler.text, {
          text: filler.text,
          buffer: result
        });
        
        loadedCount++;
        setProgress(Math.round((loadedCount / total) * 100));
      } catch (error) {
        logger.error('FILLERS', `Failed to generate filler: "${filler.text}"`, error);
      }
    }

    setIsReady(true);
    isGenerating.current = false;
    logger.info('FILLERS', 'Filler generation complete');
  }, []);

  const playRandomFiller = useCallback(async (category?: FillerCategory) => {
    if (audioCache.current.size === 0) return;

    // Filter candidates
    let candidates = FILLER_PHRASES;
    if (category) {
      candidates = candidates.filter(f => f.category === category);
    }

    // If filter leaves no results, fallback to all
    if (candidates.length === 0) candidates = FILLER_PHRASES;

    // Weighted random selection
    // Simple version: Just pick random for now, weights can be added later
    const selection = candidates[Math.floor(Math.random() * candidates.length)];
    const cached = audioCache.current.get(selection.text);

    if (cached) {
        logger.info('FILLERS', `Playing filler: "${selection.text}"`);
        await kokoroService.playAudioBuffer(cached.buffer.audio, cached.buffer.sampleRate);
    }
  }, []);

  return {
    isReady,
    progress,
    generateFillers,
    playRandomFiller
  };
}
