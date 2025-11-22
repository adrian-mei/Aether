import React from 'react';
import { PermissionStatus } from '@/features/voice/utils/permissions';
import { SessionStatus } from '@/features/session/hooks/use-session-manager';
import { ModelCacheStatus } from '@/features/voice/utils/model-cache';

interface StatusDisplayProps {
  uiVoiceState: string;
  sessionStatus: SessionStatus;
  permissionStatus: PermissionStatus;
  modelCacheStatus: ModelCacheStatus;
  downloadProgress: number | null;
  currentAssistantMessage?: string;
  transcript?: string;
}

export const StatusDisplay = ({
  uiVoiceState,
  sessionStatus,
  permissionStatus,
  modelCacheStatus,
  downloadProgress,
  currentAssistantMessage,
  transcript,
}: StatusDisplayProps) => {
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
    
    // Handle Gamified Download State (Prioritize over permission pending)
    if (downloadProgress !== null && downloadProgress < 100) {
         let text = "Initializing...";
         if (downloadProgress < 20) text = "Establishing Neural Link...";
         else if (downloadProgress < 40) text = "Downloading Voice Patterns...";
         else if (downloadProgress < 60) text = "Calibrating Empathy Engine...";
         else if (downloadProgress < 80) text = "Allocating WebGPU Buffers...";
         else text = "Synthesizing Emotional Tones...";

        return {
            text: text,
            subtext: `${Math.round(downloadProgress)}% Complete`
        };
    }

    if (permissionStatus === 'pending') {
        return { text: 'Requesting Access', subtext: 'Check your browser prompt' };
    }

    if (sessionStatus === 'limit-reached') {
        return { text: 'Session Limit', subtext: 'Thank you for visiting' };
    }

    if (sessionStatus === 'initializing') {
        return { text: 'Waking Up', subtext: 'Checking resources...' };
    }
    
    if (sessionStatus === 'awaiting-boot') {
        return { 
            text: 'Tap to Initialize', 
            subtext: modelCacheStatus === 'missing' ? 'Download Engine (300MB)' : 'System Boot Sequence' 
        };
    }

    const messages: Record<string, { text: string; subtext: string }> = {
      idle: { text: 'Ready to listen', subtext: 'Tap to begin' },
      listening: { text: 'I hear you', subtext: 'Share what\'s on your mind' },
      processing: { text: 'Reflecting', subtext: 'Taking in your words' },
      speaking: { text: 'Here with you', subtext: 'Let me mirror that back' },
      muted: { text: 'Paused', subtext: 'Tap to resume' },
      error: { text: 'Connection Issue', subtext: 'Tap to retry' },
    };

    // Override for speaking state if we have a message
    if (uiVoiceState === 'speaking' && currentAssistantMessage) {
        return { text: currentAssistantMessage, subtext: 'Aether' };
    }

    // Override for listening/processing state if we have a transcript (overlay)
    if ((uiVoiceState === 'listening' || uiVoiceState === 'processing') && transcript) {
        return { text: transcript, subtext: uiVoiceState === 'processing' ? 'Thinking...' : 'Listening...' };
    }

    return messages[uiVoiceState] || messages.idle;
  };

  const { text, subtext } = getStateMessage();

  return (
    <div className="relative w-full max-w-[280px] md:max-w-none">
      <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-950/50 to-teal-950/40 rounded-2xl px-6 md:px-10 py-4 md:py-5 border border-emerald-400/10 shadow-lg w-full md:min-w-[280px]">
        <div className="text-center space-y-1">
          <p className={`
            text-lg md:text-xl font-light tracking-wide transition-all duration-500
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
      </div>
    </div>
  );
};
