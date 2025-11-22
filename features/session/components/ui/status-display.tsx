import React, { useState } from 'react';
import { PermissionStatus } from '@/features/voice/utils/permissions';
import { SessionStatus } from '@/features/session/hooks/use-session-manager';
import { ModelCacheStatus } from '@/features/voice/utils/model-cache';
import { ResponseFeedback } from './response-feedback';
import { logger } from '@/shared/lib/logger';
import { useTypewriter } from '@/features/session/hooks/use-typewriter';

interface StatusDisplayProps {
  uiVoiceState: string;
  sessionStatus: SessionStatus;
  permissionStatus: PermissionStatus;
  modelCacheStatus: ModelCacheStatus;
  downloadProgress: number | null;
  currentAssistantMessage?: string;
  currentMessageDuration?: number;
  transcript?: string;
  turnCount: number;
}

export const StatusDisplay = ({
  uiVoiceState,
  sessionStatus,
  permissionStatus,
  modelCacheStatus,
  downloadProgress,
  currentAssistantMessage,
  currentMessageDuration,
  transcript,
  turnCount,
}: StatusDisplayProps) => {
  const [hasGivenFeedback, setHasGivenFeedback] = useState(false);
  const [shouldShowFeedback, setShouldShowFeedback] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | undefined>(undefined);
  
  // Derived state pattern: update state during render if props change
  if (currentAssistantMessage && currentAssistantMessage !== lastMessage) {
      setLastMessage(currentAssistantMessage);
      setHasGivenFeedback(false);
      // Logic: Only ask for feedback after 5 turns, and then randomly (30% chance)
      // Using message length for deterministic pseudo-randomness to maintain purity
      if (turnCount > 5) {
          setShouldShowFeedback((currentAssistantMessage.length % 10) < 3);
      } else {
          setShouldShowFeedback(false);
      }
  }
  
  // Calculate dynamic speed for true sync
  // We want typing to finish when audio finishes.
  // Start time: 0ms delay (Immediate).
  // End time: +Duration * 1000ms.
  // Typing time: (Duration * 1000).
  const calculateSpeed = () => {
      if (!currentAssistantMessage || !currentMessageDuration) return 40; // Default fallback
      
      const durationMs = currentMessageDuration * 1000;
      const textLength = currentAssistantMessage.length;
      
      // If audio is too short, just type fast enough to show it (e.g. 200ms min)
      // Removed the -500ms offset to start immediately
      const availableTime = Math.max(durationMs, 100);
      
      const speed = availableTime / textLength;
      // Clamp to reasonable values? e.g. min 10ms, max 100ms?
      // No, let it match exactly.
      return Math.max(speed, 5); 
  };

  const dynamicSpeed = calculateSpeed();

  // Apply typewriter effect to assistant message
  // Reduced delay from 500ms to 0ms for instant start
  const animatedAssistantMessage = useTypewriter(currentAssistantMessage, dynamicSpeed, 0);

  const handleFeedback = (type: 'positive' | 'neutral') => {
    setHasGivenFeedback(true);
    logger.info('feedback', 'User provided feedback', { 
      rating: type, 
      message: currentAssistantMessage 
    });
  };

  const getStateMessage = () => {
    if (sessionStatus === 'insecure-context') {
        return { text: 'Connection Not Secure', subtext: 'Please use HTTPS or localhost' };
    }
    if (sessionStatus === 'unsupported') {
        return { text: 'Browser Not Supported', subtext: 'Please use Chrome or Edge' };
    }
    if (permissionStatus === 'denied') {
        return { text: 'Microphone Access Denied', subtext: 'Please enable microphone permissions' };
    }
    
    // Handle Download/Boot/Init State (Prioritize over permission pending)
    // Show loading if downloading (<100) OR if still in booting/initializing state
    // This unifies "Waking Up" and "Booting" into a single consistent "Initializing..." screen
    if ((downloadProgress !== null && downloadProgress < 100) || sessionStatus === 'booting' || sessionStatus === 'initializing') {
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

    const messages: Record<string, { text: string; subtext: string }> = {
      idle: { text: 'Ready to listen', subtext: 'Tap to begin' },
      listening: { text: 'I\'m listening', subtext: 'Go ahead, it\'s your turn' },
      processing: { text: 'Reflecting', subtext: 'Taking in your words' },
      speaking: { text: 'Here with you', subtext: 'Let me mirror that back' },
      muted: { text: 'Paused', subtext: 'Tap to resume' },
      error: { text: 'Connection Issue', subtext: 'Tap to retry' },
    };

    // 1. User Input (Highest Priority)
    // Override for listening/processing state if we have a transcript (overlay)
    if ((uiVoiceState === 'listening' || uiVoiceState === 'processing') && transcript) {
        return { text: transcript, subtext: uiVoiceState === 'processing' ? 'Thinking...' : 'Listening...' };
    }

    // 2. Assistant Output (Priority until fully typed)
    // Show assistant message if speaking OR if typing is still in progress (due to delay)
    const isTyping = currentAssistantMessage && animatedAssistantMessage !== currentAssistantMessage;
    const shouldShowAssistant = currentAssistantMessage && (uiVoiceState === 'speaking' || isTyping);

    if (shouldShowAssistant) {
        return { text: animatedAssistantMessage, subtext: 'Aether' };
    }

    // 3. Faded Previous Context (When Listening OR Processing without transcript)
    // Keep user engaged by showing the last message faded instead of just "I'm listening" or "Reflecting"
    // This ensures the panel "sticks" to the last known context until new content arrives
    if ((uiVoiceState === 'listening' || uiVoiceState === 'processing') && lastMessage) {
        const subtext = uiVoiceState === 'processing' ? 'Thinking...' : 'Listening...';
        return { text: lastMessage, subtext, isFaded: true };
    }

    // 4. State Message (Lowest Priority)
    return messages[uiVoiceState] || messages.idle;
  };

  const stateMessage = getStateMessage();
  // Handle both simple object and extended object with isFaded
  const text = stateMessage.text;
  const subtext = stateMessage.subtext;
  const isFaded = 'isFaded' in stateMessage ? stateMessage.isFaded : false;

  return (
    <div className="relative w-full max-w-[280px] md:max-w-none">
      {/* Added min-h-[140px] to prevent layout shifts (flickering) when text changes */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-950/50 to-teal-950/40 rounded-2xl px-6 md:px-10 py-4 md:py-5 border border-emerald-400/10 shadow-lg w-full md:min-w-[280px] min-h-[140px] flex flex-col justify-center">
        <div className="text-center space-y-1">
          <p className={`
            text-lg md:text-xl font-light tracking-wide transition-all duration-500
            ${isFaded ? 'opacity-40 blur-[0.5px]' : ''}
            ${uiVoiceState === 'listening' ? 'text-emerald-300' : 
              uiVoiceState === 'speaking' ? 'text-lime-300' :
              uiVoiceState === 'processing' ? 'text-teal-300' :
              'text-green-300'}
          `}>
            {text}
          </p>
          <p className="text-emerald-400/50 text-xs md:text-sm font-light">
            {subtext}
          </p>
        </div>

        {/* Voice activity indicator */}
        {uiVoiceState !== 'idle' && uiVoiceState !== 'error' && (
          <div className="flex justify-center items-center gap-1 mt-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`
                  w-1 h-4 rounded-full
                  ${uiVoiceState === 'listening' ? 'bg-emerald-400/60' :
                    uiVoiceState === 'speaking' ? 'bg-lime-400/60' :
                    'bg-teal-400/60'}
                  animate-wave
                `}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  height: uiVoiceState === 'speaking' ? `${((i * 1337) % 16) + 8}px` : '16px',
                }}
              />
            ))}
          </div>
        )}

        {/* Feedback Control */}
        {uiVoiceState === 'speaking' && currentAssistantMessage && shouldShowFeedback && !hasGivenFeedback && (
          <ResponseFeedback onFeedback={handleFeedback} />
        )}
      </div>
    </div>
  );
};
