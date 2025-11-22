import { logger } from '@/shared/lib/logger';
import type { IChatService, ChatMessage, ChatOptions } from '../types/chat.types';

export class ChatService implements IChatService {
  private static instance: ChatService;

  private constructor() {}

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  public async streamChatCompletion(
    history: ChatMessage[],
    options: ChatOptions,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    logger.info('CHAT_SERVICE', 'Sending request to LLM...');
    const start = Date.now();
    
    try {
      // This logic is specific to the REST implementation.
      // If we switch to WebSocket, we would subclass or change implementation here.
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-access-code': options.accessCode || ''
        },
        body: JSON.stringify({ 
            messages: history, 
            system: options.systemPrompt,
            model: options.model
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      if (!response.body) {
        throw new Error('No response body');
      }

      let assistantMessage = '';
      const stream = response.body;
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        // Keep the last potentially incomplete chunk in buffer
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'text') {
                if (isFirstChunk) {
                  logger.info('CHAT_SERVICE', 'First token received', { ttftMs: Date.now() - start });
                  isFirstChunk = false;
                }
                assistantMessage += data.content;
                if (onChunk) onChunk(data.content);
              } else if (data.type === 'usage') {
                logger.info('API', 'Token Usage', data.data);
              } else if (data.type === 'error') {
                logger.error('API', 'Stream Error', { error: data.content });
              }
            } catch {
              console.error('Failed to parse SSE data:', dataStr);
            }
          }
        }
      }

      logger.info('CHAT_SERVICE', 'Response finished', {
        textLength: assistantMessage.length,
        totalDurationMs: Date.now() - start,
      });

      return assistantMessage;
    } catch (e: unknown) {
      const error = e as Error;
      logger.error('CHAT_SERVICE', 'Failed to send request', { 
        error: error.message || 'Unknown error',
        details: JSON.stringify(error, Object.getOwnPropertyNames(error)) 
      });
      throw new Error("Failed to get chat completion.");
    }
  }

  public async testApiConnection(): Promise<void> {
    logger.info('APP', 'Testing API connection...');
    try {
      const start = Date.now();
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [{ role: 'user', content: 'PING' }] 
        })
      });
      
      if (!res.ok) {
        const text = await res.text();
        logger.error('API', 'Test failed', { status: res.status, body: text });
        throw new Error(`API responded with ${res.status}: ${text}`);
      }
      
      // Consume stream... (simplified for brevity as this is dev tool)
      await res.text();
      
      logger.info('API', 'Test successful', { latencyMs: Date.now() - start });
    } catch (e: unknown) {
      const error = e as Error;
      logger.error('API', 'Test error', { message: error.message });
    }
  }
}

export const chatService = ChatService.getInstance();
export type { ChatMessage }; // Re-export for compatibility if needed
