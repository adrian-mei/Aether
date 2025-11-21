'use client';

import { Mic, MicOff, Loader2 } from 'lucide-react';
import { VoiceAgentState } from '../hooks/use-voice-agent';

interface VisualizerProps {
  state: VoiceAgentState;
  size?: number;
  isInteractive?: boolean;
  onClick?: () => void;
}

export default function VoiceVisualizer({ state, size = 240, isInteractive = false, onClick }: VisualizerProps) {
  // Minimalist color themes
  const getStateStyles = () => {
    switch (state) {
      case 'speaking':
        return {
          bg: 'bg-rose-500',
          glow: 'shadow-[0_0_60px_rgba(244,63,94,0.6)]',
          scale: 'scale-110',
        };
      case 'listening':
        return {
          bg: 'bg-teal-500',
          glow: 'shadow-[0_0_60px_rgba(20,184,166,0.6)]',
          scale: 'scale-105',
        };
      case 'processing':
        return {
          bg: 'bg-amber-500',
          glow: 'shadow-[0_0_60px_rgba(245,158,11,0.6)]',
          scale: 'scale-100',
        };
      case 'muted':
        return {
          bg: 'bg-stone-500',
          glow: 'shadow-[0_0_40px_rgba(120,113,108,0.4)]',
          scale: 'scale-100',
        };
      case 'idle':
        return {
          bg: 'bg-orange-500',
          glow: 'shadow-[0_0_50px_rgba(249,115,22,0.5)]',
          scale: 'scale-100',
        };
      default:
        return {
          bg: 'bg-stone-700',
          glow: 'shadow-[0_0_30px_rgba(68,64,60,0.3)]',
          scale: 'scale-95',
        };
    }
  };

  const styles = getStateStyles();
  const buttonSize = size * 0.83; // 200px for a 240px container

  const containerStyle = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    maxWidth: size,
    maxHeight: size,
  };

  const buttonStyle = {
    width: buttonSize,
    height: buttonSize,
  };

  return (
    <div className="relative flex items-center justify-center flex-none" style={containerStyle}>

      {/* Subtle background glow */}
      {state !== 'idle' && state !== 'permission-denied' && (
        <div
          className={`absolute inset-0 rounded-full ${styles.bg} opacity-20 blur-3xl transition-opacity duration-700`}
        />
      )}

      {/* Main orb */}
      <button
        onClick={onClick}
        disabled={!isInteractive}
        className={`
          relative flex items-center justify-center
          rounded-full
          ${styles.bg} ${styles.glow}
          transition-all duration-700 ease-out
          ${styles.scale}
          ${(state === 'speaking' || state === 'idle') ? 'animate-pulse-gentle' : ''}
          ${!isInteractive ? 'opacity-50 cursor-not-allowed' : 'opacity-100 cursor-pointer hover:scale-105 active:scale-100'}
        `}
        style={buttonStyle}
        aria-label="Toggle voice session"
      >
        {/* Glass reflection for depth */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent" />

        {/* Icon */}
        <div className="relative z-10 text-white">
          {(state === 'listening' || state === 'idle') && <Mic className="w-16 h-16" strokeWidth={1.5} />}
          {state === 'processing' && <Loader2 className="w-16 h-16 animate-spin" strokeWidth={1.5} />}
          {(state === 'muted' || state === 'permission-denied') && (
            <MicOff className="w-16 h-16" strokeWidth={1.5} />
          )}
          {state === 'speaking' && (
            <div className="flex gap-1 items-center">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-8 bg-white rounded-full animate-wave"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          )}
        </div>
      </button>

      {/* Status text */}
      <div className="absolute -bottom-16 w-full text-center">
        <p className="text-sm font-medium text-stone-400 uppercase tracking-widest">
          {state === 'speaking' && "Speaking"}
          {state === 'listening' && "Listening"}
          {state === 'processing' && "Processing"}
          {state === 'idle' && "Start Conversation"}
          {state === 'muted' && "Muted"}
          {state === 'permission-denied' && "Permission Denied"}
        </p>
      </div>
    </div>
  );
}
