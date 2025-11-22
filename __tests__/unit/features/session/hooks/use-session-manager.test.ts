import { renderHook, act, waitFor } from '@testing-library/react';
import { useSessionManager } from '@/features/session/hooks/use-session-manager';
import { useVoiceAgent } from '@/features/voice/hooks/use-voice-agent';
import { requestMicrophonePermission } from '@/features/voice/utils/permissions';
import { isBrowserSupported, isSecureContext } from '@/features/voice/utils/browser-support';
import { verifyAccessCode } from '@/features/rate-limit/utils/access-code';
import { memoryService } from '@/features/memory/services/memory-service';
import { streamChatCompletion } from '@/features/ai/services/chat-service';

// Mock Dependencies
jest.mock('@/features/voice/hooks/use-voice-agent');
jest.mock('@/features/voice/utils/permissions');
jest.mock('@/features/voice/utils/browser-support');
jest.mock('@/features/rate-limit/utils/access-code');
jest.mock('@/features/ai/services/chat-service');
jest.mock('@/features/memory/services/memory-service', () => ({
  memoryService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    queryRelevant: jest.fn().mockResolvedValue([]),
    extractAndStore: jest.fn().mockResolvedValue(0),
  },
}));
jest.mock('@/shared/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    toggleDebug: jest.fn(),
  },
}));

describe('useSessionManager', () => {
  // Setup mocks
  const mockStartListening = jest.fn();
  const mockStopListening = jest.fn();
  const mockSpeak = jest.fn();
  const mockReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    // Default Mock Implementations
    (useVoiceAgent as jest.Mock).mockReturnValue({
      state: 'idle',
      startListening: mockStartListening,
      stopListening: mockStopListening,
      reset: mockReset,
      speak: mockSpeak,
      toggleMute: jest.fn(),
    });

    (isBrowserSupported as jest.Mock).mockResolvedValue(true);
    (isSecureContext as jest.Mock).mockReturnValue(true);
  });

  it('should initialize correctly', async () => {
    const { result } = renderHook(() => useSessionManager());

    expect(result.current.state.status).toBe('initializing');
    
    // Should transition to awaiting-boot once initialization is done
    await waitFor(() => {
      expect(result.current.state.status).toBe('awaiting-boot');
    });
  });

  it('should handle unsupported browser', async () => {
    (isBrowserSupported as jest.Mock).mockResolvedValue(false);
    
    const { result } = renderHook(() => useSessionManager());

    await waitFor(() => {
      expect(result.current.state.status).toBe('unsupported');
    });
  });

  it('should start session when permission is granted', async () => {
    (requestMicrophonePermission as jest.Mock).mockResolvedValue(true);
    
    const { result } = renderHook(() => useSessionManager());

    // Wait for initialization
    await waitFor(() => expect(result.current.state.status).toBe('awaiting-boot'));

    await act(async () => {
      await result.current.actions.handleStartSession();
    });

    expect(result.current.state.permissionStatus).toBe('granted');
    expect(result.current.state.status).toBe('running');
    expect(mockSpeak).toHaveBeenCalledWith(expect.stringContaining('Hello'));
  });

  it('should deny session when permission is denied', async () => {
    (requestMicrophonePermission as jest.Mock).mockResolvedValue(false);
    
    const { result } = renderHook(() => useSessionManager());

    await waitFor(() => expect(result.current.state.status).toBe('awaiting-boot'));

    await act(async () => {
      await result.current.actions.handleStartSession();
    });

    expect(result.current.state.permissionStatus).toBe('denied');
    expect(result.current.state.status).toBe('idle');
  });

  it('should handle access code verification without persistence', async () => {
    (verifyAccessCode as jest.Mock).mockResolvedValue(true);
    
    const { result } = renderHook(() => useSessionManager());

    let isValid = false;
    await act(async () => {
      isValid = await result.current.actions.verifyAccessCode('secret-code');
    });

    expect(isValid).toBe(true);
    // Should NOT persist to localStorage (session-only)
    expect(localStorage.getItem('aether_access_code')).toBeNull();
  });

  it('should toggle listening state', async () => {
    const { result } = renderHook(() => useSessionManager());

    // Case 1: Idle -> Start Listening
    (useVoiceAgent as jest.Mock).mockReturnValue({
        state: 'idle',
        startListening: mockStartListening,
        stopListening: mockStopListening,
        reset: mockReset,
        speak: mockSpeak,
        toggleMute: jest.fn(),
    });

    await act(async () => {
        result.current.actions.toggleListening();
    });
    expect(mockStartListening).toHaveBeenCalled();

    // Case 2: Listening -> Stop Listening
    (useVoiceAgent as jest.Mock).mockReturnValue({
        state: 'listening',
        startListening: mockStartListening,
        stopListening: mockStopListening,
        reset: mockReset,
        speak: mockSpeak,
        toggleMute: jest.fn(),
    });
    
    const { result: result2 } = renderHook(() => useSessionManager());
    await act(async () => {
        result2.current.actions.toggleListening();
    });
    expect(mockStopListening).toHaveBeenCalled();
  });
});
