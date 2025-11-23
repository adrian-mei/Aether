import React, { useRef } from 'react';
import { SessionStatus } from '@/features/session/hooks/use-session-manager';
import { PermissionStatus } from '@/features/voice/utils/permissions';
import { getOrbGradient, getOrbShadow } from './parts/orb-styles';
import { OrbParticles } from './parts/orb-particles';
import { OrbLiquidFill } from './parts/orb-liquid-fill';
import { OrbStatusOverlay } from './parts/orb-status-overlay';

interface OrbContainerProps {
  uiVoiceState: string;
  sessionStatus: SessionStatus;
  permissionStatus: PermissionStatus;
  emotionalTone: string;
  downloadProgress: number | null;
  bootStatus?: string;
  onInteraction: () => void;
}

export const OrbContainer = ({
  uiVoiceState,
  sessionStatus,
  permissionStatus,
  emotionalTone,
  downloadProgress,
  bootStatus,
  onInteraction,
}: OrbContainerProps) => {
  const orbRef = useRef<HTMLButtonElement>(null);

  const handleInteraction = () => {
    // Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    onInteraction();
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8 md:space-y-10 -mt-8 md:-mt-16">
      <div className="relative">
        {/* Outer pulsing rings */}
        {uiVoiceState === 'speaking' && (
          <>
            <div className="absolute inset-0 -m-6 md:-m-8 rounded-full bg-gradient-radial from-lime-500/20 to-transparent animate-pulse-slow pointer-events-none" />
            <div className="absolute inset-0 -m-12 md:-m-16 rounded-full bg-gradient-radial from-emerald-500/10 to-transparent animate-pulse-slower pointer-events-none" />
          </>
        )}
        
        {/* Listening ripples */}
        {uiVoiceState === 'listening' && (
          <div className="absolute inset-0 -m-4 pointer-events-none">
            <div className="absolute inset-0 rounded-full border border-emerald-400/30 animate-ripple" />
            <div className="absolute inset-0 rounded-full border border-teal-400/20 animate-ripple-delayed" />
          </div>
        )}

        {/* Processing particles */}
        {uiVoiceState === 'processing' && <OrbParticles />}
        
        {/* Main Interactive Orb */}
        <button
          ref={orbRef}
          onClick={handleInteraction}
          className={`
            relative w-[35vmin] h-[35vmin] max-w-[256px] max-h-[256px] min-w-[200px] min-h-[200px] rounded-full
            bg-gradient-to-br ${getOrbGradient(uiVoiceState, emotionalTone)}
            ${getOrbShadow(uiVoiceState)}
            backdrop-blur-2xl
            border border-emerald-400/20
            transition-all duration-1000 ease-out
            hover:scale-105 active:scale-95
            cursor-pointer
            overflow-hidden
            group
          `}
          style={{
            transform: `scale(${uiVoiceState === 'listening' ? 1.08 : uiVoiceState === 'speaking' ? 1.05 : 1})`,
          }}
          aria-label={sessionStatus === 'idle' ? "Start Session" : "Toggle Listening"}
        >
          {/* Inner gradient layers for depth */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-emerald-300/10 to-transparent opacity-50" />
          <div className="absolute inset-0 bg-gradient-radial from-center from-white/5 to-transparent" />
          
          {/* Liquid Fill Animation */}
          <OrbLiquidFill progress={downloadProgress} />

          {/* Status Overlay */}
          <OrbStatusOverlay 
              sessionStatus={sessionStatus}
              permissionStatus={permissionStatus}
              downloadProgress={downloadProgress}
              bootStatus={bootStatus}
          />

          {/* Animated inner core */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`
              relative w-20 h-20 rounded-full
              transition-all duration-700
              ${uiVoiceState === 'listening' ? 'bg-gradient-to-br from-emerald-300/80 to-teal-400/80 scale-110' : 
                uiVoiceState === 'speaking' ? 'bg-gradient-to-br from-lime-300/80 to-emerald-400/80 scale-125' :
                uiVoiceState === 'processing' ? 'bg-gradient-to-br from-teal-300/70 to-emerald-400/70 scale-90 animate-pulse' :
                'bg-gradient-to-br from-emerald-400/60 to-green-500/60'}
              shadow-[0_0_40px_rgba(52,211,153,0.5)]
              animate-breathe
            `}>
              {/* Inner light point */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 bg-white/30 rounded-full blur-sm animate-glow" />
              </div>
            </div>
          </div>

          {/* Hover effect overlay */}
          <div className="absolute inset-0 bg-gradient-radial from-emerald-300/0 via-emerald-400/0 to-emerald-500/0 group-hover:from-emerald-300/10 group-hover:via-emerald-400/5 group-hover:to-emerald-500/0 transition-all duration-500" />
        </button>
      </div>
    </div>
  );
};
