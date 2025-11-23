import { useRef, useCallback, useEffect } from 'react';
import { logger } from '@/shared/lib/logger';

interface UseMessageQueueProps {
  onSpeak: (text: string, options: { autoResume?: boolean; waitForPlayback?: boolean }) => Promise<void>;
  shouldBuffer?: boolean;
}

export function useMessageQueue({ onSpeak, shouldBuffer = false }: UseMessageQueueProps) {
  const bufferRef = useRef<string>('');
  const queueRef = useRef<string[]>([]);
  const fullResponseBufferRef = useRef<string>(''); // For buffered mode
  const isSpeakingRef = useRef<boolean>(false);
  const isStreamActiveRef = useRef<boolean>(false);
  const processQueueRef = useRef<() => Promise<void>>(async () => {});

  const processQueue = useCallback(async () => {
    // If we are in "Buffer Mode" (Mobile), we do NOT process the queue incrementally.
    // We wait until the stream ends to flush the whole thing.
    if (shouldBuffer) return;

    if (isSpeakingRef.current) return;

    if (queueRef.current.length === 0) {
        if (!isStreamActiveRef.current && bufferRef.current.trim()) {
             // Flush remainder
             const text = bufferRef.current.trim();
             logger.debug('QUEUE', 'Flushing buffer remainder', { text });
             bufferRef.current = '';
             isSpeakingRef.current = true;
             // Last chunk must wait for playback
             await onSpeak(text, { autoResume: true, waitForPlayback: true });
             isSpeakingRef.current = false;
        }
        return;
    }

    isSpeakingRef.current = true;
    const text = queueRef.current.shift()!;
    
    // Determine if this is the absolute last chunk
    const isLast = !isStreamActiveRef.current && queueRef.current.length === 0 && !bufferRef.current.trim();
    
    logger.debug('QUEUE', 'Processing sentence', { text, isLast });
    
    // Pipeline Optimization:
    // If it's NOT the last chunk, we don't wait for playback to finish.
    // This allows the engine to start generating the next chunk immediately.
    await onSpeak(text, { autoResume: isLast, waitForPlayback: isLast });
    
    isSpeakingRef.current = false;
    processQueueRef.current();
  }, [onSpeak, shouldBuffer]);

  useEffect(() => {
    processQueueRef.current = processQueue;
  }, [processQueue]);

  const handleChunk = useCallback((chunk: string) => {
    if (shouldBuffer) {
        // Mobile Flow: Just accumulate everything
        fullResponseBufferRef.current += chunk;
        return; // Don't process queue yet
    }

    // Desktop Flow: Stream incrementally
    bufferRef.current += chunk;
    
    // Split into sentences using a simple heuristic
    // Match anything ending in . ! ? followed by whitespace or EOF
    const splitRegex = /([.!?]+["']?(?:\s+|$))/;
    const parts = bufferRef.current.split(splitRegex);
    
    let newBuffer = '';
    
    for (let i = 0; i < parts.length - 1; i += 2) {
        const sentence = parts[i] + (parts[i+1] || '');
        if (sentence.trim()) {
            queueRef.current.push(sentence.trim());
            logger.debug('QUEUE', 'Sentence detected and queued', { sentence: sentence.trim() });
        }
    }
    
    newBuffer = parts[parts.length - 1];
    bufferRef.current = newBuffer;
    processQueue();
  }, [processQueue, shouldBuffer]);

  const startStream = useCallback(() => {
    bufferRef.current = '';
    fullResponseBufferRef.current = '';
    queueRef.current = [];
    isSpeakingRef.current = false;
    isStreamActiveRef.current = true;
    logger.info('QUEUE', 'Stream started', { mode: shouldBuffer ? 'BUFFERED (Mobile)' : 'STREAMING (Desktop)' });
  }, [shouldBuffer]);

  const endStream = useCallback(async () => {
    isStreamActiveRef.current = false;
    
    if (shouldBuffer) {
        // Flush the entire response as one utterance
        const text = fullResponseBufferRef.current.trim();
        if (text) {
            logger.info('QUEUE', 'Flushing full buffered response', { length: text.length });
            // Buffered responses always wait for playback to ensure stability
            await onSpeak(text, { autoResume: true, waitForPlayback: true });
        }
        fullResponseBufferRef.current = '';
    } else {
        processQueue(); // Flush any remainders
    }
  }, [processQueue, shouldBuffer, onSpeak]);

  return {
    handleChunk,
    startStream,
    endStream,
  };
}
