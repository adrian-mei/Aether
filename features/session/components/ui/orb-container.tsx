import React, { useRef } from 'react';
import { Lock, Compass, AlertCircle } from 'lucide-react';
import { SessionStatus } from '@/features/session/hooks/use-session-manager';
import { PermissionStatus } from '@/features/voice/utils/permissions';

interface OrbContainerProps {
  uiVoiceState: string;
  sessionStatus: SessionStatus;
  permissionStatus: PermissionStatus;
  emotionalTone: string;
  downloadProgress: number | null;
  onInteraction: () => void;
}

export const OrbContainer = ({
  uiVoiceState,
  sessionStatus,
  permissionStatus,
  emotionalTone,
  downloadProgress,
  onInteraction,
}: OrbContainerProps) => {
  const orbRef = useRef<HTMLButtonElement>(null);

  // Color schemes based on emotional tone and state
  const getOrbGradient = () => {
    const combinations: Record<string, string> = {
      'idle-calm': 'from-emerald-500/40 via-green-500/30 to-teal-500/40',
      'listening-engaged': 'from-emerald-400/50 via-teal-400/40 to-green-400/50',
      'speaking-warm': 'from-lime-400/50 via-emerald-400/40 to-green-400/50',
      'processing-contemplative': 'from-teal-500/40 via-emerald-500/35 to-green-600/40',
      'error-calm': 'from-red-500/40 via-orange-500/30 to-red-500/40',
    };
    const key = `${uiVoiceState}-${emotionalTone}`;
    return combinations[key] || combinations['idle-calm'];
  };

  const getOrbShadow = () => {
    const shadows: Record<string, string> = {
      idle: 'shadow-[0_0_100px_rgba(52,211,153,0.3),0_0_200px_rgba(16,185,129,0.15)]',
      listening: 'shadow-[0_0_120px_rgba(52,211,153,0.4),0_0_250px_rgba(20,184,166,0.25)]',
      speaking: 'shadow-[0_0_150px_rgba(163,230,53,0.4),0_0_300px_rgba(132,204,22,0.2)]',
      processing: 'shadow-[0_0_80px_rgba(20,184,166,0.3),0_0_160px_rgba(52,211,153,0.2)]',
      error: 'shadow-[0_0_100px_rgba(239,68,68,0.3),0_0_200px_rgba(220,38,38,0.15)]',
    };
    return shadows[uiVoiceState] || shadows.idle;
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
        {uiVoiceState === 'processing' && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-teal-300/60 rounded-full animate-orbit"
                style={{
                  top: '50%',
                  left: '50%',
                  animationDelay: `${i * 0.2}s`,
                  transformOrigin: '0 0',
                }}
              />
            ))}
          </div>
        )}
        
        {/* Main Interactive Orb */}
        <button
          ref={orbRef}
          onClick={onInteraction}
          className={`
            relative w-56 h-56 md:w-64 md:h-64 rounded-full
            bg-gradient-to-br ${getOrbGradient()}
            ${getOrbShadow()}
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
          
          {/* Liquid Fill Animation (Gamified Download) */}
          {downloadProgress !== null && downloadProgress < 100 && (
            <div 
                className="absolute bottom-0 left-0 right-0 bg-teal-400/40 backdrop-blur-sm transition-all duration-300 ease-out flex items-center justify-center overflow-hidden z-10"
                style={{ height: `${downloadProgress}%` }}
            >
                <div className="w-full h-[2px] bg-teal-300/70 absolute top-0 animate-pulse" />
                {/* Bubbles effect */}
                <div className="absolute inset-0">
                      {[...Array(3)].map((_, i) => (
                        <div 
                            key={i}
                            className="absolute bg-teal-300/30 rounded-full animate-floatSmooth"
                            style={{
                                width: Math.random() * 20 + 10 + 'px',
                                height: Math.random() * 20 + 10 + 'px',
                                left: Math.random() * 100 + '%',
                                bottom: '-20px',
                                animationDuration: Math.random() * 2 + 2 + 's',
                                animationDelay: Math.random() * 1 + 's'
                            }}
                        />
                      ))}
                </div>
            </div>
          )}

          {/* Error/Status Icons Overlay */}
          {sessionStatus === 'insecure-context' && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
                <Lock className="w-16 h-16 text-red-300/80" />
            </div>
          )}
            {sessionStatus === 'unsupported' && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
                <Compass className="w-16 h-16 text-yellow-300/80" />
            </div>
          )}
            {permissionStatus === 'denied' && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
                <AlertCircle className="w-16 h-16 text-red-300/80" />
            </div>
          )}

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
