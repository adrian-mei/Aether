import React from 'react';
import { Bubbles } from './Bubbles';

interface OrbLiquidFillProps {
  progress: number | null;
}

export const OrbLiquidFill = ({ progress }: OrbLiquidFillProps) => {
  if (progress === null || progress >= 100) return null;

  return (
    <div 
        className="absolute bottom-0 left-0 right-0 bg-teal-400/40 backdrop-blur-sm transition-all duration-300 ease-out flex items-center justify-center overflow-hidden z-10"
        style={{ height: `${progress}%` }}
    >
        <div className="w-full h-[2px] bg-teal-300/70 absolute top-0 animate-pulse" />
        {/* Bubbles effect */}
        <div className="absolute inset-0">
              <Bubbles />
        </div>
    </div>
  );
};
