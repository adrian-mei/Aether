import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { SessionContainer } from '@/features/session/components/session-container';
import { useSessionManager } from '@/features/session/hooks/use-session-manager';

// Mock dependencies
jest.mock('@/features/session/hooks/use-session-manager');
jest.mock('@/features/session/components/ui/background-orbs', () => ({ BackgroundOrbs: () => <div data-testid="background-orbs" /> }));
jest.mock('@/features/session/components/ui/orb-container', () => ({ OrbContainer: ({ onInteraction }: any) => <button data-testid="orb" onClick={onInteraction}>Orb</button> }));
jest.mock('@/features/session/components/ui/header', () => ({ Header: () => <div data-testid="header" /> }));
jest.mock('@/features/session/components/ui/footer', () => ({ Footer: () => <div data-testid="footer" /> }));
jest.mock('@/features/session/components/ui/status-display', () => ({ StatusDisplay: () => <div data-testid="status-display" /> }));
jest.mock('@/features/session/components/waitlist-modal', () => ({ WaitlistModal: () => <div data-testid="waitlist-modal" /> }));

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
