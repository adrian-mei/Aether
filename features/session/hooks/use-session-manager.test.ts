import { renderHook, act, waitFor } from '@testing-library/react';
import { useSessionManager } from './use-session-manager';
import { useVoiceInteraction } from '@/features/voice/hooks/core/use-voice-interaction';
import { useBootSequence } from './lifecycle/use-boot-sequence';
import { useSessionAccess } from './access/use-session-access';
import { useConversation } from './chat/use-conversation';
import { isBrowserSupported, isSecureContext } from '@/features/voice/utils/browser-support';

jest.mock('@/features/voice/hooks/core/use-voice-interaction');
jest.mock('./lifecycle/use-boot-sequence');
jest.mock('./access/use-session-access');
jest.mock('./chat/use-conversation');
jest.mock('@/features/voice/utils/browser-support');
jest.mock('@/features/voice/services/kokoro-service');
jest.mock('@/features/voice/utils/audio-player');
jest.mock('@/shared/lib/logger');

describe('useSessionManager', () => {
  // Mocks
  const mockAccess = {
    state: { interactionCount: 0, isUnlocked: false, accessCode: '', isLimitReached: false, isReady: true },
    actions: { incrementInteraction: jest.fn(), verifyAccessCode: jest.fn(), checkLimits: jest.fn() }
  };

  const mockBoot = {
    state: { permissionStatus: 'idle', downloadProgress: null, modelCacheStatus: 'checking', isBooting: false },
    actions: { startBootSequence: jest.fn(), retryPermission: jest.fn(), setPermissionStatus: jest.fn() }
  };

  const mockConversation = {
    state: { currentAssistantMessage: '', isProcessing: false, lastActivity: 0 },
    actions: { handleInputComplete: jest.fn(), handleSilence: jest.fn(), resetConversation: jest.fn() }
  };

  const mockVoice = {
    state: 'idle',
    transcript: '',
    startListening: jest.fn(),
    stopListening: jest.fn(),
    reset: jest.fn(),
    speak: jest.fn(),
    toggleMute: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useSessionAccess as jest.Mock).mockReturnValue(mockAccess);
    (useBootSequence as jest.Mock).mockReturnValue(mockBoot);
    (useConversation as jest.Mock).mockReturnValue(mockConversation);
    (useVoiceInteraction as jest.Mock).mockReturnValue(mockVoice);
    
    (isBrowserSupported as jest.Mock).mockResolvedValue(true);
    (isSecureContext as jest.Mock).mockReturnValue(true);
  });

  it('should initialize status to awaiting-boot', async () => {
    // We need to wait for the useEffect
    const { result } = renderHook(() => useSessionManager());
    
    // Wait for initialization effect
    await waitFor(() => {
      expect(result.current.state.status).toBe('awaiting-boot');
    });
  });

  it('should start boot sequence', async () => {
    const { result } = renderHook(() => useSessionManager());
    
    await waitFor(() => {
      expect(result.current.state.status).toBe('awaiting-boot');
    });

    act(() => {
      result.current.actions.startBootSequence();
    });
    
    expect(mockBoot.actions.startBootSequence).toHaveBeenCalled();
  });

  it('should toggle listening', async () => {
    const { result } = renderHook(() => useSessionManager());
    
    await waitFor(() => {
      expect(result.current.state.status).toBe('awaiting-boot');
    });

    act(() => {
      result.current.actions.toggleListening();
    });
    
    // If voice state is idle, it should start listening
    expect(mockVoice.startListening).toHaveBeenCalled();
  });
});
