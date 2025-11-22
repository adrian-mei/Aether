import { renderHook, act, waitFor } from '@testing-library/react';
import { useMessageQueue } from './use-message-queue';

describe('useMessageQueue', () => {
  const mockOnSpeak = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSpeak.mockResolvedValue(undefined);
  });

  it('should parse chunks into sentences and call onSpeak', async () => {
    const { result } = renderHook(() => useMessageQueue({ onSpeak: mockOnSpeak }));

    act(() => {
      result.current.startStream();
    });

    act(() => {
      result.current.handleChunk('Hello world.');
    });

    await waitFor(() => {
      expect(mockOnSpeak).toHaveBeenCalledWith('Hello world.', expect.objectContaining({ autoResume: false }));
    });
  });

  it('should accumulate chunks until a delimiter is found', async () => {
    const { result } = renderHook(() => useMessageQueue({ onSpeak: mockOnSpeak }));

    act(() => {
      result.current.startStream();
    });

    act(() => {
      result.current.handleChunk('Hello');
    });
    
    // Should not speak yet
    expect(mockOnSpeak).not.toHaveBeenCalled();

    act(() => {
      result.current.handleChunk(' world.');
    });

    await waitFor(() => {
      expect(mockOnSpeak).toHaveBeenCalledWith('Hello world.', expect.any(Object));
    });
  });

  it('should flush remainder on endStream', async () => {
    const { result } = renderHook(() => useMessageQueue({ onSpeak: mockOnSpeak }));

    act(() => {
      result.current.startStream();
    });

    act(() => {
      result.current.handleChunk('This is the end');
    });

    // Should not speak yet
    expect(mockOnSpeak).not.toHaveBeenCalled();

    act(() => {
      result.current.endStream();
    });

    await waitFor(() => {
      expect(mockOnSpeak).toHaveBeenCalledWith('This is the end', expect.objectContaining({ autoResume: true }));
    });
  });
});
