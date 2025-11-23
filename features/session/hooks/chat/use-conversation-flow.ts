import { useState, useCallback } from 'react';
import { logger } from '@/shared/lib/logger';

export type ConversationStage = 'boot' | 'introduction' | 'main-loop' | 'ending';

interface UseConversationFlowProps {
  onSpeak: (text: string, options?: { autoResume?: boolean; onStart?: () => void }) => Promise<void>;
  injectAssistantMessage: (text: string) => void;
  startListening: () => void;
}

export function useConversationFlow({
  onSpeak,
  injectAssistantMessage,
  startListening
}: UseConversationFlowProps) {
  const [stage, setStage] = useState<ConversationStage>('boot');

  const startIntroduction = useCallback(() => {
    logger.info('FLOW', 'Starting Introduction Stage');
    setStage('introduction');

    const greeting = "Hello, I am Aether. I'm here to listen, validate your feelings, and help you explore your inner world without judgment. How are you feeling right now?";

    // Return a promise that resolves when audio STARTS, not ends.
    // This allows the boot sequence to complete (removing loading screen) exactly when speaking begins.
    return new Promise<void>((resolveStart) => {
        // Safety timeout: If audio doesn't start within 3s (e.g. iOS blocked autoplay), 
        // we force the app to continue so the user isn't stuck at loading screen.
        const timeoutId = setTimeout(() => {
            logger.warn('FLOW', 'Greeting audio start timed out - forcing continuation');
            injectAssistantMessage(greeting); // Ensure text is shown even if audio failed
            startListening(); // Start listening so user can speak
            resolveStart(); 
        }, 3000);

        onSpeak(greeting, {
            autoResume: true, // Ensure we auto-listen after greeting
            onStart: () => {
                clearTimeout(timeoutId);
                logger.info('FLOW', 'Greeting audio started');
                injectAssistantMessage(greeting);
                resolveStart(); // Signal boot completion here
            }
        }).then(() => {
            // This runs when speaking FINISHES
            setStage('main-loop');
            logger.info('FLOW', 'Transitioned to Main Loop');
        }).catch(error => {
            clearTimeout(timeoutId);
            logger.error('FLOW', 'Error during introduction', error);
            // Fallback: try to listen anyway
            startListening();
            setStage('main-loop');
            resolveStart(); // Ensure we don't hang if error occurs
        });
    });
  }, [onSpeak, injectAssistantMessage, startListening]);

  return {
    state: {
      stage
    },
    actions: {
      setStage,
      startIntroduction
    }
  };
}
