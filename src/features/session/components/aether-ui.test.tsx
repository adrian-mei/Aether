import React from 'react';
import { render, screen } from '@testing-library/react';
import { AetherUI } from './aether-ui';
import { useSession } from '@/features/session/context/session-context';
import { SessionStatus, VoiceState } from '@/features/session/hooks/use-session-manager';
import { PermissionStatus } from '@/shared/utils/voice/permissions';
import { ModelCacheStatus } from '@/shared/utils/voice/model-cache';

// Mock sub-components to simplify testing
jest.mock('@/components/modals/waitlist-modal', () => ({
  WaitlistModal: () => <div data-testid="waitlist-modal" />
}));

jest.mock('./landscape-warning', () => ({
  LandscapeWarning: () => <div data-testid="landscape-warning" />
}));

jest.mock('@/components/modals/ios-install-prompt', () => ({
  IOSInstallPrompt: () => <div data-testid="ios-install-prompt" />
}));

jest.mock('@/components/modals/mobile-support-notice', () => ({
  MobileSupportNotice: () => <div data-testid="mobile-support-notice" />
}));

jest.mock('@/features/session/hooks/audio/use-session-audio', () => ({
  useSessionAudio: () => ({ playOcean: jest.fn() })
}));

jest.mock('@/features/visuals/hooks/use-aether-visuals', () => ({
  useAetherVisuals: (props: any) => ({
    uiVoiceState: props.voiceState,
    emotionalTone: 'calm',
    breatheIntensity: 1,
    visualStatus: { text: 'Mock Status', subtext: 'Mock Subtext' }
  })
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
    toggleVoiceMode: jest.fn(),
  };

  const defaultState = {
    voiceState: 'idle' as VoiceState,
    permissionStatus: 'granted' as PermissionStatus, // changed default to granted
    status: 'idle' as SessionStatus,
    modelCacheStatus: null as ModelCacheStatus | null,
    downloadProgress: null as number | null,
    transcript: '',
    turnCount: 0,
    isDebugOpen: false,
    currentAssistantMessage: undefined,
    currentMessageDuration: undefined,
    tokenUsage: undefined,
    isDownloadingNeural: false,
    voiceMode: 'native',
    bootStatus: 'complete',
  };

  const setupSession = (overrides: Partial<typeof defaultState> = {}) => {
    (useSession as jest.Mock).mockReturnValue({
      state: { ...defaultState, ...overrides },
      actions: mockActions
    });
  };

  // Simplified tests since logic moved out of AetherUI to hooks
  it('renders without crashing', () => {
    setupSession();
    render(<AetherUI />);
    expect(screen.getByTestId('landscape-warning')).toBeInTheDocument();
  });
});
