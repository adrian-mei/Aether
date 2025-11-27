import React from 'react';
import { getOrbGradient, getOrbShadow } from './orb-styles';
import { UIVoiceState, EmotionalTone } from './Orb.logic';

interface OrbLiquidFillProps {
  state: UIVoiceState;
  emotionalTone?: EmotionalTone; // Optional for now, can be used for finer color control
}

export const OrbLiquidFill = ({ state, emotionalTone = 'calm' }: OrbLiquidFillProps) => {
  const gradientClass = getOrbGradient(state, emotionalTone);
  const shadowClass = getOrbShadow(state);

  return (
    <div 
        className={`absolute inset-0 rounded-full bg-gradient-to-br ${gradientClass} ${shadowClass} transition-all duration-700 ease-in-out`}
    >
        {/* Internal highlighting for liquid effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-50 rounded-full" />
    </div>
  );
};
