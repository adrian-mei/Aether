import { useState, useEffect, useRef } from 'react';
import { useVoiceInteraction } from '@/features/voice/hooks/core/use-voice-interaction';
import { isBrowserSupported, isSecureContext } from '@/features/voice/utils/browser-support';
import { audioPlayer } from '@/features/voice/utils/audio-player';
import { logger } from '@/shared/lib/logger';
import { kokoroService } from '@/features/voice/services/kokoro-service';
import { memoryService } from '@/features/memory/services/memory-service';
import { isLowEndDevice } from '@/features/system/utils/device-capabilities';

import { useSessionAccess } from './access/use-session-access';
import { useBootSequence } from './lifecycle/use-boot-sequence';
import { useConversation } from './chat/use-conversation';
import { useConversationFlow } from './chat/use-conversation-flow';
import { useInteractionLoop } from './logic/use-interaction-loop';

export type SessionStatus = 'initializing' | 'awaiting-boot' | 'booting' | 'idle' | 'running' | 'unsupported' | 'insecure-context' | 'limit-reached';

export type VoiceMode = 'native' | 'neural';

export function useSessionManager() {
  const [status, setStatus] = useState<SessionStatus>('initializing');
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  // Default to native on low-end devices to save bandwidth/startup time
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('neural'); 
  const [isDownloadingNeural, setIsDownloadingNeural] = useState(false);
  
  // 1. Session Access & Limits
  const access = useSessionAccess();

  // 2. Boot Sequence
  const boot = useBootSequence({
    voiceMode,
    onComplete: async (granted) => {
      if (granted) {
        setStatus('running');
        // Use the flow manager to handle introduction
        await flow.actions.startIntroduction();
      } else {
        setStatus('idle');
      }
    }
  });

  // 3. Voice Agent
  const voice = useVoiceInteraction(voiceMode);
  const { 
    state: voiceState,
    transcript,
    startListening, 
    stopListening, 
    speak, 
    toggleMute
  } = voice;

  // Refs for callbacks
  const resetRef = useRef<() => void>(() => {});

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

  // 5. Conversation Flow
  const flow = useConversationFlow({
    onSpeak: speak,
    injectAssistantMessage: conversation.actions.injectAssistantMessage,
    startListening
  });

  // 6. Interaction Loop (The Wiring)
  useInteractionLoop({
    voice,
    conversation,
    access,
    status,
    resetSession: () => resetRef.current()
  });

  // Update Reset Ref
  useEffect(() => {
      resetRef.current = () => {
          voice.reset();
          conversation.actions.resetConversation();
          setStatus('idle');
      };
  }, [voice, conversation.actions]);

  // Initialization Logic
  useEffect(() => {
    logger.info('APP', 'Session manager initializing...');

    // Check device capabilities
    if (isLowEndDevice()) {
        logger.info('APP', 'Low-end device detected, defaulting to Native Voice');
        setVoiceMode('native');
    }

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

        // Wait for access state to be ready
        if (!access.state.isReady) return;

        if (access.state.isLimitReached) {
            setStatus('limit-reached');
        } else {
            setStatus('awaiting-boot');
        }
    }
    initialize();
  }, [access.state.isReady, access.state.isLimitReached]);

  const handleStartSession = async () => {
    logger.info('APP', 'User clicked Start Session');
    if (status === 'unsupported' || access.state.isLimitReached) return;

    // Services init (Pre-warm workers)
    // Only init Kokoro if we are in neural mode
    if (voiceMode === 'neural') {
        kokoroService.initialize().catch(err => logger.error('APP', 'Kokoro init failed', err));
    }
    memoryService.initialize().catch(err => logger.error('APP', 'Memory init failed', err));
    audioPlayer.resume().catch(err => logger.warn('APP', 'Failed to resume audio context', err));

    boot.actions.setPermissionStatus('pending');
    await boot.actions.retryPermission().then(() => true).catch(() => false);
  };

  const toggleListening = () => {
    if (access.state.isLimitReached) return;
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
    // Default to false if not set
    let debugStr = localStorage.getItem('aether_debug');
    if (debugStr === null) {
        debugStr = 'false';
        localStorage.setItem('aether_debug', 'false');
    }
    
    const isEnabled = debugStr === 'true';
    logger.toggleDebug(isEnabled); // Ensure logger is synced
    setTimeout(() => setIsDebugOpen(isEnabled), 0);
  }, []);

  const toggleVoiceMode = () => {
      if (voiceMode === 'native') {
          // Switching TO Neural
          if (kokoroService.isReady) {
              setVoiceMode('neural');
              logger.info('APP', 'Switched to Neural Voice (Ready)');
          } else {
              // Trigger download
              logger.info('APP', 'Triggering Neural Voice Download');
              setIsDownloadingNeural(true);
              kokoroService.initialize()
                  .then(() => {
                      setIsDownloadingNeural(false);
                      setVoiceMode('neural');
                      logger.info('APP', 'Neural Voice Downloaded & Enabled');
                  })
                  .catch(err => {
                      setIsDownloadingNeural(false);
                      logger.error('APP', 'Neural Voice Download Failed', err);
                  });
          }
      } else {
          // Switching TO Native
          setVoiceMode('native');
          logger.info('APP', 'Switched to Native Voice');
      }
  };

  return {
    state: {
      status: boot.state.isBooting ? 'booting' : (access.state.isLimitReached ? 'limit-reached' : status),
      isDebugOpen,
      voiceMode,
      isDownloadingNeural,
      voiceState,
      permissionStatus: boot.state.permissionStatus,
      currentAssistantMessage: conversation.state.currentAssistantMessage,
      currentMessageDuration: conversation.state.currentMessageDuration,
      modelCacheStatus: boot.state.modelCacheStatus,
      downloadProgress: boot.state.downloadProgress,
      transcript,
      turnCount: conversation.state.turnCount,
      tokenUsage: conversation.state.tokenUsage,
    },
    actions: {
      startBootSequence: boot.actions.startBootSequence,
      handleStartSession,
      handleInputComplete: conversation.actions.handleInputComplete,
      toggleListening,
      toggleDebug,
      toggleVoiceMode,
      toggleMute,
      onRetryPermission: boot.actions.retryPermission,
      verifyAccessCode: access.actions.verifyAccessCode,
    },
  };
}
