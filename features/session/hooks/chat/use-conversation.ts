import { useState, useRef, useCallback } from 'react';
import { logger } from '@/shared/lib/logger';
import { useMessageQueue } from '@/features/session/hooks/utils/use-message-queue';
import { useChatHistory } from './use-chat-history';
import { useAgentCognition } from './use-agent-cognition';

interface UseConversationProps {
  accessCode: string;
  interactionCount: number;
  onSpeak: (text: string, options?: { autoResume?: boolean; onStart?: (duration: number) => void }) => Promise<void>;
  onSessionEnd: () => void;
  isSessionActive: boolean;
  shouldBuffer?: boolean;
}

export function useConversation({
  accessCode,
  interactionCount,
  onSpeak,
  onSessionEnd,
  isSessionActive,
  shouldBuffer = false
}: UseConversationProps) {
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState<string>('');
  const [currentMessageDuration, setCurrentMessageDuration] = useState<number>(0);
  const lastActivityRef = useRef<number>(Date.now()); // Initialize to now to prevent immediate timeout

  // 1. History Management
  const history = useChatHistory();

  // 2. Agent Cognition (Brain)
  const agent = useAgentCognition({ accessCode, interactionCount });

  // 3. Output/Streaming (Voice)
  const { handleChunk, startStream, endStream } = useMessageQueue({
    shouldBuffer,
    onSpeak: async (text, options) => {
      await onSpeak(text, {
        ...options,
        onStart: (duration) => {
            setCurrentAssistantMessage(text);
            setCurrentMessageDuration(duration);
        }
      });
    }
  });

  const handleInputComplete = useCallback(async (text: string) => {
    logger.info('SESSION', 'Processing input', { text });

    // Check for stop commands
    const lowerText = text.trim().toLowerCase().replace(/[.!?,]$/, '');
    const stopCommands = ['stop', 'quit', 'pause', 'exit', 'end session', 'end chat', 'bye', 'goodbye'];
    
    if (stopCommands.includes(lowerText)) {
      logger.info('SESSION', 'User requested stop', { command: lowerText });
      const goodbye = "Goodbye.";
      await onSpeak(goodbye, { autoResume: false });
      onSessionEnd();
      logger.info('SESSION', 'Chat ended (user command)');
      return;
    }

    // Add user message to history
    history.addMessage({ role: 'user', content: text });
    
    // Process with Agent
    try {
        const assistantText = await agent.processUserMessage(text, history.getHistory(), {
            onStart: () => {
                lastActivityRef.current = Date.now();
                startStream();
            },
            onChunk: (chunk) => {
                lastActivityRef.current = Date.now();
                handleChunk(chunk);
            },
            onEnd: () => {
                endStream();
            }
        });

        // Add assistant message to history
        history.addMessage({ role: 'assistant', content: assistantText });

        if (!assistantText.trim()) {
            logger.warn('SESSION', 'Empty response received');
            onSpeak("I'm sorry, I didn't catch that.");
        }
    } catch {
        // Error handling is largely done inside agent, but we handle UI feedback here if needed
        onSpeak("I'm having trouble connecting. Please try again.");
    }
  }, [history, agent, startStream, endStream, handleChunk, onSpeak, onSessionEnd]);

  const handleSilence = useCallback(async () => {
    if (agent.isProcessing.current || !isSessionActive) return;
    
    logger.info('SESSION', 'User silence detected, re-engaging...');
    
    // Inject silence prompt to history
    const silenceMessage = { 
        role: 'user' as const, 
        content: '(The user has been silent for a while. Gently re-engage them. Suggest a topic, ask about their mood, or just offer presence.)' 
    };
    history.addMessage(silenceMessage);

    try {
        const assistantText = await agent.processSilence(history.getHistory(), {
            onStart: () => {
                startStream();
            },
            onChunk: (chunk) => {
                handleChunk(chunk);
            },
            onEnd: () => {
                endStream();
            }
        });

        history.addMessage({ role: 'assistant', content: assistantText });
    } catch (error) {
        logger.error('SESSION', 'Failed to handle silence', error);
        const fallback = "I'm here whenever you're ready.";
        setCurrentAssistantMessage(fallback);
        onSpeak(fallback);
    }
  }, [agent, isSessionActive, history, startStream, endStream, handleChunk, onSpeak]);

  const injectAssistantMessage = useCallback((text: string) => {
    history.addMessage({ role: 'assistant', content: text });
    setCurrentAssistantMessage(text);
  }, [history]);

  const resetConversation = useCallback(() => {
    history.resetHistory();
    setCurrentAssistantMessage('');
    lastActivityRef.current = 0;
  }, [history]);

  const getLastActivity = useCallback(() => lastActivityRef.current, []);

  return {
    state: {
      currentAssistantMessage,
      currentMessageDuration,
      turnCount: history.turnCount,
      tokenUsage: agent.tokenUsage
    },
    actions: {
      handleInputComplete,
      handleSilence,
      resetConversation,
      injectAssistantMessage,
      getLastActivity
    }
  };
}
