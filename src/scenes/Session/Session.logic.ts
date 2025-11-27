import { useState, useCallback, useEffect, useRef } from 'react';
import { logger, ConversationEvents } from '@/shared/lib/logger';
import { ApiClient } from '@/shared/lib/api-client';
import { audioPlayer } from '@/shared/utils/voice/audio-player';
import { getOrCreateClientId } from '@/shared/utils/client-id';
import { useSessionAccess } from './hooks/use-session-access';
import { useRealtimeSession } from './hooks/use-realtime-session';
import { saveConversation, loadConversation } from '@/shared/utils/conversation-storage';

export type SessionStatus = 'initializing' | 'idle' | 'connecting' | 'connected' | 'error' | 'unsupported' | 'insecure-context' | 'limit-reached' | 'offline';
export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';
export type TextSource = 'user' | 'ai' | 'system';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function useSessionManager() {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  
  // Unified Text State
  const [activeText, setActiveText] = useState('');
  const [activeTextSource, setActiveTextSource] = useState<TextSource>('system');

  const [transcript, setTranscript] = useState(''); // Keep for logic/logging
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState(''); // Keep for history/logic
  const [messageHistory, setMessageHistory] = useState<Message[]>([]);
  const [currentMessageDuration, setCurrentMessageDuration] = useState(0);
  const [currentChunkDuration, setCurrentChunkDuration] = useState<number | undefined>(undefined); // Audio chunk duration for text sync
  const [turnCount, setTurnCount] = useState(0);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const hasPlayedWelcome = useRef(false);
  
  // Access control (Keep for now as basic auth)
  const access = useSessionAccess();
  
  // Realtime Session Logic
  useRealtimeSession({
    status,
    sessionId,
    setVoiceState,
    setTranscript,
    setCurrentAssistantMessage,
    setCurrentMessageDuration,
    setCurrentChunkDuration,
    setActiveText,
    setActiveTextSource,
    onLimitReached: () => {
        setStatus('limit-reached');
        // Play rate limit guidance
        audioPlayer.playFromUrl('/api/tts/preloaded/limit_reached', {
            onStart: (text, duration) => {
                if (text) {
                    setActiveText(text);
                    setActiveTextSource('system');
                    if (duration) setCurrentMessageDuration(duration);
                }
            }
        });
    }
  });

  // Play welcome message on first connection
  // Note: Backend sends welcome message automatically via WebSocket.
  // We don't need to fetch it here to avoid double playback.
  useEffect(() => {
    if (status === 'connected' && !hasPlayedWelcome.current) {
      hasPlayedWelcome.current = true;
      // Backend handles welcome message
    }
  }, [status]);

  // Debug state persistence
  useEffect(() => {
    const storedDebug = localStorage.getItem('aether_debug') === 'true';
    setIsDebugOpen(storedDebug);
    logger.toggleDebug(storedDebug);

    // Load conversation from storage
    const storedConversation = loadConversation();
    if (storedConversation) {
      setMessageHistory(storedConversation);
    }
  }, []);

  // Save conversation to storage
  useEffect(() => {
    if (messageHistory.length > 0) {
      saveConversation(messageHistory);
    }
  }, [messageHistory]);

  const handleStartSession = useCallback(async () => {
    logger.info('APP', 'Starting session');
    logger.logConversation(ConversationEvents.SESSION_STARTED);
    setStatus('connecting');

    try {
      const clientId = getOrCreateClientId();
      const response = await ApiClient.post('/session', {
        timestamp: Date.now(),
        client: 'web-ui',
        clientId,
      });

      if (response.status === 503) {
        setStatus('offline');
        return;
      }

      if (response.status === 429) {
        setStatus('limit-reached');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setStatus('connected');
        setSessionId(data.id);
        logger.logConversation(ConversationEvents.SESSION_CONNECTED, data.id);
      } else {
        // Log the error and update status without throwing
        logger.error('APP', 'Failed to start session', await response.text());
        setStatus('error');
      }
    } catch (e) {
      logger.error('APP', 'Failed to start session', e);
      setStatus('error');
    }
  }, []);

  const toggleListening = useCallback(async () => {
    if (status !== 'connected') return;
    
    // Manual override: If speaking or processing, stop.
    if (voiceState === 'speaking' || voiceState === 'processing') {
        setVoiceState('idle');
        return;
    }

    // Start listening
    if (voiceState === 'idle') {
        setVoiceState('listening');
        setTranscript(''); 
    } else {
    // If listening, stop -> processing
    setVoiceState('processing');
  }
}, [status, voiceState]);

  const toggleDebug = useCallback(() => {
  setIsDebugOpen(prev => {
    const newState = !prev;
        localStorage.setItem('aether_debug', String(newState));
        logger.toggleDebug(newState);
        return newState;
    });
  }, []);

  const syncConversation = useCallback(async () => {
    if (messageHistory.length > 0) {
      try {
        await ApiClient.post('/session/analyze', { messages: messageHistory });
      } catch (error) {
        logger.error('APP', 'Failed to sync conversation', error);
      }
    }
  }, [messageHistory]);

  useEffect(() => {
    return () => {
      syncConversation();
    };
  }, [syncConversation]);

  return {
      state: {
      status,
      voiceState,
      activeText,
      activeTextSource,
      transcript,
      permissionStatus: 'granted' as const, // Mock
      currentAssistantMessage,
      currentMessageDuration,
      currentChunkDuration,
      turnCount,
      tokenUsage: { totalTokens: 0 },
      isDebugOpen,
      isMobileFlow: false
    },
    actions: {
      handleStartSession,
      toggleListening,
      toggleDebug,
      verifyAccessCode: access.actions.verifyAccessCode,
    },
  };
}
