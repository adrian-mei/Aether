import { logger, LogEntry } from '@/shared/lib/logger';

function toLogLevel(category: string): 'info' | 'warn' | 'error' | 'debug' {
    const lower = category.toLowerCase();
    if (lower === 'error') return 'error';
    if (lower === 'warn') return 'warn';
    return 'info';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function streamChatCompletion(
  history: ChatMessage[]
): Promise<string> {
  logger.info('CHAT_SERVICE', 'Sending request to LLM...');
  const start = Date.now();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = '';
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep the last partial line

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = JSON.parse(line.substring(6));
                if (data.type === 'log') {
                    const level = toLogLevel(data.category);
                    logger.log(level, data.category, data.message, data.data);
                } else if (data.type === 'text') {
                    assistantMessage += data.value;
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
    logger.error('CHAT_SERVICE', 'Failed to send request', { error: e.message });
    // Re-throw to be handled by the caller
    throw new Error("Failed to get chat completion.");
  }
}

export async function testApiConnection(): Promise<void> {
    logger.info('APP', 'Testing API connection...');
    try {
      const start = Date.now();
      const res = await fetch('/api/chat', {
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
      
      // Consume stream
      const reader = res.body?.getReader();
      if (reader) {
        await reader.read(); 
        reader.cancel();
      }
      
      logger.info('API', 'Test successful', { latencyMs: Date.now() - start });
    } catch (e: any) {
      logger.error('API', 'Test error', { message: e.message });
    }
}
