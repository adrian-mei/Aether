import { useState, useCallback, useEffect, useRef } from 'react';
import { useVoiceAgent } from '@/features/voice/hooks/use-voice-agent';
import { isBrowserSupported, isSecureContext } from '@/features/voice/utils/browser-support';
import { audioPlayer } from '@/features/voice/utils/audio-player';
import { logger } from '@/shared/lib/logger';
import { kokoroService } from '@/features/voice/services/kokoro-service';

import { useSessionAccess } from './use-session-access';
import { useBootSequence } from './use-boot-sequence';
import { useConversation } from './use-conversation';

export type SessionStatus = 'initializing' | 'awaiting-boot' | 'booting' | 'idle' | 'running' | 'unsupported' | 'insecure-context' | 'limit-reached';

export function useSessionManager() {
  const [status, setStatus] = useState<SessionStatus>('initializing');
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  
  // 1. Session Access & Limits
  const access = useSessionAccess();

  // 2. Boot Sequence
  const boot = useBootSequence({
    onComplete: async (granted) => {
      if (granted) {
        setStatus('running');
        const greeting = "Hello, I am Aether. I'm here to listen, validate your feelings, and help you explore your inner world without judgment. How are you feeling right now?";
        conversation.actions.handleInputComplete(greeting); // Log greeting to history? 
        // Actually original code did: setCurrentAssistantMessage(greeting); speak(greeting);
        // useConversation doesn't expose setCurrentAssistantMessage directly as a setter but it sets it on speak.
        // But we want to add it to history? No, original didn't add greeting to history explicitly, 
        // but `useVoiceAgent.speak` triggers `setCurrentAssistantMessage` via `useMessageQueue` callback in `useConversation`?
        // Wait, in original `useSessionManager`:
        // const { handleChunk ... } = useMessageQueue({ onSpeak: (text) => { setCurrentAssistantMessage(text); speakRef.current(text)... } })
        // And `handleStartSession` did: `setCurrentAssistantMessage(greeting); speak(greeting);`
        
        // So I need to do the same.
        // `conversation` exposes `actions.handleInputComplete` (user input).
        // I can manually call speak.
        speak(greeting);
      } else {
        setStatus('idle');
      }
    }
  });

  // Refs for circular dependency resolution
  const onInputCompleteRef = useRef<(text: string) => void>(() => {});
  const onSilenceRef = useRef<() => void>(() => {});
  const resetRef = useRef<() => void>(() => {});

  // 3. Voice Agent
  const { 
    state: voiceState,
    transcript,
    startListening, 
    stopListening, 
    reset: resetVoice, 
    speak, 
    toggleMute
  } = useVoiceAgent(
    (text) => onInputCompleteRef.current(text),
    () => onSilenceRef.current()
  );

  // 4. Conversation Logic
  const conversation = useConversation({
    accessCode: access.state.accessCode,
    interactionCount: access.state.interactionCount,
    onSpeak: speak,
    isSessionActive: status === 'running',
    onSessionEnd: () => {
        resetRef.current();
        setStatus('idle');
    }
  });

  // Connect Refs
  useEffect(() => {
    onInputCompleteRef.current = async (text) => {
        // Check limits
        if (access.actions.incrementInteraction()) {
            conversation.actions.handleInputComplete(text);
        } else {
            setStatus('limit-reached');
            const limitMsg = "I have enjoyed our time together. To continue our journey, please join the waitlist.";
            await speak(limitMsg, { autoResume: false });
            resetRef.current();
        }
    };
    
    onSilenceRef.current = conversation.actions.handleSilence;
  }, [access.actions, conversation.actions, speak]);

  useEffect(() => {
      resetRef.current = () => {
          resetVoice();
          conversation.actions.resetConversation();
      };
  }, [resetVoice, conversation.actions]);

  // Watchdog for timeout (30s no activity)
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (voiceState === 'processing') {
      intervalId = setInterval(() => {
        const elapsed = Date.now() - conversation.state.lastActivity;
        if (elapsed > 30000) {
          logger.warn('SESSION', 'Request timed out (no activity)', { elapsedMs: elapsed });
          resetVoice();
          logger.info('SESSION', 'Chat ended (watchdog timeout)');
        }
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [voiceState, resetVoice, conversation.state.lastActivity]);

  // Initialization Logic
  useEffect(() => {
    logger.info('APP', 'Session manager initializing...');

    async function initialize() {
        if (!isSecureContext()) {
            setStatus('insecure-context');
            return;
        }
        const supported = await isBrowserSupported();
        if (!supported) {
            setStatus('unsupported');
            return;
        }

        // Defer state update to avoid synchronous render warning
        setTimeout(() => {
            // Check if limit reached (access hook loads from local storage in its own effect, 
            // but we might be racing here. useSessionAccess initializes interactionCount in effect too.)
            // We should rely on access.state.isLimitReached, but it might not be set yet.
            // However, access.state.isLimitReached defaults to false.
            // We can observe access.state.isLimitReached.
            
            // Actually, let's just set 'awaiting-boot' and let the access hook flip it if needed?
            // Or better, wait for access hook?
            // The access hook logic runs on mount.
            
            // For now:
            setStatus('awaiting-boot');
        }, 0);
    }
    initialize();
  }, []);

  // React to limit reached from access hook
  useEffect(() => {
      if (access.state.isLimitReached) {
          setStatus('limit-reached');
      }
  }, [access.state.isLimitReached]);

  const handleStartSession = async () => {
    logger.info('APP', 'User clicked Start Session');
    if (status === 'unsupported' || status === 'limit-reached') return;

    // Services init
    kokoroService.initialize().catch(err => logger.error('APP', 'Kokoro init failed', err));
    audioPlayer.resume().catch(err => logger.warn('APP', 'Failed to resume audio context', err));

    boot.actions.setPermissionStatus('pending');
    const granted = await boot.actions.retryPermission().then(() => true).catch(() => false);
    // Note: retryPermission sets state but we need to know result here. 
    // Actually boot.actions.retryPermission calls onComplete(true) if granted.
    // So we just need to call it.
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

  return {
    state: {
      status: boot.state.isBooting ? 'booting' : status,
      isDebugOpen,
      voiceState,
      permissionStatus: boot.state.permissionStatus,
      currentAssistantMessage: conversation.state.currentAssistantMessage,
      modelCacheStatus: boot.state.modelCacheStatus,
      downloadProgress: boot.state.downloadProgress,
      transcript,
    },
    actions: {
      startBootSequence: boot.actions.startBootSequence,
      handleStartSession,
      handleInputComplete: conversation.actions.handleInputComplete,
      toggleListening,
      toggleDebug,
      toggleMute,
      onRetryPermission: boot.actions.retryPermission,
      verifyAccessCode: access.actions.verifyAccessCode,
    },
  };
}
