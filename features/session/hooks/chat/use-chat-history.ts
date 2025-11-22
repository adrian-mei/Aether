import { useState, useRef, useCallback } from 'react';
import type { ChatMessage } from '@/features/ai/types/chat.types';

export function useChatHistory() {
  const historyRef = useRef<ChatMessage[]>([]);
  const [turnCount, setTurnCount] = useState<number>(0);

  const addMessage = useCallback((message: ChatMessage) => {
    historyRef.current = [...historyRef.current, message];
    setTurnCount(Math.floor(historyRef.current.length / 2));
  }, []);

  const addMessages = useCallback((messages: ChatMessage[]) => {
    historyRef.current = [...historyRef.current, ...messages];
    setTurnCount(Math.floor(historyRef.current.length / 2));
  }, []);

  const resetHistory = useCallback(() => {
    historyRef.current = [];
    setTurnCount(0);
  }, []);

  const getHistory = useCallback(() => historyRef.current, []);

  return {
    turnCount,
    addMessage,
    addMessages,
    resetHistory,
    getHistory,
    historyRef // Exposed for read access if needed by other refs, but prefer getHistory
  };
}
