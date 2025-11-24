'use client';

import React, { useState } from 'react';

// Context & Hooks
import { useSession } from '@/features/session/context/session-context';
import { useAetherVisuals } from '@/features/visuals/hooks/use-aether-visuals';
import { useSessionAudio } from '@/features/session/hooks/audio/use-session-audio';
import { useOnlineStatus } from '@/shared/hooks/use-online-status';
import { useDebugShortcuts } from '@/features/session/hooks/utils/use-debug-shortcuts';

// Utilities
import { audioPlayer } from '@/shared/utils/voice/audio-player';

// Components
import { Header } from './header';
import { Footer } from './footer';
import { StatusDisplay } from './status-display';
import { BackgroundOrbs } from '@/features/visuals/components/background-orbs';
import { OrbContainer } from '@/features/visuals/components/orb-container';

// Debug & Modals
import { DebugPanelLeft } from './debug-panel-left';
import { DebugPanelRight } from './debug-panel-right';
import { LandscapeWarning } from './landscape-warning';
import { WaitlistModal } from '@/components/modals/waitlist-modal';
import { IOSInstallPrompt } from '@/components/modals/ios-install-prompt';
import { MobileSupportNotice } from '@/components/modals/mobile-support-notice';

export const AetherUI = () => {
  const { state, actions } = useSession();
  const [isModalDismissed, setIsModalDismissed] = useState(false);
  const isOnline = useOnlineStatus();
  
  // Custom Hooks
  const { 
    uiVoiceState, 
    emotionalTone, 
    breatheIntensity,
    visualStatus 
  } = useAetherVisuals({ 
    sessionStatus: state.status, 
    voiceState: state.voiceState,
    permissionStatus: state.permissionStatus,
    currentAssistantMessage: state.currentAssistantMessage,
    currentMessageDuration: state.currentMessageDuration,
    transcript: state.transcript,
    isOnline
  });
  
  const { playOcean } = useSessionAudio({ sessionStatus: state.status });

  // Enable debug shortcuts (Cmd + .)
  useDebugShortcuts(actions.toggleDebug);

  // Reset modal dismissal when status changes to limit-reached
  if (state.status === 'limit-reached' && isModalDismissed) {
    setIsModalDismissed(false);
  }

  const handleInteraction = () => {
    // Critical: Unlock Audio Context & Web Speech API immediately on user interaction
    audioPlayer.resume().catch(console.error);

    if (typeof window !== 'undefined' && window.speechSynthesis) {
        const silentUtterance = new SpeechSynthesisUtterance('');
        silentUtterance.volume = 0;
        window.speechSynthesis.speak(silentUtterance);
    }

    if (state.status === 'limit-reached') {
      setIsModalDismissed(false);
      return;
    }

    if (state.status === 'initializing') return;

    playOcean();

    if (!isOnline) return;
    if (state.status === 'unsupported' || state.status === 'insecure-context') return;
    
    if (state.status === 'idle') {
      actions.handleStartSession();
    } else {
      actions.toggleListening();
    }
  };

  return (
    // Updated Container: 
    // - Removed hardcoded gradient (uses global theme)
    // - Added safe-area padding (pt-safe, pb-safe)
    // - Uses flex-col for full height layout
    <div className="relative w-full h-[100dvh] overflow-hidden touch-none pt-safe pb-safe">
      <LandscapeWarning />
      <IOSInstallPrompt />
      <MobileSupportNotice />
      
      <WaitlistModal 
        isOpen={state.status === 'limit-reached' && !isModalDismissed} 
        onJoin={(email) => console.log('Waitlist join:', email)} 
        onClose={() => setIsModalDismissed(true)}
        onBypass={actions.verifyAccessCode}
      />

      {/* Deep gradient overlay for depth (Transparent to Black/20) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none" />
      
      <BackgroundOrbs 
        uiVoiceState={uiVoiceState}
        breatheIntensity={breatheIntensity}
      />

      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none">
        <svg width="100%" height="100%">
          <filter id="noise">
            <feTurbulence baseFrequency="0.9" numOctaves="4" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>

      {/* Main Content Layout */}
      <div className="relative z-10 flex flex-col items-center justify-between h-full px-4 py-4 md:px-6 md:py-8">
        
        <Header uiVoiceState={uiVoiceState} />

        {/* Integrated Debug Panels */}
        {state.isDebugOpen && (
          <>
            <DebugPanelLeft 
              voiceState={state.voiceState}
              permissionStatus={state.permissionStatus}
              sessionStatus={state.status}
              tokenUsage={state.tokenUsage}
              onTestApi={() => console.log('Test API')}
              onSimulateInput={actions.handleInputComplete}
            />
            <DebugPanelRight />
          </>
        )}

        {/* Central Orb & Status */}
        <div className="flex flex-col items-center justify-center space-y-8 md:space-y-10 -mt-8 md:-mt-16 w-full">
            <OrbContainer 
                uiVoiceState={uiVoiceState}
                sessionStatus={state.status}
                permissionStatus={state.permissionStatus}
                emotionalTone={emotionalTone}
                onInteraction={handleInteraction}
            />

            <StatusDisplay 
                uiVoiceState={uiVoiceState}
                visualStatus={visualStatus}
                currentAssistantMessage={state.currentAssistantMessage}
                turnCount={state.turnCount}
            />
        </div>

        <Footer emotionalTone={emotionalTone} />
      </div>
    </div>
  );
};
