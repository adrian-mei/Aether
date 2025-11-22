import React, { useState, useEffect } from 'react';

interface OrbConfig {
  color: string;
  opacity: number;
  blur: string;
}

interface Orb {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  config: OrbConfig;
  rotationDuration: number;
}

interface BackgroundOrbsProps {
  uiVoiceState: string;
  breatheIntensity: number;
}

export const BackgroundOrbs = ({ uiVoiceState, breatheIntensity }: BackgroundOrbsProps) => {
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

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
    setTimeout(() => setOrbs(newOrbs), 0);
  }, []);

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

  const getBackgroundOrbStyle = (orb: Orb) => {
    if (!orb?.config) return 'from-emerald-600/20 to-emerald-700/10';
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
    <div 
      className="absolute inset-0 overflow-hidden pointer-events-none"
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
  );
};
