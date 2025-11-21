import { logger, LogEntry } from '@/shared/lib/logger';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function streamChatCompletion(
  history: ChatMessage[],
  systemPrompt?: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  logger.info('CHAT_SERVICE', 'Sending request to LLM...');
  const start = Date.now();
  
  try {
    // Safe access to localStorage
    const accessCode = typeof window !== 'undefined' 
      ? localStorage.getItem('aether_access_code') || '' 
      : '';
    
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-access-code': accessCode
      },
      body: JSON.stringify({ messages: history, system: systemPrompt }),
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
              assistantMessage += data.content;
              if (onChunk) onChunk(data.content);
            } else if (data.type === 'usage') {
              logger.info('API', 'Token Usage', data.data);
            } else if (data.type === 'error') {
              logger.error('API', 'Stream Error', { error: data.content });
            }
          } catch (e) {
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
  } catch (e: any) {
    logger.error('CHAT_SERVICE', 'Failed to send request', { 
      error: e.message || 'Unknown error',
      details: JSON.stringify(e, Object.getOwnPropertyNames(e)) 
    });
    // Re-throw to be handled by the caller
    throw new Error("Failed to get chat completion.");
  }
}

export async function testApiConnection(): Promise<void> {
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
      
      // Consume stream and check for usage
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                    const data = JSON.parse(line.slice(6));
                    if (data.type === 'usage') {
                        logger.info('API', 'Test Usage', data.data);
                    }
                } catch (e) {
                    // Ignore parsing errors for test
                }
              }
            }
        }
      }
      
      logger.info('API', 'Test successful', { latencyMs: Date.now() - start });
    } catch (e: any) {
      logger.error('API', 'Test error', { message: e.message });
    }
}
