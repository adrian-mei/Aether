import { useEffect, useRef } from 'react';
import { logger } from '@/shared/lib/logger';
import type { useVoiceInteraction } from '@/features/voice/hooks/core/use-voice-interaction';
import type { useConversation } from '@/features/session/hooks/chat/use-conversation';
import type { useSessionAccess } from '@/features/session/hooks/access/use-session-access';
import type { SessionStatus } from '@/features/session/hooks/use-session-manager';

interface UseInteractionLoopProps {
  voice: ReturnType<typeof useVoiceInteraction>;
  conversation: ReturnType<typeof useConversation>;
  access: ReturnType<typeof useSessionAccess>;
  status: SessionStatus;
  resetSession: () => void;
}

export function useInteractionLoop({
  voice,
  conversation,
  access,
  status,
  resetSession
}: UseInteractionLoopProps) {
  // Refs for stable callbacks to avoid effect dependency chains
  const onInputCompleteRef = useRef<(text: string) => void>(() => {});
  const onSilenceRef = useRef<() => void>(() => {});

  // Update refs when dependencies change
  useEffect(() => {
    onInputCompleteRef.current = async (text) => {
        // Check limits
        if (access.actions.incrementInteraction()) {
            conversation.actions.handleInputComplete(text);
        } else {
            const limitMsg = "I have enjoyed our time together. To continue our journey, please join the waitlist.";
            await voice.speak(limitMsg, { autoResume: false });
            resetSession();
        }
    };
    
    onSilenceRef.current = conversation.actions.handleSilence;
  }, [access.actions, conversation.actions, voice.speak, resetSession]);

  // Handle Voice Events (Reactive -> Imperative Bridge)
  useEffect(() => {
      if (voice.lastInput) {
          onInputCompleteRef.current(voice.lastInput.text);
      }
  }, [voice.lastInput]);

  useEffect(() => {
      if (voice.silenceDetected) {
          onSilenceRef.current();
      }
  }, [voice.silenceDetected]);

  // Watchdog for timeout (60s processing hang)
  // We track duration of the *current* processing state, not last conversation activity
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (voice.state === 'processing') {
      const processingStart = Date.now();
      
      intervalId = setInterval(() => {
        const elapsed = Date.now() - processingStart;
        
        // 60 seconds timeout (increased for slow mobile WASM generation)
        if (elapsed > 60000) {
          logger.warn('SESSION', 'Request timed out (processing hang)', { elapsedMs: elapsed });
          voice.reset();
          logger.info('SESSION', 'Chat ended (watchdog timeout)');
        }
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [voice.state, voice.reset]);
}
