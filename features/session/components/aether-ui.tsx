'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceAgentState } from '@/features/voice/hooks/use-voice-agent';
import { PermissionStatus } from '@/features/voice/utils/permissions';
import { SessionStatus } from '../hooks/use-session-manager';
import { Lock, Compass, AlertCircle } from 'lucide-react';
import { WaitlistModal } from './waitlist-modal';
import { useOceanSound } from '../hooks/use-ocean-sound';

interface AetherUIProps {
  voiceState: VoiceAgentState;
  permissionStatus: PermissionStatus;
  sessionStatus: SessionStatus;
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
  onStartSession, 
  onToggleListening,
  onBypass
}: AetherUIProps) => {
  const [emotionalTone, setEmotionalTone] = useState<EmotionalTone>('calm');
  const [orbs, setOrbs] = useState<any[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [breatheIntensity, setBreatheIntensity] = useState(1);
  const [isModalDismissed, setIsModalDismissed] = useState(false);
  const orbRef = useRef<HTMLButtonElement>(null);
  const { play: playOcean } = useOceanSound(0.05);

  // Reset modal dismissal when status changes to limit-reached
  useEffect(() => {
    if (sessionStatus === 'limit-reached') {
      setIsModalDismissed(false);
    }
  }, [sessionStatus]);

  // Map actual voiceState to UI state
  const getUIVoiceState = (): UIVoiceState => {
    if (voiceState === 'muted') return 'listening'; // Visual fallback for muted
    if (voiceState === 'permission-denied') return 'error';
    return voiceState as UIVoiceState;
  };

  const uiVoiceState = getUIVoiceState();

  // Derive emotional tone from voice state for now
  useEffect(() => {
    switch (voiceState) {
      case 'idle':
        setEmotionalTone('calm');
        break;
      case 'listening':
        setEmotionalTone('engaged');
        break;
      case 'processing':
        setEmotionalTone('contemplative');
        break;
      case 'speaking':
        setEmotionalTone('warm');
        break;
      case 'muted':
        setEmotionalTone('calm');
        break;
      case 'permission-denied':
        setEmotionalTone('calm'); // Fallback
        break;
    }
  }, [voiceState]);

  // Generate ambient floating orbs with more variation
  useEffect(() => {
    const orbConfig = [
      { color: 'emerald', opacity: 0.15, blur: 'blur-3xl' },
      { color: 'green', opacity: 0.12, blur: 'blur-2xl' },
      { color: 'teal', opacity: 0.18, blur: 'blur-3xl' },
      { color: 'lime', opacity: 0.10, blur: 'blur-2xl' },
      { color: 'sage', opacity: 0.14, blur: 'blur-3xl' },
    ];

    const newOrbs = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 280 + 150,
      duration: Math.random() * 30 + 40,
      delay: Math.random() * 10,
      config: orbConfig[i % orbConfig.length],
      rotationDuration: Math.random() * 60 + 60,
    }));
    setOrbs(newOrbs);
  }, []);

  // Track mouse for subtle parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Breathing animation intensity based on state
  useEffect(() => {
    const intensity: Record<string, number> = {
      idle: 1,
      listening: 1.3,
      speaking: 1.5,
      processing: 1.1,
      muted: 1,
      'permission-denied': 1,
    };
    setBreatheIntensity(intensity[voiceState] || 1);
  }, [voiceState]);

  const handleInteraction = () => {
    if (sessionStatus === 'limit-reached') {
      setIsModalDismissed(false); // Re-open modal if dismissed
      return;
    }

    // Trigger background audio
    playOcean();

    if (sessionStatus === 'unsupported' || sessionStatus === 'insecure-context') return;
    
    if (sessionStatus === 'idle') {
      onStartSession();
    } else {
      onToggleListening();
    }
  };

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
    if (permissionStatus === 'pending') {
        return { text: 'Requesting Access', subtext: 'Check your browser prompt' };
    }
    if (sessionStatus === 'limit-reached') {
        return { text: 'Session Limit', subtext: 'Thank you for visiting' };
    }

    const messages: Record<string, { text: string; subtext: string }> = {
      idle: { text: 'Ready to listen', subtext: 'Tap to begin' },
      listening: { text: 'I hear you', subtext: 'Share what\'s on your mind' },
      processing: { text: 'Reflecting', subtext: 'Taking in your words' },
      speaking: { text: 'Here with you', subtext: 'Let me mirror that back' },
      muted: { text: 'Paused', subtext: 'Tap to resume' },
      error: { text: 'Connection Issue', subtext: 'Tap to retry' },
    };
    return messages[uiVoiceState] || messages.idle;
  };

  const getBackgroundOrbStyle = (orb: any) => {
    const colors: Record<string, string> = {
      emerald: 'from-emerald-600/20 to-emerald-700/10',
      green: 'from-green-600/20 to-green-700/10',
      teal: 'from-teal-600/20 to-teal-700/10',
      lime: 'from-lime-500/15 to-lime-600/8',
      sage: 'from-green-700/20 to-emerald-800/10',
    };
    return colors[orb.config.color] || colors.emerald;
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-green-950 via-emerald-950 to-teal-950">
      <WaitlistModal 
        isOpen={sessionStatus === 'limit-reached' && !isModalDismissed} 
        onJoin={(email) => console.log('Waitlist join:', email)} 
        onClose={() => setIsModalDismissed(true)}
        onBypass={onBypass}
      />

      {/* Deep gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
      
      {/* Animated Background Orbs with Parallax */}
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{ transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)` }}
      >
        {orbs.map((orb) => (
          <div
            key={orb.id}
            className={`absolute rounded-full ${orb.config.blur} transition-all duration-[3000ms] ease-out`}
            style={{
              opacity: orb.config.opacity * (uiVoiceState === 'idle' ? 1 : 0.7),
            }}
          >
            <div
              className={`w-full h-full rounded-full bg-gradient-radial ${getBackgroundOrbStyle(orb)}`}
              style={{
                width: `${orb.size}px`,
                height: `${orb.size}px`,
                left: `${orb.x}%`,
                top: `${orb.y}%`,
                animation: `floatSmooth ${orb.duration}s ease-in-out infinite, rotate ${orb.rotationDuration}s linear infinite`,
                animationDelay: `${orb.delay}s`,
                transform: `scale(${breatheIntensity})`,
                transition: 'transform 2s ease-in-out',
              }}
            />
          </div>
        ))}
      </div>

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
      <div className="relative z-10 flex flex-col items-center justify-between h-full px-6 py-8">
        {/* Header with refined glassmorphism */}
        <div className="w-full max-w-2xl">
          <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-950/40 to-teal-950/30 rounded-[2rem] p-8 border border-emerald-400/10 shadow-[0_8px_32px_rgba(16,185,129,0.12)]">
            <div className="flex items-baseline justify-between">
              <div>
                <h1 
                  className="text-6xl font-extralight tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-teal-200 mb-1"
                  style={{ 
                    textShadow: '0 0 60px rgba(52,211,153,0.3)',
                  }}
                >
                  AETHER
                </h1>
                <p className="text-emerald-300/60 text-sm font-light tracking-wider ml-1">
                  Voice-First Empathetic Companion
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${uiVoiceState !== 'idle' ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-600/50'}`} />
                <span className="text-emerald-400/50 text-xs uppercase tracking-wider">
                  {uiVoiceState === 'idle' ? 'Ready' : 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Central Orb Container */}
        <div className="flex flex-col items-center justify-center space-y-10 -mt-16">
          <div className="relative">
            {/* Outer pulsing rings */}
            {uiVoiceState === 'speaking' && (
              <>
                <div className="absolute inset-0 -m-8 rounded-full bg-gradient-radial from-lime-500/20 to-transparent animate-pulse-slow pointer-events-none" />
                <div className="absolute inset-0 -m-16 rounded-full bg-gradient-radial from-emerald-500/10 to-transparent animate-pulse-slower pointer-events-none" />
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
              onClick={handleInteraction}
              className={`
                relative w-64 h-64 rounded-full
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

          {/* State Display with Animation */}
          <div className="relative">
            <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-950/50 to-teal-950/40 rounded-2xl px-10 py-5 border border-emerald-400/10 shadow-lg min-w-[280px]">
              <div className="text-center space-y-1">
                <p className={`
                  text-xl font-light tracking-wide transition-all duration-500
                  ${uiVoiceState === 'listening' ? 'text-emerald-300' : 
                    uiVoiceState === 'speaking' ? 'text-lime-300' :
                    uiVoiceState === 'processing' ? 'text-teal-300' :
                    'text-green-300'}
                `}>
                  {getStateMessage().text}
                </p>
                <p className="text-emerald-400/50 text-sm font-light">
                  {getStateMessage().subtext}
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
                        height: uiVoiceState === 'speaking' ? `${Math.random() * 16 + 8}px` : '16px',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with session info */}
        <div className="w-full max-w-2xl">
          <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-950/30 to-teal-950/20 rounded-[1.5rem] px-8 py-6 border border-emerald-400/5">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-emerald-300/70 text-xs uppercase tracking-wider font-light">
                  Safe Space Mode
                </p>
                <p className="text-emerald-400/50 text-xs leading-relaxed max-w-md">
                  I'm here to listen and reflect. Your thoughts are welcomed without judgment.
                  Everything shared remains between us.
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Emotional tone indicator */}
                <div className="flex flex-col items-center">
                  <div className={`
                    w-12 h-12 rounded-full
                    bg-gradient-to-br from-emerald-500/20 to-teal-500/20
                    border border-emerald-400/20
                    flex items-center justify-center
                  `}>
                    <div className={`
                      w-6 h-6 rounded-full
                      ${emotionalTone === 'calm' ? 'bg-emerald-500/50' :
                        emotionalTone === 'warm' ? 'bg-lime-500/50' :
                        emotionalTone === 'contemplative' ? 'bg-teal-500/50' :
                        'bg-green-500/50'}
                      animate-pulse-slow
                    `} />
                  </div>
                  <span className="text-emerald-500/40 text-[10px] uppercase tracking-wider mt-1">
                    {emotionalTone}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Privacy Notice */}
        <div className="absolute bottom-4 w-full text-center">
          <p className="text-emerald-400/30 text-[10px] uppercase tracking-widest font-light">
            We do not use user cookies • Local storage only
          </p>
        </div>
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
