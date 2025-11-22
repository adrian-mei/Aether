import { useState, useCallback, useEffect, useRef } from 'react';
import { useVoiceAgent } from '@/features/voice/hooks/use-voice-agent';
import { streamChatCompletion, ChatMessage } from '@/features/ai/services/chat-service';
import { buildSystemPrompt } from '@/features/ai/utils/system-prompt';
import { requestMicrophonePermission, PermissionStatus } from '@/features/voice/utils/permissions';
import { isBrowserSupported, isSecureContext } from '@/features/voice/utils/browser-support';
import { audioPlayer } from '@/features/voice/utils/audio-player';
import { logger } from '@/shared/lib/logger';
import { verifyAccessCode as verifyHash } from '@/features/rate-limit/utils/access-code';
import { useMessageQueue } from '@/features/session/hooks/use-message-queue';
import { memoryService } from '@/features/memory/services/memory-service';
import { kokoroService } from '@/features/voice/services/kokoro-service';
import { checkModelCache, ModelCacheStatus } from '@/features/voice/utils/model-cache';

export type SessionStatus = 'initializing' | 'awaiting-boot' | 'booting' | 'idle' | 'running' | 'unsupported' | 'insecure-context' | 'limit-reached';

const MAX_INTERACTIONS = 10;
const RESET_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours

export function useSessionManager() {
  const [status, setStatus] = useState<SessionStatus>('initializing');
  const [interactionCount, setInteractionCount] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessCode, setAccessCode] = useState<string>('');
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('idle');
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState<string>('');
  const [modelCacheStatus, setModelCacheStatus] = useState<ModelCacheStatus>('checking');
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const isServicesReadyRef = useRef(false);
  
  const historyRef = useRef<ChatMessage[]>([]);
  const speakRef = useRef<(text: string, options?: { autoResume?: boolean }) => Promise<void>>(async () => {});
  const realDownloadProgressRef = useRef<number>(0);
  const resetRef = useRef<() => void>(() => {});
  const isProcessingRef = useRef(false);
  const lastActivityRef = useRef<number>(0);

  // Message Queue for Streaming
  const { handleChunk, startStream, endStream } = useMessageQueue({
    onSpeak: async (text, options) => {
      setCurrentAssistantMessage(text);
      await speakRef.current(text, options);
    }
  });

  const handleInputComplete = useCallback(async (text: string) => {
    logger.info('SESSION', 'Processing input', { text });

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
      logger.info('SESSION', 'Chat ended (user command)');
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: text };
    const newHistory = [...historyRef.current, userMessage];
    historyRef.current = newHistory;

    // Retrieve relevant memories (async, non-blocking with timeout)
    // Race memory query against a 5s timeout (increased from 3s) to prevent hanging
    const memoryPromise = memoryService.queryRelevant(text, { limit: 5 }).catch((err) => {
        logger.error('SESSION', 'Memory retrieval failed', err);
        return [];
    });
    
    const timeoutPromise = new Promise<any[]>((resolve) => setTimeout(() => {
        logger.warn('SESSION', 'Memory retrieval timed out after 5000ms, skipping');
        resolve([]);
    }, 5000));
    
    const relevantMemories = await Promise.race([memoryPromise, timeoutPromise]);
    
    if (relevantMemories.length > 0) {
        logger.debug('SESSION', 'Retrieved memories', { count: relevantMemories.length });
    }

    // Build system prompt with context and memories
    const sessionInteractionCount = Math.floor(newHistory.length / 2);
    const systemPrompt = buildSystemPrompt({
      interactionCount: sessionInteractionCount,
      relevantMemories: relevantMemories.map(m => m.content),
      // TODO: Add mood analysis and other context signals
    });

    try {
      isProcessingRef.current = true;
      lastActivityRef.current = Date.now();
      startStream();

      logger.debug('SESSION', 'Starting stream completion');
      const assistantMessageText = await streamChatCompletion(
          newHistory, 
          systemPrompt, 
          (chunk) => {
            lastActivityRef.current = Date.now();
            handleChunk(chunk);
          },
          accessCode // Pass ephemeral access code
      );
      
      endStream();
      isProcessingRef.current = false;

      historyRef.current = [...newHistory, { role: 'assistant', content: assistantMessageText }];

      // Extract and store memories (non-blocking)
      memoryService.extractAndStore({
        userMessage: text,
        assistantMessage: assistantMessageText,
        timestamp: Date.now(),
        interactionCount: sessionInteractionCount,
      }).catch((err) => {
        logger.warn('MEMORY', 'Failed to extract memories', err);
      });

      if (!assistantMessageText.trim()) {
        logger.warn('SESSION', 'Empty response received');
        const errorMsg = "I'm sorry, I didn't catch that.";
        speakRef.current(errorMsg);
      }
    } catch {
      endStream();
      isProcessingRef.current = false;
      const errorMsg = "I'm having trouble connecting. Please try again.";
      speakRef.current(errorMsg);
    }
  }, [handleChunk, startStream, endStream, interactionCount, isUnlocked]);

  const handleSilence = useCallback(async () => {
    if (isProcessingRef.current || status !== 'running') return;
    
    logger.info('SESSION', 'User silence detected, re-engaging...');
    
    // Inject a system note into history as a user message to prompt re-engagement
    const silenceMessage: ChatMessage = { 
        role: 'user', 
        content: '(The user has been silent for a while. Gently re-engage them. Suggest a topic, ask about their mood, or just offer presence.)' 
    };
    
    // We add this to history so the AI knows context, but it might look weird if we ever show history UI.
    // For voice-only, it's fine.
    const newHistory = [...historyRef.current, silenceMessage];
    // Don't update historyRef immediately to avoid duplicate processing if user speaks now?
    // Actually we should commit it.
    historyRef.current = newHistory;

    // Retrieve relevant memories for personalized re-engagement
    const relevantMemories = await memoryService.queryRelevant(
      'general conversation topics preferences interests',
      { limit: 3 }
    ).catch(() => []);

    const sessionInteractionCount = Math.floor(newHistory.length / 2);
    const systemPrompt = buildSystemPrompt({
      interactionCount: sessionInteractionCount,
      silenceDuration: 30, // Signal long silence to system prompt builder
      relevantMemories: relevantMemories.map(m => m.content),
    });

    try {
      isProcessingRef.current = true;
      startStream();

      const assistantMessageText = await streamChatCompletion(
          newHistory, 
          systemPrompt, 
          handleChunk
      );
      
      endStream();
      isProcessingRef.current = false;

      historyRef.current = [...newHistory, { role: 'assistant', content: assistantMessageText }];
    } catch (error) {
        logger.error('SESSION', 'Failed to handle silence', error);
        isProcessingRef.current = false;
        endStream();
        // Fallback static message
        const fallback = "I'm here whenever you're ready.";
        setCurrentAssistantMessage(fallback);
        speakRef.current(fallback);
    }
  }, [status, startStream, endStream, handleChunk]);

  const { 
    state: voiceState, 
    startListening, 
    stopListening, 
    reset, 
    speak, 
    toggleMute
  } = useVoiceAgent(handleInputComplete, handleSilence);

  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  useEffect(() => {
    resetRef.current = reset;
  }, [reset]);

  // Timeout Watchdog
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (voiceState === 'processing') {
      lastActivityRef.current = Date.now();
      intervalId = setInterval(() => {
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed > 30000) {
          logger.warn('SESSION', 'Request timed out (no activity)', { elapsedMs: elapsed });
          reset();
          logger.info('SESSION', 'Chat ended (watchdog timeout)');
        }
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [voiceState, reset]);

  // Subscribe to Kokoro progress events
  useEffect(() => {
      kokoroService.onProgress((progress, text) => {
          realDownloadProgressRef.current = progress;
          // If waiting for download, update state (but handled by loop now)
          logger.debug('SESSION', 'Download progress', { progress, text });
      });
  }, []);

  // Initialization Flow
  useEffect(() => {
    logger.info('APP', 'Session manager initializing...');

    async function initialize() {
        // Check model cache in parallel
        checkModelCache().then(status => {
            setModelCacheStatus(status);
            logger.info('SESSION', 'Model cache status', { status });
        });

        if (!isSecureContext()) {
            setStatus('insecure-context');
            return;
        }
      const supported = await isBrowserSupported();
      if (!supported) {
        setStatus('unsupported');
        return;
      }

      // Ready - Check state
      // We no longer check localStorage for access code (session-only unlock)
      const storedCount = localStorage.getItem('aether_interaction_count');

      // Defer state update to avoid synchronous render warning
      setTimeout(() => {
          if (storedCount && parseInt(storedCount, 10) >= MAX_INTERACTIONS) {
              setStatus('limit-reached');
              logger.info('SESSION', 'Session limit reached on startup');
          } else {
              // Instead of idle, we wait for user to tap (Trademark Boot Sequence)
              setStatus('awaiting-boot');
          }
      }, 0);
    }
    initialize();
  }, []);

  // Load rate limit state with reset logic
  useEffect(() => {
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

  const startBootSequence = async () => {
      if (status !== 'awaiting-boot') return;
      
      setStatus('booting');
      setDownloadProgress(0);
      logger.info('SESSION', 'Starting boot sequence');

      // 1. Request Permission Immediately (User Gesture)
      setPermissionStatus('pending');
      // We purposefully don't await here, so animation starts. We await at the end.
      const permissionPromise = requestMicrophonePermission();

      // 2. Start initializing services
      const initPromise = kokoroService.initialize()
        .then(() => { isServicesReadyRef.current = true; })
        .catch(err => {
            logger.error('APP', 'Kokoro init failed', err);
            isServicesReadyRef.current = true;
        });
      memoryService.initialize().catch(err => logger.error('APP', 'Memory init failed', err));
      
      // 3. Initialize audio context
      audioPlayer.resume().catch(err => logger.warn('APP', 'Failed to resume audio context', err));

      // 4. Run Animation Loop
      const TARGET_DURATION = 8000;
      const UPDATE_INTERVAL = 50;
      const startTime = Date.now();

      const interval = setInterval(async () => {
          const elapsed = Date.now() - startTime;
          let virtualProgress = (elapsed / TARGET_DURATION) * 100;
          
          // Wait for services at 99%
          if (virtualProgress > 99 && !isServicesReadyRef.current) {
              virtualProgress = 99;
          }

          if (virtualProgress > 100) virtualProgress = 100;
          setDownloadProgress(virtualProgress);

          if (virtualProgress >= 100 && isServicesReadyRef.current) {
              clearInterval(interval);
              
              // 5. Auto-Start Session
              try {
                  const granted = await permissionPromise;
                  if (granted) {
                      setPermissionStatus('granted');
                      setStatus('running');
                      const greeting = "Hello, I am Aether. I'm here to listen, validate your feelings, and help you explore your inner world without judgment. How are you feeling right now?";
                      setCurrentAssistantMessage(greeting);
                      speak(greeting);
                  } else {
                      setPermissionStatus('denied');
                      setStatus('idle'); // Fallback to manual start if denied
                  }
              } catch (e) {
                  logger.error('SESSION', 'Auto-start failed', e);
                  setStatus('idle');
              }
          }
      }, UPDATE_INTERVAL);
  };

  const handleStartSession = async () => {
    logger.info('APP', 'User clicked Start Session');
    if (status === 'unsupported' || status === 'limit-reached') return;

    // Services should be initialized by boot sequence, but safety check
    kokoroService.initialize().catch(err => logger.error('APP', 'Kokoro init failed', err));
    
    // Initialize/Resume AudioContext on user interaction to unlock audio on mobile
    audioPlayer.resume().catch(err => {
        logger.warn('APP', 'Failed to resume audio context', err);
    });

    setPermissionStatus('pending');
    const granted = await requestMicrophonePermission();
    if (granted) {
      setPermissionStatus('granted');
      setStatus('running');
      const greeting = "Hello, I am Aether. I'm here to listen, validate your feelings, and help you explore your inner world without judgment. How are you feeling right now?";
      setCurrentAssistantMessage(greeting);
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
      setAccessCode(code); // Store in memory only
      // localStorage.setItem('aether_access_code', code); // REMOVED: Session-only persistence
      if (status === 'limit-reached') {
          setStatus('idle');
      }
      logger.info('SESSION', 'Access code verified successfully');
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
      currentAssistantMessage,
      modelCacheStatus,
      downloadProgress,
    },
    actions: {
      startBootSequence,
      handleStartSession,
      handleInputComplete, // Exposed for debugging
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
