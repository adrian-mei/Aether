'use client';

import { Mic, MicOff, Activity, Sparkles } from 'lucide-react';
import { VoiceAgentState } from '../hooks/use-voice-agent';

interface VisualizerProps {
  state: VoiceAgentState;
}

export default function VoiceVisualizer({ state }: VisualizerProps) {
  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      
      {/* --- BACKGROUND LAYERS (The "Aura") --- */}
      
      {/* Speaking: The Breathing Aura */}
      {state === 'speaking' && (
        <>
          <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-breathe" />
          <div className="absolute inset-4 bg-indigo-400/20 rounded-full blur-lg animate-breathe delay-75" />
        </>
      )}

      {/* Listening: The Ripple Effect */}
      {state === 'listening' && (
        <>
           {/* Ring 1 */}
          <div className="absolute w-32 h-32 border border-emerald-500/30 rounded-full animate-ripple" />
           {/* Ring 2 (Delayed) */}
          <div className="absolute w-32 h-32 border border-emerald-500/20 rounded-full animate-ripple [animation-delay:1s]" />
        </>
      )}

      {/* Processing: The Inner Glow */}
      {state === 'processing' && (
        <div className="absolute inset-8 bg-amber-500/10 rounded-full blur-md animate-pulse" />
      )}


      {/* --- CORE CIRCLE (The "Body") --- */}
      <div 
        className={`
          relative z-10 flex items-center justify-center w-32 h-32 rounded-full 
          shadow-2xl transition-all duration-700 ease-in-out
          ${state === 'speaking' ? 'bg-indigo-600 shadow-indigo-500/50 scale-110' :
            state === 'listening' ? 'bg-emerald-600 shadow-emerald-500/50' :
            state === 'processing' ? 'bg-amber-600 shadow-amber-500/50 scale-95' :
            state === 'muted' ? 'bg-yellow-600 shadow-yellow-500/50' :
            'bg-slate-700 shadow-slate-900/50 scale-100'}
        `}
      >
        {/* Icons with smooth transitions */}
        <div className="text-white transition-all duration-500">
          {state === 'speaking' && <Sparkles className="w-12 h-12 animate-pulse" />}
          {state === 'listening' && <Mic className="w-12 h-12" />}
          {state === 'processing' && <Activity className="w-12 h-12 animate-gentle-spin" />}
          {(state === 'idle' || state === 'muted' || state === 'paused') && <MicOff className="w-12 h-12 opacity-50" />}
          {state === 'prompting' && <Mic className="w-12 h-12 opacity-50 animate-pulse" />}
        </div>
      </div>

      {/* --- STATUS TEXT --- */}
      <div className="absolute -bottom-12 w-full text-center">
        <p className="text-indigo-200/80 text-sm font-light tracking-widest uppercase animate-pulse">
          {state === 'speaking' && "Aether is speaking"}
          {state === 'listening' && "Listening..."}
          {state === 'processing' && "Thinking"}
          {state === 'idle' && "Paused"}
          {state === 'muted' && "Muted"}
          {state === 'paused' && "Paused"}
          {state === 'prompting' && "Waiting for Permission"}
        </p>
      </div>
    </div>
  );
}
