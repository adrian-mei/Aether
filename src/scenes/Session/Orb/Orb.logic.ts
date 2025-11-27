import { useMemo } from 'react';
import { SessionStatus, VoiceState, TextSource } from '../Session.logic';
import { PermissionStatus } from '@/shared/utils/voice/permissions';

export type EmotionalTone = 'calm' | 'warm' | 'contemplative' | 'engaged';
export type UIVoiceState = 'idle' | 'listening' | 'speaking' | 'processing' | 'error';

interface UseAetherVisualsProps {
  sessionStatus: SessionStatus;
  voiceState: VoiceState;
  permissionStatus: PermissionStatus;
  activeText: string;
  activeTextSource: TextSource;
  currentMessageDuration?: number;
  currentChunkDuration?: number;
  isOnline?: boolean;
}

export function useAetherVisuals({
  sessionStatus,
  voiceState,
  permissionStatus,
  activeText,
  activeTextSource,
  currentMessageDuration,
  currentChunkDuration,
  isOnline = true
}: UseAetherVisualsProps) {
  
  // 1. Map actual voiceState to UI state
  const uiVoiceState: UIVoiceState = useMemo(() => {
    if (sessionStatus === 'initializing' || sessionStatus === 'connecting') return 'processing';
    if (sessionStatus === 'offline') return 'error';
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

  // 4. Visual Status Text Logic
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
    if (sessionStatus === 'error') {
        return { text: 'Connection Error', subtext: 'Please refresh or try again' };
    }
    if (sessionStatus === 'offline') {
        return { text: 'Aether is Offline', subtext: 'Backend services unavailable' };
    }
    if (permissionStatus === 'denied') {
        return { text: 'Microphone Access Denied', subtext: 'Please enable microphone permissions' };
    }
    
    // B. Initialization
    if (sessionStatus === 'initializing' || sessionStatus === 'connecting') {
        return {
            text: "Connecting...",
            subtext: 'Establishing secure link...'
        };
    }

    if (permissionStatus === 'pending') {
        return { text: 'Requesting Access', subtext: 'Check your browser prompt' };
    }

    if (sessionStatus === 'limit-reached') {
        return { text: 'Session Limit', subtext: 'Thank you for visiting' };
    }
    
    if (sessionStatus === 'idle') {
        return { 
            text: 'Tap Orb to Begin', 
            subtext: 'Session Ready' 
        };
    }

    // C. Dynamic Conversation States
    const messages: Record<string, { text: string; subtext: string }> = {
      idle: { text: 'Ready to listen', subtext: 'Tap to begin' },
      listening: { text: 'I\'m listening', subtext: 'Go ahead, it\'s your turn' },
      processing: { text: 'Thinking...', subtext: 'Formulating response' },
      speaking: { text: '', subtext: '' },
      muted: { text: 'Paused', subtext: 'Tap to resume' },
      error: { text: 'Connection Issue', subtext: 'Tap to retry' },
    };

    // 1. If we have active text, show it (Unified Display)
    if (activeText) {
        let subtext = 'Aether';
        let speed = 30; // Default speed
        let audioDuration = undefined;

        if (activeTextSource === 'user') {
            subtext = uiVoiceState === 'processing' ? 'Thinking...' : 'Listening...';
            speed = 15; // Fast typing for live transcription
        } else if (activeTextSource === 'system') {
            subtext = 'System';
        } else if (activeTextSource === 'ai') {
            // For AI text, pass audio duration to enable dynamic sync
            audioDuration = currentChunkDuration;
        }

        return {
            text: activeText,
            subtext,
            speed,
            audioDuration
        };
    }

    // 2. Fallback to State Messages
    return messages[uiVoiceState] || messages.idle;
  }, [
    sessionStatus,
    permissionStatus,
    uiVoiceState,
    activeTextSource,
    activeText, // Included for robustness
    currentChunkDuration,
    isOnline
  ]);

  return {
    uiVoiceState,
    emotionalTone,
    breatheIntensity,
    visualStatus
  };
}
