'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { VoiceAgentState } from '@/features/voice/hooks/use-voice-agent';
import { PermissionStatus } from '@/features/voice/utils/permissions';
import { SessionStatus } from '../hooks/use-session-manager';
import { ModelCacheStatus } from '@/features/voice/utils/model-cache';
import { WaitlistModal } from './waitlist-modal';
import { useOceanSound } from '../hooks/use-ocean-sound';
import { useWakingSound } from '../hooks/use-waking-sound';
import { useWakeLock } from '../hooks/use-wake-lock';

// Sub-components
import { Header } from './ui/header';
import { Footer } from './ui/footer';
import { BackgroundOrbs } from './ui/background-orbs';
import { OrbContainer } from './ui/orb-container';
import { StatusDisplay } from './ui/status-display';

interface AetherUIProps {
  voiceState: VoiceAgentState;
  permissionStatus: PermissionStatus;
  sessionStatus: SessionStatus;
  modelCacheStatus: ModelCacheStatus;
  downloadProgress: number | null;
  currentAssistantMessage?: string;
  transcript?: string;
  onStartSession: () => void;
  onToggleListening: () => void;
  onBypass: (code: string) => Promise<boolean>;
}

type EmotionalTone = 'calm' | 'warm' | 'contemplative' | 'engaged';

// Extend VoiceAgentState for internal UI mapping if needed, 
// but we can map 'muted' and 'error' to visual equivalents.
type UIVoiceState = 'idle' | 'listening' | 'speaking' | 'processing' | 'error';

export const AetherUI = ({ 
  voiceState, 
  permissionStatus, 
  sessionStatus,
  modelCacheStatus,
  downloadProgress,
  currentAssistantMessage,
  transcript,
  onStartSession, 
  onToggleListening,
  onBypass
}: AetherUIProps) => {
  const [isModalDismissed, setIsModalDismissed] = useState(false);
  const { play: playOcean } = useOceanSound(0.05);
  const { playWakingSound } = useWakingSound();
  const { requestWakeLock, releaseWakeLock } = useWakeLock();
  const hasPlayedWakeRef = useRef(false);

  // Manage Wake Lock based on session status
  useEffect(() => {
    if (sessionStatus === 'running') {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [sessionStatus, requestWakeLock, releaseWakeLock]);

  // Play waking sound on initialization (once)
  useEffect(() => {
    if (sessionStatus === 'initializing' && !hasPlayedWakeRef.current) {
      hasPlayedWakeRef.current = true;
      playWakingSound();
    }
  }, [sessionStatus, playWakingSound]);

  // Reset modal dismissal when status changes to limit-reached
  if (sessionStatus === 'limit-reached' && isModalDismissed) {
    setIsModalDismissed(false);
  }

  // Map actual voiceState to UI state
  const getUIVoiceState = (): UIVoiceState => {
    if (sessionStatus === 'initializing' || sessionStatus === 'booting') return 'processing'; // Use processing animation for init/boot
    if (voiceState === 'muted') return 'listening'; // Visual fallback for muted
    if (voiceState === 'permission-denied') return 'error';
    return voiceState as UIVoiceState;
  };

  const uiVoiceState = getUIVoiceState();

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
        return 'calm';
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

  const handleInteraction = () => {
    if (sessionStatus === 'limit-reached') {
      setIsModalDismissed(false); // Re-open modal if dismissed
      return;
    }
    
    // Prevent interaction if downloading
    if (downloadProgress !== null && downloadProgress < 100) return;

    if (sessionStatus === 'initializing') return; // Ignore clicks during init

    // Trigger background audio
    playOcean();

    if (sessionStatus === 'unsupported' || sessionStatus === 'insecure-context') return;
    
    if (sessionStatus === 'idle' || sessionStatus === 'awaiting-boot') {
      onStartSession();
    } else {
      onToggleListening();
    }
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-gradient-to-br from-green-950 via-emerald-950 to-teal-950">
      <WaitlistModal 
        isOpen={sessionStatus === 'limit-reached' && !isModalDismissed} 
        onJoin={(email) => console.log('Waitlist join:', email)} 
        onClose={() => setIsModalDismissed(true)}
        onBypass={onBypass}
      />

      {/* Deep gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
      
      <BackgroundOrbs 
        uiVoiceState={uiVoiceState}
        breatheIntensity={breatheIntensity}
      />

      {/* Noise texture overlay for depth */}
      <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none">
        <svg width="100%" height="100%">
          <filter id="noise">
            <feTurbulence baseFrequency="0.9" numOctaves="4" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-between h-full px-4 py-6 md:px-6 md:py-8">
        
        <Header uiVoiceState={uiVoiceState} />

        {/* Central Orb Container */}
        <div className="flex flex-col items-center justify-center space-y-8 md:space-y-10 -mt-8 md:-mt-16">
            <OrbContainer 
                uiVoiceState={uiVoiceState}
                sessionStatus={sessionStatus}
                permissionStatus={permissionStatus}
                emotionalTone={emotionalTone}
                downloadProgress={downloadProgress}
                onInteraction={handleInteraction}
            />

            <StatusDisplay 
                uiVoiceState={uiVoiceState}
                sessionStatus={sessionStatus}
                permissionStatus={permissionStatus}
                modelCacheStatus={modelCacheStatus}
                downloadProgress={downloadProgress}
                currentAssistantMessage={currentAssistantMessage}
                transcript={transcript}
            />
        </div>

        <Footer emotionalTone={emotionalTone} />

      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes floatSmooth {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          25% {
            transform: translate(30px, -40px) scale(1.05) rotate(90deg);
          }
          50% {
            transform: translate(-20px, 30px) scale(0.95) rotate(180deg);
          }
          75% {
            transform: translate(40px, 20px) scale(1.02) rotate(270deg);
          }
        }

        @keyframes rotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.05);
            filter: brightness(1.1);
          }
        }

        @keyframes glow {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.2);
          }
        }

        @keyframes ripple {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        @keyframes ripple-delayed {
          0% {
            transform: scale(1);
            opacity: 0.4;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }

        @keyframes pulse-slower {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.4;
          }
        }

        @keyframes wave {
          0%, 100% {
            transform: scaleY(1);
          }
          50% {
            transform: scaleY(1.8);
          }
        }

        @keyframes orbit {
          0% {
            transform: rotate(0deg) translateX(140px) rotate(0deg);
          }
          100% {
            transform: rotate(360deg) translateX(140px) rotate(-360deg);
          }
        }

        @layer utilities {
          .animate-breathe {
            animation: breathe 4s ease-in-out infinite;
          }
          .animate-glow {
            animation: glow 3s ease-in-out infinite;
          }
          .animate-ripple {
            animation: ripple 2s ease-out infinite;
          }
          .animate-ripple-delayed {
            animation: ripple-delayed 2s ease-out infinite 0.5s;
          }
          .animate-pulse-slow {
            animation: pulse-slow 3s ease-in-out infinite;
          }
          .animate-pulse-slower {
            animation: pulse-slower 4s ease-in-out infinite;
          }
          .animate-wave {
            animation: wave 1.5s ease-in-out infinite;
          }
          .animate-orbit {
            animation: orbit 3s linear infinite;
          }
        }

        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
};
