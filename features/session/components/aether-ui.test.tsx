import React from 'react';
import { render, screen } from '@testing-library/react';
import { AetherUI } from '@/features/session/components/aether-ui';
import { useSession } from '@/features/session/context/session-context';
import { SessionStatus } from '@/features/session/hooks/use-session-manager';
import { VoiceInteractionState } from '@/features/voice/hooks/core/use-voice-interaction';
import { PermissionStatus } from '@/features/voice/utils/permissions';
import { ModelCacheStatus } from '@/features/voice/utils/model-cache';

// Mock sub-components to simplify testing
jest.mock('@/features/session/components/modals/waitlist-modal', () => ({
  WaitlistModal: () => <div data-testid="waitlist-modal" />
}));

jest.mock('@/features/session/components/layouts/landscape-warning', () => ({
  LandscapeWarning: () => <div data-testid="landscape-warning" />
}));

jest.mock('@/features/session/components/modals/ios-install-prompt', () => ({
  IOSInstallPrompt: () => <div data-testid="ios-install-prompt" />
}));

jest.mock('@/features/session/hooks/audio/use-ocean-sound', () => ({
  useOceanSound: () => ({ play: jest.fn() })
}));

jest.mock('@/features/session/hooks/audio/use-waking-sound', () => ({
  useWakingSound: () => ({ playWakingSound: jest.fn() })
}));

jest.mock('@/features/session/hooks/utils/use-wake-lock', () => ({
  useWakeLock: () => ({ requestWakeLock: jest.fn(), releaseWakeLock: jest.fn() })
}));

jest.mock('@/features/session/context/session-context', () => ({
  useSession: jest.fn()
}));

describe('AetherUI', () => {
  const mockActions = {
    startBootSequence: jest.fn(),
    handleStartSession: jest.fn(),
    toggleListening: jest.fn(),
    verifyAccessCode: jest.fn(),
    handleInputComplete: jest.fn(),
    toggleDebug: jest.fn(),
  };

  const defaultState = {
    voiceState: 'idle' as VoiceInteractionState,
    permissionStatus: 'idle' as PermissionStatus,
    status: 'idle' as SessionStatus,
    modelCacheStatus: 'cached' as ModelCacheStatus,
    downloadProgress: null as number | null,
    transcript: '',
    turnCount: 0,
    isDebugOpen: false,
    currentAssistantMessage: undefined,
    currentMessageDuration: undefined,
    tokenUsage: undefined,
  };

  const setupSession = (overrides: Partial<typeof defaultState> = {}) => {
    (useSession as jest.Mock).mockReturnValue({
      state: { ...defaultState, ...overrides },
      actions: mockActions
    });
  };

  it('shows transcript when listening', () => {
    setupSession({ voiceState: 'listening', transcript: 'Hello Aether' });
    render(<AetherUI />);
    expect(screen.getByText('Hello Aether')).toBeInTheDocument();
    expect(screen.getByText('Listening...')).toBeInTheDocument();
  });

  it('shows "Requesting Access" when permission is pending and no download progress', () => {
    setupSession({ permissionStatus: 'pending' });
    render(<AetherUI />);
    
    expect(screen.getByText('Requesting Access')).toBeInTheDocument();
    expect(screen.getByText('Check your browser prompt')).toBeInTheDocument();
  });

  it('shows download progress instead of "Requesting Access" during boot sequence', () => {
    setupSession({ 
      permissionStatus: 'pending',
      downloadProgress: 50,
      status: 'booting'
    });
    render(<AetherUI />);

    expect(screen.getByText('Initializing...')).toBeInTheDocument();
    expect(screen.getByText('50% Complete')).toBeInTheDocument();
    
    expect(screen.queryByText('Requesting Access')).not.toBeInTheDocument();
  });

  it('shows idle state message correctly', () => {
    setupSession();
    render(<AetherUI />);
    expect(screen.getByText('Ready to listen')).toBeInTheDocument();
    expect(screen.getByText('Tap to begin')).toBeInTheDocument();
  });

  it('shows listening state message correctly', () => {
    setupSession({ voiceState: 'listening' });
    render(<AetherUI />);
    expect(screen.getByText("I'm listening")).toBeInTheDocument();
    expect(screen.getByText("Go ahead, it's your turn")).toBeInTheDocument();
  });

  it('shows speaking state message correctly', () => {
    setupSession({ voiceState: 'speaking' });
    render(<AetherUI />);
    expect(screen.getByText('Here with you')).toBeInTheDocument();
    expect(screen.getByText('Let me mirror that back')).toBeInTheDocument();
  });
});
