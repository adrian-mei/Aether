import { renderHook, act } from '@testing-library/react';
import { useConversation } from './use-conversation';
import { streamChatCompletion } from '@/features/ai/services/chat-service';
import { memoryService } from '@/features/memory/services/memory-service';

jest.mock('@/features/ai/services/chat-service');
jest.mock('@/features/memory/services/memory-service');
jest.mock('@/shared/lib/logger');
jest.mock('@/features/session/hooks/use-message-queue', () => ({
  useMessageQueue: ({ onSpeak }: any) => ({
    handleChunk: jest.fn(),
    startStream: jest.fn(),
    endStream: jest.fn(),
  })
}));

describe('useConversation', () => {
  const mockOnSpeak = jest.fn();
  const mockOnSessionEnd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (memoryService.queryRelevant as jest.Mock).mockResolvedValue([]);
    (streamChatCompletion as jest.Mock).mockResolvedValue('Assistant response');
  });

  it('should initialize correctly', () => {
    const { result } = renderHook(() => useConversation({
      accessCode: '',
      interactionCount: 0,
      onSpeak: mockOnSpeak,
      onSessionEnd: mockOnSessionEnd,
      isSessionActive: true
    }));

    expect(result.current.state.currentAssistantMessage).toBe('');
    expect(result.current.state.isProcessing).toBe(false);
  });

  it('should handle user input', async () => {
    const { result } = renderHook(() => useConversation({
      accessCode: 'code',
      interactionCount: 0,
      onSpeak: mockOnSpeak,
      onSessionEnd: mockOnSessionEnd,
      isSessionActive: true
    }));

    await act(async () => {
      await result.current.actions.handleInputComplete('Hello');
    });

    expect(streamChatCompletion).toHaveBeenCalled();
    expect(memoryService.extractAndStore).toHaveBeenCalled();
  });

  it('should handle stop commands', async () => {
    const { result } = renderHook(() => useConversation({
      accessCode: '',
      interactionCount: 0,
      onSpeak: mockOnSpeak,
      onSessionEnd: mockOnSessionEnd,
      isSessionActive: true
    }));

    await act(async () => {
      await result.current.actions.handleInputComplete('Goodbye');
    });

    expect(mockOnSpeak).toHaveBeenCalledWith(expect.stringContaining('Goodbye'), expect.anything());
    expect(mockOnSessionEnd).toHaveBeenCalled();
  });
});
