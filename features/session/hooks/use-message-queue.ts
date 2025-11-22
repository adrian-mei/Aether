import { useRef, useCallback, useEffect } from 'react';

interface UseMessageQueueProps {
  onSpeak: (text: string, options: { autoResume?: boolean }) => Promise<void>;
}

export function useMessageQueue({ onSpeak }: UseMessageQueueProps) {
  const bufferRef = useRef<string>('');
  const queueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef<boolean>(false);
  const isStreamActiveRef = useRef<boolean>(false);
  const processQueueRef = useRef<() => Promise<void>>(async () => {});

  const processQueue = useCallback(async () => {
    if (isSpeakingRef.current) return;

    if (queueRef.current.length === 0) {
        if (!isStreamActiveRef.current && bufferRef.current.trim()) {
             // Flush remainder
             const text = bufferRef.current.trim();
             bufferRef.current = '';
             isSpeakingRef.current = true;
             await onSpeak(text, { autoResume: true });
             isSpeakingRef.current = false;
        }
        return;
    }

    isSpeakingRef.current = true;
    const text = queueRef.current.shift()!;
    
    // Determine if this is the absolute last chunk
    const isLast = !isStreamActiveRef.current && queueRef.current.length === 0 && !bufferRef.current.trim();
    
    await onSpeak(text, { autoResume: isLast });
    
    isSpeakingRef.current = false;
    processQueueRef.current();
  }, [onSpeak]);

  useEffect(() => {
    processQueueRef.current = processQueue;
  }, [processQueue]);

  const handleChunk = useCallback((chunk: string) => {
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
        }
    }
    
    newBuffer = parts[parts.length - 1];
    bufferRef.current = newBuffer;
    processQueue();
  }, [processQueue]);

  const startStream = useCallback(() => {
    bufferRef.current = '';
    queueRef.current = [];
    isSpeakingRef.current = false;
    isStreamActiveRef.current = true;
  }, []);

  const endStream = useCallback(() => {
    isStreamActiveRef.current = false;
    processQueue(); // Flush any remainders
  }, [processQueue]);

  return {
    handleChunk,
    startStream,
    endStream,
  };
}
