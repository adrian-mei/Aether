import { useState, useCallback, useEffect, useRef } from 'react';
import { useVoiceAgent, VoiceAgentState } from '@/features/voice/hooks/use-voice-agent';
import { streamChatCompletion, ChatMessage } from '@/features/ai/services/chat-service';
import { requestMicrophonePermission, PermissionStatus } from '@/features/voice/utils/permissions';
import { isBrowserSupported, isSecureContext } from '@/features/voice/utils/browser-support';
import { logger } from '@/shared/lib/logger';

type SessionStatus = 'idle' | 'running' | 'unsupported' | 'insecure-context';

export function useSessionManager() {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('idle');
  
  const historyRef = useRef<ChatMessage[]>([]);
  const speakRef = useRef<(text: string) => void>(() => {});

  const handleInputComplete = useCallback(async (text: string) => {
    const userMessage: ChatMessage = { role: 'user', content: text };
    const newHistory = [...historyRef.current, userMessage];
    historyRef.current = newHistory;

    try {
      const assistantMessageText = await streamChatCompletion(newHistory);
      historyRef.current = [...newHistory, { role: 'assistant', content: assistantMessageText }];
      
      if (assistantMessageText.trim()) {
        speakRef.current(assistantMessageText);
      } else {
        logger.warn('SESSION', 'Empty response received');
        speakRef.current("I'm sorry, I didn't catch that.");
      }
    } catch (e) {
      speakRef.current("I'm having trouble connecting. Please try again.");
    }
  }, []);

  const { state: voiceState, startListening, stopListening, reset, speak, toggleMute } = useVoiceAgent(handleInputComplete);

  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

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

  useEffect(() => {
    logger.info('APP', 'Session manager initialized.');
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
  }, []);

  const handleStartSession = async () => {
    if (status === 'unsupported') return;

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
    if (voiceState === 'idle') {
      startListening();
    } else if (voiceState === 'listening') {
      stopListening();
    }
  };

  const toggleDebug = () => {
    const isEnabled = localStorage.getItem('aether_debug') === 'true';
    const newState = !isEnabled;
    logger.toggleDebug(newState);
    setIsDebugOpen(newState);
  };

  useEffect(() => {
    setIsDebugOpen(localStorage.getItem('aether_debug') === 'true');
  }, []);

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
      toggleMute,
      onRetryPermission: handleStartSession,
    },
  };
}
