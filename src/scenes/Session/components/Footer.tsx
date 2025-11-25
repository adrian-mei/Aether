import React from 'react';
import { UIVoiceState } from '../Orb/Orb.logic';

interface FooterProps {
  emotionalTone: string;
  uiVoiceState: UIVoiceState;
}

export const Footer = ({ emotionalTone, uiVoiceState }: FooterProps) => {
  return (
    <div className={`w-full max-w-2xl transition-opacity duration-500 ${uiVoiceState === 'listening' ? 'opacity-50' : ''}`}>
      <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-950/30 to-teal-950/20 rounded-2xl md:rounded-[1.5rem] px-6 md:px-8 py-4 md:py-6 border border-emerald-400/5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1 md:space-y-2 flex-1">
            <p className="text-emerald-300/70 text-[10px] md:text-xs uppercase tracking-wider font-light">
              Safe Space Mode
            </p>
            <p className="text-emerald-400/50 text-[10px] md:text-xs leading-relaxed md:max-w-md">
              {"I'm here to listen and reflect. Your thoughts are welcomed without judgment. Everything shared remains between us."}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Emotional tone indicator */}
            <div className="flex flex-col items-center">
              <div className={`
                w-10 h-10 md:w-12 md:h-12 rounded-full
                bg-gradient-to-br from-emerald-500/20 to-teal-500/20
                border border-emerald-400/20
                flex items-center justify-center
                ${uiVoiceState === 'speaking' ? 'animate-breathe' : ''}
              `}>
                <div className={`
                  w-5 h-5 md:w-6 md:h-6 rounded-full
                  ${emotionalTone === 'calm' ? 'bg-emerald-500/50' :
                    emotionalTone === 'warm' ? 'bg-lime-500/50' :
                    emotionalTone === 'contemplative' ? 'bg-teal-500/50' :
                    'bg-green-500/50'}
                  animate-pulse-slow
                `} />
              </div>
              <span className="text-emerald-500/40 text-[10px] uppercase tracking-wider mt-1 hidden md:block">
                {emotionalTone}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
