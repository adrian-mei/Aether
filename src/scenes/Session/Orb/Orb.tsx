'use client';

import { useMemo } from 'react';
import { PermissionStatus } from '@/shared/utils/voice/permissions';
import { SessionStatus } from '../Session.logic';
import { UIVoiceState, EmotionalTone } from './Orb.logic';
import { OrbLiquidFill } from './orb-liquid-fill';
import { OrbParticles } from './orb-particles';
import { OrbStatusOverlay } from './orb-status-overlay';
import { ORB_STYLES } from './orb-styles';

export interface OrbContainerProps {
  uiVoiceState: UIVoiceState;
  sessionStatus: SessionStatus;
  permissionStatus: PermissionStatus;
  emotionalTone: EmotionalTone;
  onInteraction: () => void;
}

export function OrbContainer({
  uiVoiceState,
  sessionStatus,
  permissionStatus,
  emotionalTone,
  onInteraction
}: OrbContainerProps) {
  
  // Dynamic scaling based on state
  const scale = useMemo(() => {
    switch (uiVoiceState) {
      case 'listening': return 1.05;
      case 'speaking': return 1.1;
      case 'processing': return 0.95;
      default: return 1;
    }
  }, [uiVoiceState]);

  // Determine active color scheme
  const currentStyle = ORB_STYLES[emotionalTone];

  return (
    <div 
      role="button"
      aria-label="Start Session"
      tabIndex={0}
      className={`relative w-64 h-64 md:w-80 md:h-80 cursor-pointer touch-manipulation transition-transform duration-700 ease-spring focus:outline-none focus:ring-4 focus:ring-white/20 rounded-full ${uiVoiceState === 'speaking' ? 'animate-breathe' : ''}`}
      style={{ transform: `scale(${scale})` }}
      onClick={onInteraction}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onInteraction();
        }
      }}
    >
      {/* 1. Core Liquid Fill (Base) */}
      <OrbLiquidFill 
        state={uiVoiceState}
        emotionalTone={emotionalTone}
      />

      {/* 2. Particle System (Atmosphere) */}
      <OrbParticles 
        color={currentStyle.particles} 
        intensity={uiVoiceState === 'speaking' ? 2 : 1}
      />

      {/* 3. Status/Error Overlays (Top Layer) */}
      <OrbStatusOverlay 
        sessionStatus={sessionStatus}
        permissionStatus={permissionStatus}
      />
      
      {/* 4. Glass Reflection/Glare (Static) */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 to-transparent opacity-40 pointer-events-none" />
      <div className="absolute top-4 left-8 w-16 h-8 bg-white/30 rounded-full blur-xl pointer-events-none" />
    </div>
  );
}
