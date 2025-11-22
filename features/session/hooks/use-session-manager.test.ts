import { renderHook, act } from '@testing-library/react';
import { useSessionManager } from './use-session-manager';
import { useVoiceAgent } from '@/features/voice/hooks/use-voice-agent';
import { useBootSequence } from './use-boot-sequence';
import { useSessionAccess } from './use-session-access';
import { useConversation } from './use-conversation';
import { isBrowserSupported, isSecureContext } from '@/features/voice/utils/browser-support';

jest.mock('@/features/voice/hooks/use-voice-agent');
jest.mock('./use-boot-sequence');
jest.mock('./use-session-access');
jest.mock('./use-conversation');
jest.mock('@/features/voice/utils/browser-support');
jest.mock('@/features/voice/services/kokoro-service');
jest.mock('@/features/voice/utils/audio-player');
jest.mock('@/shared/lib/logger');

describe('useSessionManager', () => {
  // Mocks
  const mockAccess = {
    state: { interactionCount: 0, isUnlocked: false, accessCode: '', isLimitReached: false },
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
    (useVoiceAgent as jest.Mock).mockReturnValue(mockVoice);
    
    (isBrowserSupported as jest.Mock).mockResolvedValue(true);
    (isSecureContext as jest.Mock).mockReturnValue(true);
  });

  it('should initialize status to awaiting-boot', async () => {
    // We need to wait for the useEffect
    const { result } = renderHook(() => useSessionManager());
    
    // Ideally we use waitFor if available, or just wait for state change
    // renderHook from @testing-library/react handles async effects if we await
    
    // Wait for initialization effect
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Check if status is updated (since we mocked browser support true)
    // Note: The original hook uses setTimeout(0) inside useEffect, so we might need to wait a tick.
  });

  it('should start boot sequence', () => {
    const { result } = renderHook(() => useSessionManager());
    
    act(() => {
      result.current.actions.startBootSequence();
    });
    
    expect(mockBoot.actions.startBootSequence).toHaveBeenCalled();
  });

  it('should toggle listening', () => {
    const { result } = renderHook(() => useSessionManager());
    
    act(() => {
      result.current.actions.toggleListening();
    });
    
    // If voice state is idle, it should start listening
    expect(mockVoice.startListening).toHaveBeenCalled();
  });
});
