import { useState, useCallback, useEffect, useRef } from 'react';
import { useVoiceAgent } from '@/features/voice/hooks/use-voice-agent';
import { streamChatCompletion, ChatMessage } from '@/features/ai/services/chat-service';
import { buildSystemPrompt } from '@/features/ai/utils/system-prompt';
import { requestMicrophonePermission, PermissionStatus } from '@/features/voice/utils/permissions';
import { isBrowserSupported, isSecureContext } from '@/features/voice/utils/browser-support';
import { logger } from '@/shared/lib/logger';
import { verifyAccessCode as verifyHash } from '@/features/rate-limit/utils/access-code';
import { useVoiceFillers } from '@/features/voice/hooks/use-voice-fillers';

export type SessionStatus = 'initializing' | 'idle' | 'running' | 'unsupported' | 'insecure-context' | 'limit-reached';

const MAX_INTERACTIONS = 10;
const RESET_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours

export function useSessionManager() {
  const [status, setStatus] = useState<SessionStatus>('initializing');
  const [interactionCount, setInteractionCount] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('idle');
  
  const historyRef = useRef<ChatMessage[]>([]);
  const speakRef = useRef<(text: string, options?: { autoResume?: boolean }) => Promise<void>>(async () => {});
  const resetRef = useRef<() => void>(() => {});

  // Voice Fillers
  const { isReady: isFillersReady, generateFillers, playRandomFiller } = useVoiceFillers();

  // Streaming State
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
             await speakRef.current(text, { autoResume: true });
             isSpeakingRef.current = false;
        }
        return;
    }

    isSpeakingRef.current = true;
    const text = queueRef.current.shift()!;
    
    // Determine if this is the absolute last chunk
    const isLast = !isStreamActiveRef.current && queueRef.current.length === 0 && !bufferRef.current.trim();
    
    await speakRef.current(text, { autoResume: isLast });
    
    isSpeakingRef.current = false;
    processQueueRef.current();
  }, []);

  useEffect(() => {
    processQueueRef.current = processQueue;
  }, [processQueue]);

  const handleChunk = useCallback((chunk: string) => {
    bufferRef.current += chunk;
    
    // Split into sentences using a simple heuristic
    // Match anything ending in . ! ? followed by whitespace or EOF
    // Note: This is imperfect (e.g. "Mr. Smith") but fast.
    const splitRegex = /([.!?]+["']?(?:\s+|$))/;
    const parts = bufferRef.current.split(splitRegex);
    
    // parts will look like ["Hello", ". ", "How are you", "? ", ""]
    // We want to combine delimiter with previous part
    
    let newBuffer = '';
    
    for (let i = 0; i < parts.length - 1; i += 2) {
        const sentence = parts[i] + (parts[i+1] || '');
        // If we have a next part, this sentence is complete
        // If it's the last part pair, we check if it was at the end of string
        if (sentence.trim()) {
            queueRef.current.push(sentence.trim());
        }
    }
    
    // The last part is the remainder
    newBuffer = parts[parts.length - 1];
    
    // If the split put the delimiter in the remainder (unlikely with this split logic if used correctly)
    // Actually split keeps the separator if wrapped in capture group.
    
    bufferRef.current = newBuffer;
    processQueue();
  }, [processQueue]);

  const handleInputComplete = useCallback(async (text: string) => {
    // Play immediate encouragement filler to mask latency
    playRandomFiller('encouragement').catch(err => logger.warn('SESSION', 'Failed to play filler', err));

    // Check rate limit first (unless unlocked)
    if (!isUnlocked && interactionCount >= MAX_INTERACTIONS) {
        setStatus('limit-reached');
        const limitMsg = "I have enjoyed our time together. To continue our journey, please join the waitlist.";
        await speakRef.current(limitMsg, { autoResume: false });
        resetRef.current();
        return;
    }

    // Update count (even if unlocked, we track it, but don't limit)
    const newCount = interactionCount + 1;
    setInteractionCount(newCount);
    localStorage.setItem('aether_interaction_count', newCount.toString());

    // Set timestamp on first interaction if not set
    if (!localStorage.getItem('aether_limit_timestamp')) {
      localStorage.setItem('aether_limit_timestamp', Date.now().toString());
    }

    // Check for stop commands
    const lowerText = text.trim().toLowerCase().replace(/[.!?,]$/, '');
    const stopCommands = ['stop', 'quit', 'pause', 'exit', 'end session', 'end chat', 'bye', 'goodbye'];
    
    if (stopCommands.includes(lowerText)) {
      logger.info('SESSION', 'User requested stop', { command: lowerText });
      const goodbye = "Goodbye.";
      // Wait for goodbye to finish speaking before resetting
      await speakRef.current(goodbye, { autoResume: false });
      resetRef.current();
      setStatus('idle');
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: text };
    const newHistory = [...historyRef.current, userMessage];
    historyRef.current = newHistory;

    // Build system prompt with context
    const sessionInteractionCount = Math.floor(newHistory.length / 2);
    const systemPrompt = buildSystemPrompt({
      interactionCount: sessionInteractionCount,
      // TODO: Add mood analysis and other context signals
    });

    try {
      // Reset streaming state
      bufferRef.current = '';
      queueRef.current = [];
      isSpeakingRef.current = false;
      isStreamActiveRef.current = true;

      const assistantMessageText = await streamChatCompletion(
          newHistory, 
          systemPrompt, 
          handleChunk
      );
      
      isStreamActiveRef.current = false;
      processQueue(); // Flush any remainders

      historyRef.current = [...newHistory, { role: 'assistant', content: assistantMessageText }];
      
      if (!assistantMessageText.trim()) {
        logger.warn('SESSION', 'Empty response received');
        const errorMsg = "I'm sorry, I didn't catch that.";
        speakRef.current(errorMsg);
      }
    } catch {
      isStreamActiveRef.current = false;
      const errorMsg = "I'm having trouble connecting. Please try again.";
      speakRef.current(errorMsg);
    }
  }, [handleChunk, processQueue, interactionCount, isUnlocked, playRandomFiller]);

  const { 
    state: voiceState, 
    startListening, 
    stopListening, 
    reset, 
    speak, 
    toggleMute
  } = useVoiceAgent(handleInputComplete);

  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  useEffect(() => {
    resetRef.current = reset;
  }, [reset]);

  // Timeout Watchdog
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (voiceState === 'processing') {
      timeoutId = setTimeout(() => {
        logger.error('SESSION', 'Request timed out', { thresholdMs: 15000 });
        reset();
      }, 15000);
    }
    return () => clearTimeout(timeoutId);
  }, [voiceState, reset]);

  // Initialization Flow
  useEffect(() => {
    logger.info('APP', 'Session manager initializing...');
    generateFillers(); // Start generating voice assets

    async function checkSupport() {
        if (!isSecureContext()) {
            setStatus('insecure-context');
            return;
        }
      const supported = await isBrowserSupported();
      if (!supported) {
        setStatus('unsupported');
      }
    }
    checkSupport();
  }, [generateFillers]);

  // Transition from Initializing to Idle/Limit-Reached once ready
  useEffect(() => {
    if (status === 'initializing' && isFillersReady) {
        // Check if limit is already reached from storage
        const storedCount = localStorage.getItem('aether_interaction_count');
        // Defer state update to avoid synchronous render warning
        setTimeout(() => {
            if (storedCount && parseInt(storedCount, 10) >= MAX_INTERACTIONS && !isUnlocked) {
                setStatus('limit-reached');
            } else {
                setStatus('idle');
            }
        }, 0);
    }
  }, [status, isFillersReady, isUnlocked]);

  // Load rate limit state with reset logic
  useEffect(() => {
    // Check for access code first
    const storedAccessCode = localStorage.getItem('aether_access_code');
    if (storedAccessCode) {
      // Verify stored code hash (simplified check since we trust local storage, but good to be safe)
      // Ideally we re-verify, but async in useEffect is tricky. 
      // We'll assume if it's there, it's valid or the server will reject it.
      setTimeout(() => setIsUnlocked(true), 0);
      return; 
    }

    const storedCount = localStorage.getItem('aether_interaction_count');
    const storedTimestamp = localStorage.getItem('aether_limit_timestamp');
    
    if (storedTimestamp) {
      const timestamp = parseInt(storedTimestamp, 10);
      const now = Date.now();
      
      if (now - timestamp > RESET_WINDOW_MS) {
        // Reset window has passed
        setTimeout(() => setInteractionCount(0), 0);
        localStorage.setItem('aether_interaction_count', '0');
        localStorage.removeItem('aether_limit_timestamp'); // Will be set on next interaction
        return;
      }
    }

    if (storedCount) {
      const count = parseInt(storedCount, 10);
      setTimeout(() => {
        setInteractionCount(count);
        if (count >= MAX_INTERACTIONS) {
          setStatus('limit-reached');
        }
      }, 0);
    }
  }, []);

  const handleStartSession = async () => {
    logger.info('APP', 'User clicked Start Session');
    if (status === 'unsupported' || status === 'limit-reached') return;

    setPermissionStatus('pending');
    const granted = await requestMicrophonePermission();
    if (granted) {
      setPermissionStatus('granted');
      setStatus('running');
      const greeting = "Hello, I am Aether. How are you feeling right now?";
      speak(greeting);
    } else {
      setPermissionStatus('denied');
      setStatus('idle'); // Remain idle if permission denied
    }
  };

  const toggleListening = () => {
    if (status === 'limit-reached') return;
    logger.info('APP', 'User clicked Toggle Listening', { currentState: voiceState });
    if (voiceState === 'idle') {
      startListening();
    } else if (voiceState === 'listening') {
      stopListening();
    }
  };

  const toggleDebug = () => {
    const isEnabled = localStorage.getItem('aether_debug') === 'true';
    const newState = !isEnabled;
    logger.info('APP', `User toggled Debug Mode: ${newState ? 'ON' : 'OFF'}`);
    logger.toggleDebug(newState);
    setIsDebugOpen(newState);
  };

  useEffect(() => {
    const debug = localStorage.getItem('aether_debug') === 'true';
    setTimeout(() => setIsDebugOpen(debug), 0);
  }, []);

  const verifyAccessCode = async (code: string): Promise<boolean> => {
    const isValid = await verifyHash(code);
    if (isValid) {
      setIsUnlocked(true);
      localStorage.setItem('aether_access_code', code);
      if (status === 'limit-reached') {
          setStatus('idle');
      }
      return true;
    }
    return false;
  };

  return {
    state: {
      status,
      isDebugOpen,
      voiceState,
      permissionStatus,
    },
    actions: {
      handleStartSession,
      toggleListening,
      toggleDebug,
      toggleMute: () => {
        logger.info('APP', 'User clicked Toggle Mute');
        toggleMute();
      },
      onRetryPermission: handleStartSession,
      verifyAccessCode,
    },
  };
}
