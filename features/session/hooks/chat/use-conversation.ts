import { useState, useRef, useCallback } from 'react';
import { logger } from '@/shared/lib/logger';
import { chatService } from '@/features/ai/services/chat-service';
import type { ChatMessage, TokenUsage } from '@/features/ai/types/chat.types';
import type { Memory } from '@/features/memory/types/memory.types';
import { buildSystemPrompt } from '@/features/ai/utils/system-prompt';
import { memoryService } from '@/features/memory/services/memory-service';
import { useMessageQueue } from '@/features/session/hooks/utils/use-message-queue';

interface UseConversationProps {
  accessCode: string;
  interactionCount: number;
  onSpeak: (text: string, options?: { autoResume?: boolean; onStart?: (duration: number) => void }) => Promise<void>;
  onSessionEnd: () => void;
  isSessionActive: boolean;
}

export function useConversation({
  accessCode,
  interactionCount,
  onSpeak,
  onSessionEnd,
  isSessionActive
}: UseConversationProps) {
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState<string>('');
  const [currentMessageDuration, setCurrentMessageDuration] = useState<number>(0);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
  const [turnCount, setTurnCount] = useState<number>(0);
  
  const historyRef = useRef<ChatMessage[]>([]);
  const isProcessingRef = useRef(false);
  const lastActivityRef = useRef<number>(0);

  // Message Queue for Streaming
  const { handleChunk, startStream, endStream } = useMessageQueue({
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
      // Wait for goodbye to finish speaking before resetting
      await onSpeak(goodbye, { autoResume: false });
      onSessionEnd();
      logger.info('SESSION', 'Chat ended (user command)');
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: text };
    const newHistory = [...historyRef.current, userMessage];
    historyRef.current = newHistory;
    setTurnCount(Math.floor(newHistory.length / 2));

    // Retrieve relevant memories (async, non-blocking with timeout)
    const memoryPromise = memoryService.queryRelevant(text, { limit: 5 }).catch((err) => {
        logger.error('SESSION', 'Memory retrieval failed', err);
        return [] as Memory[];
    });
    
    const timeoutPromise = new Promise<Memory[]>((resolve) => setTimeout(() => {
        logger.warn('SESSION', 'Memory retrieval timed out after 5000ms, skipping');
        resolve([]);
    }, 5000));
    
    const relevantMemories = await Promise.race([memoryPromise, timeoutPromise]);
    
    if (relevantMemories.length > 0) {
        logger.debug('SESSION', 'Retrieved memories', { count: relevantMemories.length });
    }

    // Build system prompt with context and memories
    const sessionInteractionCount = Math.floor(newHistory.length / 2);
    const systemPrompt = buildSystemPrompt({
      interactionCount: interactionCount + sessionInteractionCount, // Use global + session count
      relevantMemories: relevantMemories.map(m => m.content),
      // TODO: Add mood analysis and other context signals
    });

    try {
      isProcessingRef.current = true;
      lastActivityRef.current = Date.now();
      startStream();

      logger.debug('SESSION', 'Starting stream completion');
      const assistantMessageText = await chatService.streamChatCompletion(
          newHistory, 
          {
            systemPrompt,
            accessCode
          }, 
          (chunk) => {
            lastActivityRef.current = Date.now();
            handleChunk(chunk);
          },
          (usage) => {
              setTokenUsage(prev => {
                  const safePromptTokens = usage.promptTokens || 0;
                  const safeCompletionTokens = usage.completionTokens || 0;
                  const safeTotalTokens = usage.totalTokens || 0;
                  
                  const prevCost = parseFloat(prev.cost?.replace('$', '') || '0');
                  const newCost = parseFloat(usage.cost?.replace('$', '') || '0');
                  const totalCost = (isNaN(prevCost) ? 0 : prevCost) + (isNaN(newCost) ? 0 : newCost);

                  return {
                      promptTokens: prev.promptTokens + safePromptTokens,
                      completionTokens: prev.completionTokens + safeCompletionTokens,
                      totalTokens: prev.totalTokens + safeTotalTokens,
                      // Keep the latest cost/model for reference, or accumulate cost if parsed
                      cost: `$${totalCost.toFixed(5)}`,
                      model: usage.model
                  };
              });
          }
      );
      
      endStream();
      isProcessingRef.current = false;

      historyRef.current = [...newHistory, { role: 'assistant', content: assistantMessageText }];
      setTurnCount(Math.floor(historyRef.current.length / 2));

      // Extract and store memories (non-blocking)
      memoryService.extractAndStore({
        userMessage: text,
        assistantMessage: assistantMessageText,
        timestamp: Date.now(),
        interactionCount: sessionInteractionCount,
      }).catch((err) => {
        logger.warn('MEMORY', 'Failed to extract memories', err);
      });

      if (!assistantMessageText.trim()) {
        logger.warn('SESSION', 'Empty response received');
        const errorMsg = "I'm sorry, I didn't catch that.";
        onSpeak(errorMsg);
      }
    } catch {
      endStream();
      isProcessingRef.current = false;
      const errorMsg = "I'm having trouble connecting. Please try again.";
      onSpeak(errorMsg);
    }
  }, [handleChunk, startStream, endStream, accessCode, onSpeak, onSessionEnd, interactionCount]);

  const handleSilence = useCallback(async () => {
    if (isProcessingRef.current || !isSessionActive) return;
    
    logger.info('SESSION', 'User silence detected, re-engaging...');
    
    // Inject a system note into history as a user message to prompt re-engagement
    const silenceMessage: ChatMessage = { 
        role: 'user', 
        content: '(The user has been silent for a while. Gently re-engage them. Suggest a topic, ask about their mood, or just offer presence.)' 
    };
    
    const newHistory = [...historyRef.current, silenceMessage];
    historyRef.current = newHistory;
    setTurnCount(Math.floor(newHistory.length / 2));

    // Retrieve relevant memories for personalized re-engagement
    const relevantMemories = await memoryService.queryRelevant(
      'general conversation topics preferences interests',
      { limit: 3 }
    ).catch(() => []);

    const sessionInteractionCount = Math.floor(newHistory.length / 2);
    const systemPrompt = buildSystemPrompt({
      interactionCount: sessionInteractionCount,
      silenceDuration: 30, // Signal long silence to system prompt builder
      relevantMemories: relevantMemories.map(m => m.content),
    });

    try {
      isProcessingRef.current = true;
      startStream();

      const assistantMessageText = await chatService.streamChatCompletion(
          newHistory, 
          {
            systemPrompt
          }, 
          handleChunk
      );
      
      endStream();
      isProcessingRef.current = false;

      historyRef.current = [...newHistory, { role: 'assistant', content: assistantMessageText }];
      setTurnCount(Math.floor(historyRef.current.length / 2));
    } catch (error) {
        logger.error('SESSION', 'Failed to handle silence', error);
        isProcessingRef.current = false;
        endStream();
        // Fallback static message
        const fallback = "I'm here whenever you're ready.";
        setCurrentAssistantMessage(fallback);
        onSpeak(fallback);
    }
  }, [isSessionActive, startStream, endStream, handleChunk, onSpeak]);

  const resetConversation = useCallback(() => {
      historyRef.current = [];
      setCurrentAssistantMessage('');
      isProcessingRef.current = false;
      lastActivityRef.current = 0;
      setTurnCount(0);
  }, []);

  const injectAssistantMessage = useCallback((text: string) => {
    const message: ChatMessage = { role: 'assistant', content: text };
    historyRef.current = [...historyRef.current, message];
    setCurrentAssistantMessage(text);
    setTurnCount(Math.floor(historyRef.current.length / 2));
    // Note: injectAssistantMessage doesn't have audio duration context, 
    // so default to 0 or let speak() handle it via onStart if used with speak().
  }, []);

  const getLastActivity = useCallback(() => lastActivityRef.current, []);

  return {
    state: {
      currentAssistantMessage,
      currentMessageDuration,
      turnCount,
      tokenUsage
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
