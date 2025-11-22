import { useState, useRef, useCallback } from 'react';
import { logger } from '@/shared/lib/logger';
import { chatService } from '@/features/ai/services/chat-service';
import { memoryService } from '@/features/memory/services/memory-service';
import { buildSystemPrompt } from '@/features/ai/utils/system-prompt';
import type { ChatMessage, TokenUsage } from '@/features/ai/types/chat.types';
import type { Memory } from '@/features/memory/types/memory.types';

interface AgentOptions {
  accessCode: string;
  interactionCount: number;
}

interface ProcessingOptions {
  onChunk: (chunk: string) => void;
  onStart: () => void;
  onEnd: () => void;
}

export function useAgentCognition({ accessCode, interactionCount }: AgentOptions) {
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
  const isProcessingRef = useRef(false);

  // Helper to update usage
  const handleUsage = useCallback((usage: TokenUsage) => {
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
              cost: `$${totalCost.toFixed(5)}`,
              model: usage.model
          };
      });
  }, []);

  const retrieveMemories = async (query: string): Promise<Memory[]> => {
    // Retrieve relevant memories (async, non-blocking with timeout)
    const memoryPromise = memoryService.queryRelevant(query, { limit: 5 }).catch((err) => {
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
    return relevantMemories;
  };

  const processUserMessage = useCallback(async (
    text: string, 
    history: ChatMessage[], 
    callbacks: ProcessingOptions
  ): Promise<string> => {
    isProcessingRef.current = true;
    callbacks.onStart();

    try {
      // 1. Retrieve Memory
      const relevantMemories = await retrieveMemories(text);

      // 2. Build Prompt
      const sessionInteractionCount = Math.floor(history.length / 2);
      const systemPrompt = buildSystemPrompt({
        interactionCount: interactionCount + sessionInteractionCount,
        relevantMemories: relevantMemories.map(m => m.content),
      });

      logger.debug('SESSION', 'Starting stream completion');
      
      // 3. Call AI
      const assistantMessageText = await chatService.streamChatCompletion(
          history, 
          { systemPrompt, accessCode }, 
          callbacks.onChunk,
          handleUsage
      );
      
      // 4. Extract Memory (Fire and forget)
      memoryService.extractAndStore({
        userMessage: text,
        assistantMessage: assistantMessageText,
        timestamp: Date.now(),
        interactionCount: sessionInteractionCount,
      }).catch((err) => {
        logger.warn('MEMORY', 'Failed to extract memories', err);
      });

      return assistantMessageText;
    } catch (error) {
      logger.error('AGENT', 'Error processing user message', error);
      throw error;
    } finally {
      isProcessingRef.current = false;
      callbacks.onEnd();
    }
  }, [accessCode, interactionCount, handleUsage]);

  const processSilence = useCallback(async (
    history: ChatMessage[], 
    callbacks: ProcessingOptions
  ): Promise<string> => {
    isProcessingRef.current = true;
    callbacks.onStart();

    try {
      // 1. Retrieve Memory for re-engagement
      const relevantMemories = await retrieveMemories('general conversation topics preferences interests');

      // 2. Build Prompt
      const sessionInteractionCount = Math.floor(history.length / 2);
      const systemPrompt = buildSystemPrompt({
        interactionCount: sessionInteractionCount,
        silenceDuration: 30,
        relevantMemories: relevantMemories.map(m => m.content),
      });

      // 3. Call AI
      const assistantMessageText = await chatService.streamChatCompletion(
          history, 
          { systemPrompt, accessCode }, 
          callbacks.onChunk,
          handleUsage
      );
      
      return assistantMessageText;
    } catch (error) {
        logger.error('AGENT', 'Error processing silence', error);
        throw error;
    } finally {
        isProcessingRef.current = false;
        callbacks.onEnd();
    }
  }, [accessCode, handleUsage]);

  return {
    isProcessing: isProcessingRef,
    tokenUsage,
    processUserMessage,
    processSilence
  };
}
