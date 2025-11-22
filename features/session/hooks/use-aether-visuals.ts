import { useMemo } from 'react';
import { VoiceAgentState } from '@/features/voice/hooks/use-voice-agent';
import { SessionStatus } from './use-session-manager';

export type EmotionalTone = 'calm' | 'warm' | 'contemplative' | 'engaged';
export type UIVoiceState = 'idle' | 'listening' | 'speaking' | 'processing' | 'error';

interface UseAetherVisualsProps {
  sessionStatus: SessionStatus;
  voiceState: VoiceAgentState;
}

export function useAetherVisuals({ sessionStatus, voiceState }: UseAetherVisualsProps) {
  // Map actual voiceState to UI state
  const uiVoiceState: UIVoiceState = useMemo(() => {
    if (sessionStatus === 'initializing' || sessionStatus === 'booting') return 'processing'; // Use processing animation for init/boot
    if (voiceState === 'muted') return 'listening'; // Visual fallback for muted
    if (voiceState === 'permission-denied') return 'error';
    return voiceState as UIVoiceState;
  }, [sessionStatus, voiceState]);

  // Derive emotional tone from voice state
  const emotionalTone: EmotionalTone = useMemo(() => {
    switch (voiceState) {
      case 'idle':
        return 'calm';
      case 'listening':
        return 'engaged';
      case 'processing':
        return 'contemplative';
      case 'speaking':
        return 'warm';
      case 'muted':
      case 'permission-denied':
        return 'calm';
      default:
        return 'calm';
    }
  }, [voiceState]);

  // Breathing animation intensity based on state
  const breatheIntensity = useMemo(() => {
    const intensity: Record<string, number> = {
      idle: 1,
      listening: 1.3,
      speaking: 1.5,
      processing: 1.1,
      muted: 1,
      'permission-denied': 1,
    };
    return intensity[voiceState] || 1;
  }, [voiceState]);

  return {
    uiVoiceState,
    emotionalTone,
    breatheIntensity
  };
}
