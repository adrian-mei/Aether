import { chatService } from '@/features/ai/services/chat-service';
import type { ChatMessage } from '@/features/ai/types/chat.types';

// Mock logger to suppress output during tests
jest.mock('@/shared/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ChatService', () => {
  const mockFetch = jest.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  const createMockStreamResponse = (chunks: string[]) => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => {
          controller.enqueue(encoder.encode(chunk));
        });
        controller.close();
      },
    });

    return {
      ok: true,
      body: stream,
    };
  };

  it('should successfully stream and parse chat completion', async () => {
    const history: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
    const mockChunks = [
      'data: {"type":"text","content":"Hello"}\n\n',
      'data: {"type":"text","content":" there"}\n\n',
      'data: {"type":"usage","data":{"total":10}}\n\n',
    ];

    mockFetch.mockResolvedValue(createMockStreamResponse(mockChunks));

    const onChunk = jest.fn();
    const result = await chatService.streamChatCompletion(
        history, 
        { systemPrompt: 'sys-prompt' }, 
        onChunk
    );

    expect(result).toBe('Hello there');
    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onChunk).toHaveBeenNthCalledWith(1, 'Hello');
    expect(onChunk).toHaveBeenNthCalledWith(2, ' there');
    
    expect(mockFetch).toHaveBeenCalledWith('/api/gemini', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ messages: history, system: 'sys-prompt' }),
    }));
  });

  it('should include access code in headers', async () => {
    const history: ChatMessage[] = [{ role: 'user', content: 'Hi' }];
    const accessCode = 'secret-123';
    
    mockFetch.mockResolvedValue(createMockStreamResponse([]));

    await chatService.streamChatCompletion(history, { accessCode });

    expect(mockFetch).toHaveBeenCalledWith('/api/gemini', expect.objectContaining({
      headers: expect.objectContaining({
        'x-access-code': 'secret-123',
      }),
    }));
  });

  it('should handle API errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      body: null,
    });

    await expect(chatService.streamChatCompletion([], {})).rejects.toThrow('Failed to get chat completion');
  });

  it('should handle malformed SSE data gracefully', async () => {
    const mockChunks = [
      'data: {"type":"text","content":"Good"}\n\n',
      'data: INVALID_JSON\n\n',
      'data: {"type":"text","content":" job"}\n\n',
    ];

    mockFetch.mockResolvedValue(createMockStreamResponse(mockChunks));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await chatService.streamChatCompletion([], {});

    expect(result).toBe('Good job');
    expect(consoleSpy).toHaveBeenCalled(); // Should log parse error
    
    consoleSpy.mockRestore();
  });
});
