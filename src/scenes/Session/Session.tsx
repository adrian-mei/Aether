'use client';

import React, { useState, useEffect } from 'react';

// Context & Hooks
import { useSession } from './Session.context';
import { useAetherVisuals } from './Orb/Orb.logic';
import { useSessionAudio } from './hooks/use-session-audio';
import { useOnlineStatus } from '@/shared/hooks/use-online-status';
import { useDebugShortcuts } from './Debugger/DebugShortcuts.logic';

// Utilities
import { audioPlayer } from '@/shared/utils/voice/audio-player';
import { ApiClient } from '@/shared/lib/api-client';

// Components
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { StatusDisplay } from './components/StatusDisplay';
import { BackgroundOrbs } from './Orb/BackgroundOrbs';
import { OrbContainer } from './Orb/Orb';

// Debug & Modals
import { DebugPanelLeft } from './Debugger/DebugPanelLeft';
import { DebugPanelRight } from './Debugger/DebugPanelRight';
import { LandscapeWarning } from '../Onboarding/LandscapeWarning';
import { WaitlistModal } from '../Onboarding/WaitlistModal';
import { IOSInstallPrompt } from '../Onboarding/IOSInstallPrompt';
import { MobileSupportNotice } from '../Onboarding/MobileSupportNotice';

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
    activeText: state.activeText,
    activeTextSource: state.activeTextSource,
    currentMessageDuration: state.currentMessageDuration,
    currentChunkDuration: state.currentChunkDuration,
    isOnline
  });
  
  const { playOcean } = useSessionAudio({ sessionStatus: state.status });

  // Enable debug shortcuts (Cmd + .)
  useDebugShortcuts(actions.toggleDebug);

  // Reset modal dismissal when status changes to limit-reached
  useEffect(() => {
    if (state.status === 'limit-reached') {
        setIsModalDismissed(false);
    }
  }, [state.status]);

  const handleWaitlistJoin = async (email: string) => {
    try {
      const response = await ApiClient.post('/waitlist/join', { email });
      if (response.ok) {
        console.log('Successfully joined waitlist:', email);
        // Optionally show success message to user
      } else {
        console.error('Failed to join waitlist:', await response.text());
      }
    } catch (error) {
      console.error('Error joining waitlist:', error);
    }
  };

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
    <div className="relative w-full h-[100dvh] overflow-hidden bg-gradient-to-br from-green-950 via-emerald-950 to-teal-950 touch-none pt-safe pb-safe">
      <LandscapeWarning />
      <IOSInstallPrompt />
      <MobileSupportNotice />
      
      <WaitlistModal
        isOpen={state.status === 'limit-reached' && !isModalDismissed}
        onJoin={handleWaitlistJoin}
        onClose={() => setIsModalDismissed(true)}
        onBypass={actions.verifyAccessCode}
      />

      {/* Deep gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
      
      <BackgroundOrbs 
        uiVoiceState={uiVoiceState}
        breatheIntensity={breatheIntensity}
      />

      {/* Noise texture overlay - Reduced opacity for cleaner glass look */}
      <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none">
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
                onInteraction={handleInteraction}
            />

            <StatusDisplay 
                uiVoiceState={uiVoiceState}
                visualStatus={visualStatus}
                currentAssistantMessage={state.currentAssistantMessage}
                turnCount={state.turnCount}
            />
        </div>

        <Footer emotionalTone={emotionalTone} uiVoiceState={uiVoiceState} />
      </div>
    </div>
  );
};
