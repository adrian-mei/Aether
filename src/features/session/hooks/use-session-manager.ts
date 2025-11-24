import { useState, useCallback, useEffect } from 'react';
import { logger } from '@/shared/lib/logger';
import { ApiClient } from '@/shared/lib/api-client';
import { useSessionAccess } from './access/use-session-access';

export type SessionStatus = 'initializing' | 'idle' | 'connecting' | 'connected' | 'error' | 'unsupported' | 'insecure-context' | 'limit-reached';
export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export function useSessionManager() {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  
  // Access control (Keep for now as basic auth)
  const access = useSessionAccess();

  // Debug state persistence
  useEffect(() => {
    const storedDebug = localStorage.getItem('aether_debug') === 'true';
    setIsDebugOpen(storedDebug);
    logger.toggleDebug(storedDebug);
  }, []);

  const handleStartSession = useCallback(async () => {
    logger.info('APP', 'Starting session (UI only mode)');
    setStatus('connecting');
    
    try {
      // Use Mock API
      await ApiClient.post('/session/start', { 
        timestamp: Date.now(),
        client: 'web-ui' 
      });
      
      setStatus('connected');
    } catch (e) {
      logger.error('APP', 'Failed to start session', e);
      setStatus('error');
    }
  }, []);

  const toggleListening = useCallback(async () => {
    if (status !== 'connected') return;
    
    // Calculate next state
    let nextState: VoiceState = 'listening';
    if (voiceState === 'listening') nextState = 'processing';
    else if (voiceState === 'processing') nextState = 'speaking';
    else if (voiceState === 'speaking') nextState = 'idle';

    // Log the state change via Mock API
    ApiClient.post('/voice/state', { 
      previousState: voiceState,
      nextState: nextState 
    }).catch(console.error);

    setVoiceState(nextState);
  }, [status, voiceState]);

  const toggleDebug = useCallback(() => {
    setIsDebugOpen(prev => {
        const newState = !prev;
        localStorage.setItem('aether_debug', String(newState));
        logger.toggleDebug(newState);
        return newState;
    });
  }, []);

  return {
    state: {
      status,
      voiceState,
      transcript,
      permissionStatus: 'granted' as const, // Mock
      currentAssistantMessage: 'Session Active (UI Only)',
      currentMessageDuration: 0,
      turnCount: 0,
      tokenUsage: { totalTokens: 0 },
      isDebugOpen, 
      isMobileFlow: false
    },
    actions: {
      handleStartSession,
      toggleListening,
      toggleDebug,
      verifyAccessCode: access.actions.verifyAccessCode,
      handleInputComplete: async (text: string) => console.log('Input:', text),
    },
  };
}
