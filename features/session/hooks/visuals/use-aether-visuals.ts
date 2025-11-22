import { useMemo, useState, useEffect } from 'react';
import { VoiceInteractionState } from '@/features/voice/hooks/core/use-voice-interaction';
import { SessionStatus } from '../use-session-manager';
import { PermissionStatus } from '@/features/voice/utils/permissions';
import { ModelCacheStatus } from '@/features/voice/utils/model-cache';
import { useTypewriter } from './use-typewriter';

export type EmotionalTone = 'calm' | 'warm' | 'contemplative' | 'engaged';
export type UIVoiceState = 'idle' | 'listening' | 'speaking' | 'processing' | 'error';

interface UseAetherVisualsProps {
  sessionStatus: SessionStatus;
  voiceState: VoiceInteractionState;
  permissionStatus: PermissionStatus;
  modelCacheStatus: ModelCacheStatus;
  downloadProgress: number | null;
  currentAssistantMessage?: string;
  currentMessageDuration?: number;
  transcript?: string;
  isOnline?: boolean;
}

export function useAetherVisuals({ 
  sessionStatus, 
  voiceState,
  permissionStatus,
  modelCacheStatus,
  downloadProgress,
  currentAssistantMessage,
  currentMessageDuration,
  transcript,
  isOnline = true
}: UseAetherVisualsProps) {
  
  // 1. Map actual voiceState to UI state
  const uiVoiceState: UIVoiceState = useMemo(() => {
    if (sessionStatus === 'initializing' || sessionStatus === 'booting') return 'processing';
    if (voiceState === 'muted') return 'listening';
    if (voiceState === 'permission-denied') return 'error';
    return voiceState as UIVoiceState;
  }, [sessionStatus, voiceState]);

  // 2. Derive emotional tone
  const emotionalTone: EmotionalTone = useMemo(() => {
    switch (voiceState) {
      case 'idle': return 'calm';
      case 'listening': return 'engaged';
      case 'processing': return 'contemplative';
      case 'speaking': return 'warm';
      default: return 'calm';
    }
  }, [voiceState]);

  // 3. Breathing animation intensity
  const breatheIntensity = useMemo(() => {
    const intensity: Record<string, number> = {
      idle: 1, listening: 1.3, speaking: 1.5, processing: 1.1, muted: 1, 'permission-denied': 1,
    };
    return intensity[voiceState] || 1;
  }, [voiceState]);

  // 4. Typewriter Logic (Moved from StatusDisplay)
  const calculateSpeed = () => {
    if (!currentAssistantMessage || !currentMessageDuration) return 40;
    const durationMs = currentMessageDuration * 1000;
    const textLength = currentAssistantMessage.length;
    const availableTime = Math.max(durationMs, 100);
    const speed = availableTime / textLength;
    return Math.max(speed, 5); 
  };

  const dynamicSpeed = calculateSpeed();
  const animatedAssistantMessage = useTypewriter(currentAssistantMessage, dynamicSpeed, 0);

  // 5. Sticky Context Logic (Last Message)
  const [lastMessage, setLastMessage] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (currentAssistantMessage && currentAssistantMessage !== lastMessage) {
      setLastMessage(currentAssistantMessage);
    }
  }, [currentAssistantMessage, lastMessage]);

  // 6. Visual Status Text Logic
  const visualStatus = useMemo(() => {
    // A. Critical Errors/States
    if (!isOnline) {
        return { text: 'No Connection', subtext: 'Checking network...' };
    }
    if (sessionStatus === 'insecure-context') {
        return { text: 'Connection Not Secure', subtext: 'Please use HTTPS or localhost' };
    }
    if (sessionStatus === 'unsupported') {
        return { text: 'Browser Not Supported', subtext: 'Please use Chrome or Edge' };
    }
    if (permissionStatus === 'denied') {
        return { text: 'Microphone Access Denied', subtext: 'Please enable microphone permissions' };
    }
    
    // B. Initialization
    if ((downloadProgress !== null && downloadProgress < 100) || sessionStatus === 'booting' || sessionStatus === 'initializing') {
        // If boot is complete (100%) but we're still pending permission, show that state
        if (downloadProgress && downloadProgress >= 100 && permissionStatus === 'pending') {
            return { text: 'Requesting Access', subtext: 'Check your browser prompt' };
        }

        return {
            text: "Initializing...",
            subtext: downloadProgress ? `${Math.round(downloadProgress)}% Complete` : 'Preparing...'
        };
    }

    if (permissionStatus === 'pending') {
        return { text: 'Requesting Access', subtext: 'Check your browser prompt' };
    }

    if (sessionStatus === 'limit-reached') {
        return { text: 'Session Limit', subtext: 'Thank you for visiting' };
    }
    
    if (sessionStatus === 'awaiting-boot') {
        return { 
            text: 'Tap Orb to Begin', 
            subtext: modelCacheStatus === 'missing' ? 'Download Engine (300MB)' : 'System Boot Sequence' 
        };
    }

    // C. Dynamic Conversation States
    const messages: Record<string, { text: string; subtext: string }> = {
      idle: { text: 'Ready to listen', subtext: 'Tap to begin' },
      listening: { text: 'I\'m listening', subtext: 'Go ahead, it\'s your turn' },
      processing: { text: 'Reflecting', subtext: 'Taking in your words' },
      speaking: { text: 'Here with you', subtext: 'Let me mirror that back' },
      muted: { text: 'Paused', subtext: 'Tap to resume' },
      error: { text: 'Connection Issue', subtext: 'Tap to retry' },
    };

    // User Input Overlay
    if ((uiVoiceState === 'listening' || uiVoiceState === 'processing') && transcript) {
        return { text: transcript, subtext: uiVoiceState === 'processing' ? 'Thinking...' : 'Listening...' };
    }

    // Assistant Output
    const isTyping = currentAssistantMessage && animatedAssistantMessage !== currentAssistantMessage;
    const shouldShowAssistant = currentAssistantMessage && (uiVoiceState === 'speaking' || isTyping);

    if (shouldShowAssistant) {
        return { text: animatedAssistantMessage, subtext: 'Aether' };
    }

    // Faded Previous Context
    if ((uiVoiceState === 'listening' || uiVoiceState === 'processing') && lastMessage) {
        const subtext = uiVoiceState === 'processing' ? 'Thinking...' : 'Listening...';
        return { text: lastMessage, subtext, isFaded: true };
    }

    // Default State Message
    return messages[uiVoiceState] || messages.idle;
  }, [
    sessionStatus, 
    permissionStatus, 
    downloadProgress, 
    modelCacheStatus, 
    uiVoiceState, 
    transcript, 
    currentAssistantMessage, 
    animatedAssistantMessage, 
    lastMessage,
    isOnline
  ]);

  return {
    uiVoiceState,
    emotionalTone,
    breatheIntensity,
    visualStatus
  };
}
