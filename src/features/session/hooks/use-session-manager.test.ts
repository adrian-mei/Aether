import { renderHook, act, waitFor } from '@testing-library/react';
import { useSessionManager } from './use-session-manager';
import { useSessionAccess } from './access/use-session-access';
import { isBrowserSupported, isSecureContext } from '@/shared/utils/voice/browser-support';

jest.mock('./access/use-session-access');
jest.mock('@/shared/utils/voice/browser-support');
jest.mock('@/shared/utils/voice/audio-player', () => ({
  audioPlayer: { resume: jest.fn().mockResolvedValue(undefined) }
}));
jest.mock('@/shared/lib/logger');

describe('useSessionManager', () => {
  // Mocks
  const mockAccess = {
    state: { accessCode: '' },
    actions: { verifyAccessCode: jest.fn() }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useSessionAccess as jest.Mock).mockReturnValue(mockAccess);
    (isBrowserSupported as jest.Mock).mockResolvedValue(true);
    (isSecureContext as jest.Mock).mockReturnValue(true);
  });

  it('should initialize status to awaiting-boot', async () => {
    const { result } = renderHook(() => useSessionManager());
    
    await waitFor(() => {
      expect(result.current.state.status).toBe('awaiting-boot');
    });
  });

  it('should handle start session', async () => {
    const { result } = renderHook(() => useSessionManager());
    
    await waitFor(() => {
      expect(result.current.state.status).toBe('awaiting-boot');
    });

    await act(async () => {
      await result.current.actions.handleStartSession();
    });
    
    expect(result.current.state.status).toBe('connecting');
    
    // Wait for connection simulation
    await waitFor(() => {
      expect(result.current.state.status).toBe('connected');
    }, { timeout: 2000 });
  });

  it('should toggle listening only when connected', async () => {
    const { result } = renderHook(() => useSessionManager());
    
    act(() => {
      result.current.actions.toggleListening();
    });
    // Should not toggle if not connected
    expect(result.current.state.voiceState).toBe('idle');

    // Connect
    await act(async () => {
      await result.current.actions.handleStartSession();
    });
    
    await waitFor(() => {
      expect(result.current.state.status).toBe('connected');
    }, { timeout: 2000 });

    act(() => {
      result.current.actions.toggleListening();
    });
    
    expect(result.current.state.voiceState).toBe('listening');
  });
});
