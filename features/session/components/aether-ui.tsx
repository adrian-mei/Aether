'use client';

import React, { useState } from 'react';
import { VoiceAgentState } from '@/features/voice/hooks/use-voice-agent';
import { PermissionStatus } from '@/features/voice/utils/permissions';
import { SessionStatus } from '../hooks/use-session-manager';
import { ModelCacheStatus } from '@/features/voice/utils/model-cache';
import type { TokenUsage } from '@/features/ai/types/chat.types';
import { WaitlistModal } from './waitlist-modal';
import { chatService } from '@/features/ai/services/chat-service';

// Hooks
import { useAetherVisuals } from '../hooks/use-aether-visuals';
import { useSessionAudio } from '../hooks/use-session-audio';

// Sub-components
import { Header } from './ui/header';
import { Footer } from './ui/footer';
import { BackgroundOrbs } from './ui/background-orbs';
import { OrbContainer } from './ui/orb-container';
import { StatusDisplay } from './ui/status-display';
import { DebugPanelLeft } from './ui/debug/debug-panel-left';
import { DebugPanelRight } from './ui/debug/debug-panel-right';

interface AetherUIProps {
  voiceState: VoiceAgentState;
  permissionStatus: PermissionStatus;
  sessionStatus: SessionStatus;
  modelCacheStatus: ModelCacheStatus;
  downloadProgress: number | null;
  currentAssistantMessage?: string;
  currentMessageDuration?: number;
  transcript?: string;
  turnCount: number;
<<<<<<< Updated upstream
=======
  tokenUsage?: TokenUsage;
>>>>>>> Stashed changes
  isDebugMode: boolean;
  onStartSession: () => void;
  onToggleListening: () => void;
  onBypass: (code: string) => Promise<boolean>;
  onSimulateInput: (text: string) => void;
}

export const AetherUI = ({ 
  voiceState, 
  permissionStatus, 
  sessionStatus,
  modelCacheStatus,
  downloadProgress,
  currentAssistantMessage,
  currentMessageDuration,
  transcript,
  turnCount,
<<<<<<< Updated upstream
=======
  tokenUsage,
>>>>>>> Stashed changes
  isDebugMode,
  onStartSession, 
  onToggleListening,
  onBypass,
  onSimulateInput
}: AetherUIProps) => {
  const [isModalDismissed, setIsModalDismissed] = useState(false);
  
  // Custom Hooks
  const { uiVoiceState, emotionalTone, breatheIntensity } = useAetherVisuals({ sessionStatus, voiceState });
  const { playOcean } = useSessionAudio({ sessionStatus });

  // Reset modal dismissal when status changes to limit-reached
  // Logic: Using derived state pattern to avoid effect-based state updates
  if (sessionStatus === 'limit-reached' && isModalDismissed) {
    setIsModalDismissed(false);
  }

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
    <div className="relative w-full h-[100dvh] overflow-hidden bg-gradient-to-br from-green-950 via-emerald-950 to-teal-950 touch-none">
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
      {/* Added pb-safe to respect iOS home bar area */}
      <div className="relative z-10 flex flex-col items-center justify-between h-full px-4 py-4 md:px-6 md:py-8 pb-safe">
        
        <Header uiVoiceState={uiVoiceState} />

        {/* Integrated Debug Panels */}
        {isDebugMode && (
          <>
            <DebugPanelLeft 
              voiceState={voiceState}
              permissionStatus={permissionStatus}
              sessionStatus={sessionStatus}
              modelCacheStatus={modelCacheStatus}
<<<<<<< Updated upstream
=======
              tokenUsage={tokenUsage}
>>>>>>> Stashed changes
              onTestApi={() => chatService.testApiConnection()}
              onSimulateInput={onSimulateInput}
            />
            <DebugPanelRight />
          </>
        )}

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
                currentMessageDuration={currentMessageDuration}
                transcript={transcript}
                turnCount={turnCount}
            />
        </div>

        <Footer emotionalTone={emotionalTone} />

      </div>
    </div>
  );
};
