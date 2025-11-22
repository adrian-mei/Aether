import { renderHook, act, waitFor } from '@testing-library/react';
import { useBootSequence } from './use-boot-sequence';
import { requestMicrophonePermission } from '@/features/voice/utils/permissions';
import { kokoroService } from '@/features/voice/services/kokoro-service';
import { memoryService } from '@/features/memory/services/memory-service';
import { audioPlayer } from '@/features/voice/utils/audio-player';
import { checkModelCache } from '@/features/voice/utils/model-cache';

jest.mock('@/features/voice/utils/permissions');
jest.mock('@/features/voice/services/kokoro-service');
jest.mock('@/features/memory/services/memory-service');
jest.mock('@/features/voice/utils/audio-player');
jest.mock('@/features/voice/utils/model-cache');
jest.mock('@/shared/lib/logger');

describe('useBootSequence', () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    (kokoroService.initialize as jest.Mock).mockResolvedValue(undefined);
    (kokoroService.onProgress as jest.Mock).mockImplementation(() => {});
    (memoryService.initialize as jest.Mock).mockResolvedValue(undefined);
    (audioPlayer.resume as jest.Mock).mockResolvedValue(undefined);
    (checkModelCache as jest.Mock).mockResolvedValue('cached');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with default state', async () => {
    const { result } = renderHook(() => useBootSequence({ onComplete: mockOnComplete }));
    
    // Wait for initial effects
    await waitFor(() => {
        expect(result.current.state.modelCacheStatus).toBe('cached');
    });

    expect(result.current.state.isBooting).toBe(false);
    expect(result.current.state.permissionStatus).toBe('idle');
    expect(result.current.state.downloadProgress).toBeNull();
  });

  it('should run boot sequence and call onComplete', async () => {
    (requestMicrophonePermission as jest.Mock).mockResolvedValue(true);
    
    const { result } = renderHook(() => useBootSequence({ onComplete: mockOnComplete }));

    // Start Boot
    await act(async () => {
      result.current.actions.startBootSequence();
    });

    expect(result.current.state.isBooting).toBe(true);
    expect(result.current.state.permissionStatus).toBe('pending');

    // Fast-forward timers to complete animation
    await act(async () => {
        jest.advanceTimersByTime(9000);
    });

    // Wait for async completion
    await act(async () => {
        // Need to wait for promise resolution in the interval callback
    });

    expect(mockOnComplete).toHaveBeenCalledWith(true);
    expect(result.current.state.isBooting).toBe(false);
    expect(result.current.state.permissionStatus).toBe('granted');
  });

  it('should handle permission denial', async () => {
    (requestMicrophonePermission as jest.Mock).mockResolvedValue(false);
    
    const { result } = renderHook(() => useBootSequence({ onComplete: mockOnComplete }));

    await act(async () => {
      result.current.actions.startBootSequence();
    });

    await act(async () => {
        jest.advanceTimersByTime(9000);
    });

    expect(mockOnComplete).toHaveBeenCalledWith(false);
    expect(result.current.state.permissionStatus).toBe('denied');
  });
});
