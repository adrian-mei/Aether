'use client';

import React, { useState, useEffect } from 'react';
import { WaitlistModal } from './modals/waitlist-modal';
import { chatService } from '@/features/ai/services/chat-service';

// Hooks
import { useAetherVisuals } from '../hooks/visuals/use-aether-visuals';
import { useSessionAudio } from '../hooks/audio/use-session-audio';
import { useOnlineStatus } from '@/shared/hooks/use-online-status';
import { useSession } from '../context/session-context';

// Sub-components
import { Header } from './layouts/header';
import { Footer } from './layouts/footer';
import { BackgroundOrbs } from './visuals/background-orbs';
import { OrbContainer } from './visuals/orb-container';
import { StatusDisplay } from './status/status-display';
import { DebugPanelLeft } from './debug/debug-panel-left';
import { DebugPanelRight } from './debug/debug-panel-right';
import { LandscapeWarning } from './layouts/landscape-warning';
import { IOSInstallPrompt } from './modals/ios-install-prompt';

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
    modelCacheStatus: state.modelCacheStatus,
    downloadProgress: state.downloadProgress,
    currentAssistantMessage: state.currentAssistantMessage,
    currentMessageDuration: state.currentMessageDuration,
    transcript: state.transcript,
    isOnline
  });
  
  const { playOcean } = useSessionAudio({ sessionStatus: state.status });

  // Keyboard shortcut for debug toggle (Cmd/Ctrl + .)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        actions.toggleDebug();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);

  // Reset modal dismissal when status changes to limit-reached
  // Logic: Using derived state pattern to avoid effect-based state updates
  if (state.status === 'limit-reached' && isModalDismissed) {
    setIsModalDismissed(false);
  }

  const handleInteraction = () => {
    if (state.status === 'limit-reached') {
      setIsModalDismissed(false); // Re-open modal if dismissed
      return;
    }
    
    // Prevent interaction if downloading
    if (state.downloadProgress !== null && state.downloadProgress < 100) return;

    if (state.status === 'initializing') return; // Ignore clicks during init

    // Trigger background audio
    playOcean();

    if (!isOnline) return;
    if (state.status === 'unsupported' || state.status === 'insecure-context') return;
    
    if (state.status === 'idle' || state.status === 'awaiting-boot') {
      // If waiting for boot, use boot sequence, otherwise start session directly (if already booted/idle)
      // Actually SessionContainer logic was: state.status === 'awaiting-boot' ? actions.startBootSequence : actions.handleStartSession
      // Wait, handleStartSession calls startBootSequence logic internally or re-triggers it?
      // Let's match previous logic:
      if (state.status === 'awaiting-boot') {
          actions.startBootSequence();
      } else {
          actions.handleStartSession();
      }
    } else {
      actions.toggleListening();
    }
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-gradient-to-br from-green-950 via-emerald-950 to-teal-950 touch-none pt-safe">
      <LandscapeWarning />
      <IOSInstallPrompt />
      
      <WaitlistModal 
        isOpen={state.status === 'limit-reached' && !isModalDismissed} 
        onJoin={(email) => console.log('Waitlist join:', email)} 
        onClose={() => setIsModalDismissed(true)}
        onBypass={actions.verifyAccessCode}
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
        {state.isDebugOpen && (
          <>
            <DebugPanelLeft 
              voiceState={state.voiceState}
              permissionStatus={state.permissionStatus}
              sessionStatus={state.status}
              modelCacheStatus={state.modelCacheStatus}
              tokenUsage={state.tokenUsage}
              onTestApi={() => chatService.testApiConnection()}
              onSimulateInput={actions.handleInputComplete}
            />
            <DebugPanelRight />
          </>
        )}

        {/* Central Orb Container */}
        <div className="flex flex-col items-center justify-center space-y-8 md:space-y-10 -mt-8 md:-mt-16">
            <OrbContainer 
                uiVoiceState={uiVoiceState}
                sessionStatus={state.status}
                permissionStatus={state.permissionStatus}
                emotionalTone={emotionalTone}
                downloadProgress={state.downloadProgress}
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
