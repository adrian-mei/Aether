import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionContainer } from '@/features/session/components/session-container';
import { useSessionManager } from '@/features/session/hooks/use-session-manager';

// Mock dependencies
jest.mock('@/features/session/hooks/use-session-manager');
jest.mock('@/features/session/hooks/visuals/use-aether-visuals', () => ({
  useAetherVisuals: () => ({
    uiVoiceState: 'idle',
    emotionalTone: 'calm',
    breatheIntensity: 1,
    visualStatus: { text: 'Ready', subtext: 'Mocked' }
  })
}));
jest.mock('@/features/session/hooks/audio/use-session-audio', () => ({
  useSessionAudio: () => ({
    playOcean: jest.fn()
  })
}));
jest.mock('@/features/session/components/visuals/background-orbs', () => ({ BackgroundOrbs: () => <div data-testid="background-orbs" /> }));
jest.mock('@/features/session/components/visuals/orb-container', () => ({ OrbContainer: ({ onInteraction }: { onInteraction: () => void }) => <button data-testid="orb" onClick={onInteraction}>Orb</button> }));
jest.mock('@/features/session/components/layouts/header', () => ({ Header: () => <div data-testid="header" /> }));
jest.mock('@/features/session/components/layouts/footer', () => ({ Footer: () => <div data-testid="footer" /> }));
jest.mock('@/features/session/components/status/status-display', () => ({ StatusDisplay: () => <div data-testid="status-display" /> }));
jest.mock('@/features/session/components/modals/waitlist-modal', () => ({ WaitlistModal: () => <div data-testid="waitlist-modal" /> }));

describe('Conversation Flow Integration', () => {
  const mockActions = {
    handleStartSession: jest.fn(),
    handleInputComplete: jest.fn(),
    toggleListening: jest.fn(),
    toggleDebug: jest.fn(),
    toggleMute: jest.fn(),
    onRetryPermission: jest.fn(),
    verifyAccessCode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSessionManager as jest.Mock).mockReturnValue({
      state: {
        status: 'idle',
        isDebugOpen: false,
        voiceState: 'idle',
        permissionStatus: 'idle',
        currentAssistantMessage: '',
        modelCacheStatus: 'ready',
        downloadProgress: 100,
        transcript: '',
      },
      actions: mockActions,
    });
  });

  it('renders initial state correctly', () => {
    render(<SessionContainer />);
    expect(screen.getByTestId('orb')).toBeInTheDocument();
  });

  it('starts session on orb interaction when idle', () => {
    render(<SessionContainer />);
    fireEvent.click(screen.getByTestId('orb'));
    expect(mockActions.handleStartSession).toHaveBeenCalled();
  });

  it('toggles listening on orb interaction when running', () => {
    (useSessionManager as jest.Mock).mockReturnValue({
      state: {
        status: 'running',
        isDebugOpen: false,
        voiceState: 'idle',
        permissionStatus: 'granted',
        currentAssistantMessage: '',
        modelCacheStatus: 'ready',
        downloadProgress: 100,
        transcript: '',
      },
      actions: mockActions,
    });

    render(<SessionContainer />);
    fireEvent.click(screen.getByTestId('orb'));
    expect(mockActions.toggleListening).toHaveBeenCalled();
  });
});
