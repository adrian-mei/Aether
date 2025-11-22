import React from 'react';

interface HeaderProps {
  uiVoiceState: string;
}

export const Header = ({ uiVoiceState }: HeaderProps) => {
  return (
    <div className="w-full max-w-2xl">
      <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-950/40 to-teal-950/30 rounded-2xl md:rounded-[2rem] p-6 md:p-8 border border-emerald-400/10 shadow-[0_8px_32px_rgba(16,185,129,0.12)]">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 md:gap-0">
          <div>
            <h1 
              className="text-4xl md:text-6xl font-extralight tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-teal-200 mb-1"
              style={{ 
                textShadow: '0 0 60px rgba(52,211,153,0.3)',
              }}
            >
              AETHER
            </h1>
            <p className="text-emerald-300/60 text-xs md:text-sm font-light tracking-wider ml-1">
              Voice-First Empathetic Companion
            </p>
          </div>
          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className={`w-2 h-2 rounded-full ${uiVoiceState !== 'idle' ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-600/50'}`} />
            <span className="text-emerald-400/50 text-xs uppercase tracking-wider">
              {uiVoiceState === 'idle' ? 'Ready' : 'Active'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
