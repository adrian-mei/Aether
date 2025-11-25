import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionContainer } from '@/scenes/Session';
import { useSessionManager } from '@/scenes/Session/Session.logic';

// Mock dependencies
jest.mock('@/scenes/Session/Session.logic');
jest.mock('@/scenes/Session/Orb/Orb.logic', () => ({
  useAetherVisuals: () => ({
    uiVoiceState: 'idle',
    emotionalTone: 'calm',
    breatheIntensity: 1,
    visualStatus: { text: 'Ready', subtext: 'Mocked' }
  })
}));
jest.mock('@/scenes/Session/hooks/use-session-audio', () => ({
  useSessionAudio: () => ({
    playOcean: jest.fn()
  })
}));
jest.mock('@/scenes/Session/Orb/BackgroundOrbs', () => ({ BackgroundOrbs: () => <div data-testid="background-orbs" /> }));
jest.mock('@/scenes/Session/Orb/Orb', () => ({ OrbContainer: ({ onInteraction }: { onInteraction: () => void }) => <button data-testid="orb" onClick={onInteraction}>Orb</button> }));
jest.mock('@/scenes/Session/components/Header', () => ({ Header: () => <div data-testid="header" /> }));
jest.mock('@/scenes/Session/components/Footer', () => ({ Footer: () => <div data-testid="footer" /> }));
jest.mock('@/scenes/Session/components/StatusDisplay', () => ({ StatusDisplay: () => <div data-testid="status-display" /> }));
jest.mock('@/scenes/Onboarding/WaitlistModal', () => ({ WaitlistModal: () => <div data-testid="waitlist-modal" /> }));

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
