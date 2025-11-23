import React from 'react';
import { isLowEndDevice } from '@/features/system/utils/device-capabilities';

export const OrbParticles = () => {
  const particleCount = isLowEndDevice() ? 3 : 6;
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {[...Array(particleCount)].map((_, i) => (
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
  );
};
