import React from 'react';
import { isLowEndDevice } from '@/shared/utils/system/device-capabilities';

interface OrbParticlesProps {
  color: string;
  intensity?: number;
}

export const OrbParticles = ({ color, intensity = 1 }: OrbParticlesProps) => {
  // Extract RGB values from tailwind class or hex? 
  // For now, we'll just assume specific classes or use a default if complexity is too high.
  // Actually, the previous implementation hardcoded `bg-teal-300/60`.
  // To support dynamic colors properly, we might need a mapping or pass explicit RGB.
  // Given the time, let's keep it simple and just use the intensity to scale opacity/count.

  const particleCount = isLowEndDevice() ? 3 : Math.min(6 * intensity, 12);
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {[...Array(Math.floor(particleCount))].map((_, i) => (
        <div
          key={i}
          className={`absolute w-1 h-1 rounded-full animate-orbit ${color.replace('text-', 'bg-').replace('from-', 'bg-')}`} 
          // Hacky color mapping: assuming passed color is like "text-teal-300". 
          // Ideally we should pass a specific particle color class.
          style={{
            top: '50%',
            left: '50%',
            animationDelay: `${i * 0.2}s`,
            transformOrigin: '0 0',
            opacity: 0.6 * intensity
          }}
        />
      ))}
    </div>
  );
};
