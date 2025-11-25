// Color definitions for the Orb based on EmotionalTone
export const ORB_STYLES: Record<string, { primary: string; secondary: string; particles: string }> = {
  calm: {
    primary: '#10b981', // Emerald-500
    secondary: '#14b8a6', // Teal-500
    particles: '#34d399', // Emerald-400
  },
  engaged: {
    primary: '#14b8a6', // Teal-500
    secondary: '#0ea5e9', // Sky-500
    particles: '#2dd4bf', // Teal-400
  },
  warm: {
    primary: '#84cc16', // Lime-500
    secondary: '#10b981', // Emerald-500
    particles: '#a3e635', // Lime-400
  },
  contemplative: {
    primary: '#0f766e', // Teal-700
    secondary: '#059669', // Emerald-600
    particles: '#2dd4bf', // Teal-400
  },
};

// Legacy helpers (kept for backward compatibility if used elsewhere)
export const getOrbGradient = (uiVoiceState: string, emotionalTone: string) => {
  const combinations: Record<string, string> = {
    'idle-calm': 'from-emerald-500/40 via-green-500/30 to-teal-500/40',
    'listening-engaged': 'from-emerald-400/50 via-teal-400/40 to-green-400/50',
    'speaking-warm': 'from-lime-400/50 via-emerald-400/40 to-green-400/50',
    'processing-contemplative': 'from-teal-500/40 via-emerald-500/35 to-green-600/40',
    'error-calm': 'from-red-500/40 via-orange-500/30 to-red-500/40',
  };
  const key = `${uiVoiceState}-${emotionalTone}`;
  return combinations[key] || combinations['idle-calm'];
};

export const getOrbShadow = (uiVoiceState: string) => {
  const shadows: Record<string, string> = {
    idle: 'shadow-[0_0_100px_rgba(52,211,153,0.3),0_0_200px_rgba(16,185,129,0.15)]',
    listening: 'shadow-[0_0_120px_rgba(52,211,153,0.4),0_0_250px_rgba(20,184,166,0.25)]',
    speaking: 'shadow-[0_0_150px_rgba(163,230,53,0.4),0_0_300px_rgba(132,204,22,0.2)]',
    processing: 'shadow-[0_0_80px_rgba(20,184,166,0.3),0_0_160px_rgba(52,211,153,0.2)]',
    error: 'shadow-[0_0_100px_rgba(239,68,68,0.3),0_0_200px_rgba(220,38,38,0.15)]',
  };
  return shadows[uiVoiceState] || shadows.idle;
};
