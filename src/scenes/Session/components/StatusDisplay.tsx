import React, { useState, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { ResponseFeedback } from './ResponseFeedback';
import { logger } from '@/shared/lib/logger';
import { useTypewriter, useTypewriterWithAudioSync } from '../Orb/Typewriter.logic';

interface StatusDisplayProps {
  uiVoiceState: string;
  visualStatus: {
    text: string;
    subtext: string;
    isFaded?: boolean;
    speed?: number;
    audioDuration?: number;
  };
  currentAssistantMessage?: string;
  turnCount: number;
}

export const StatusDisplay = ({
  uiVoiceState,
  visualStatus,
  currentAssistantMessage,
  turnCount,
}: StatusDisplayProps) => {
  const [hasGivenFeedback, setHasGivenFeedback] = useState(false);
  const [shouldShowFeedback, setShouldShowFeedback] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | undefined>(undefined);
  
  // Feedback Logic
  useEffect(() => {
    if (currentAssistantMessage && currentAssistantMessage !== lastMessage) {
        setLastMessage(currentAssistantMessage);
        setHasGivenFeedback(false);
        // Logic: Only ask for feedback after 5 turns, and then randomly (30% chance)
        if (turnCount > 5) {
            setShouldShowFeedback((currentAssistantMessage.length % 10) < 3);
        } else {
            setShouldShowFeedback(false);
        }
    }
  }, [currentAssistantMessage, lastMessage, turnCount]);
  
  const handleFeedback = (type: 'positive' | 'neutral') => {
    setHasGivenFeedback(true);
    logger.info('feedback', 'User provided feedback', { 
      rating: type, 
      message: currentAssistantMessage 
    });
  };

  const { text, subtext, isFaded, speed, audioDuration } = visualStatus;

  // Always call both hooks (Rules of Hooks requires consistent hook calls)
  const syncedText = useTypewriterWithAudioSync(text, audioDuration, speed);
  const regularText = useTypewriter(text, speed);

  // Use audio-synced text when duration is available, otherwise use regular
  const displayedText = audioDuration !== undefined ? syncedText : regularText;

  const textClasses = `
    text-lg md:text-xl font-light tracking-wide transition-all duration-500
    ${isFaded ? 'opacity-40 blur-[0.5px]' : ''}
    ${uiVoiceState === 'listening' ? 'text-emerald-300' : 
      uiVoiceState === 'speaking' ? 'text-lime-300' :
      uiVoiceState === 'processing' ? 'text-teal-300' :
      'text-green-300'}
  `;

  const subtextClasses = "text-emerald-400/50 text-xs md:text-sm font-light";

  return (
    <div className="relative w-auto max-w-[90vw] md:max-w-4xl transition-all duration-300">
      {/* Added min-h-[140px] to prevent layout shifts (flickering) when text changes */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-950/50 to-teal-950/40 rounded-2xl px-6 md:px-10 py-4 md:py-5 border border-emerald-400/10 shadow-lg w-auto min-w-[200px] md:min-w-[240px] min-h-[140px] flex flex-col justify-center transition-all duration-300">
        <div className="relative text-center space-y-1">
          {/* Invisible Sizer (Uses full text to set stable dimensions) */}
          <div className="invisible select-none" aria-hidden="true">
            <p className={textClasses}>{text || ' '}</p>
            <p className={subtextClasses}>{subtext}</p>
          </div>

          {/* Visible Animator (Overlays the sizer) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {uiVoiceState === 'listening' && (
              <Mic className="w-6 h-6 text-blue-400 animate-pulse mb-2" />
            )}
            <p className={textClasses}>
              {displayedText}
            </p>
            <p className={subtextClasses}>
              {subtext}
            </p>
          </div>
        </div>

        {/* Voice activity indicator */}
        {uiVoiceState !== 'idle' && uiVoiceState !== 'error' && (
          <div className="flex justify-center items-center gap-1 mt-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`
                  w-1 h-4 rounded-full
                  ${uiVoiceState === 'listening' ? 'bg-emerald-400/60' :
                    uiVoiceState === 'speaking' ? 'bg-lime-400/60' :
                    'bg-teal-400/60'}
                  animate-wave
                `}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  height: uiVoiceState === 'speaking' ? `${((i * 1337) % 16) + 8}px` : '16px',
                }}
              />
            ))}
          </div>
        )}

        {/* Feedback Control */}
        {uiVoiceState === 'speaking' && currentAssistantMessage && shouldShowFeedback && !hasGivenFeedback && (
          <ResponseFeedback onFeedback={handleFeedback} />
        )}
      </div>
    </div>
  );
};
