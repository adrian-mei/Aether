import React from 'react';
import { render, screen } from '@testing-library/react';
import { AetherUI } from '@/features/session/components/aether-ui';
import { SessionStatus } from '@/features/session/hooks/use-session-manager';

// Mock sub-components to simplify testing
jest.mock('@/features/session/components/waitlist-modal', () => ({
  WaitlistModal: () => <div data-testid="waitlist-modal" />
}));

jest.mock('@/features/session/hooks/use-ocean-sound', () => ({
  useOceanSound: () => ({ play: jest.fn() })
}));

jest.mock('@/features/session/hooks/use-waking-sound', () => ({
  useWakingSound: () => ({ playWakingSound: jest.fn() })
}));

jest.mock('@/features/session/hooks/use-wake-lock', () => ({
  useWakeLock: () => ({ requestWakeLock: jest.fn(), releaseWakeLock: jest.fn() })
}));

describe('AetherUI', () => {
  const defaultProps = {
    voiceState: 'idle' as const,
    permissionStatus: 'idle' as const,
    sessionStatus: 'idle' as SessionStatus,
    modelCacheStatus: 'cached' as const,
    downloadProgress: null,
    transcript: '',
    onStartSession: jest.fn(),
    onToggleListening: jest.fn(),
    onBypass: jest.fn(),
  };

  it('shows transcript when listening', () => {
    render(<AetherUI {...defaultProps} voiceState="listening" transcript="Hello Aether" />);
    expect(screen.getByText('Hello Aether')).toBeInTheDocument();
    expect(screen.getByText('Listening...')).toBeInTheDocument();
  });

  it('shows "Requesting Access" when permission is pending and no download progress', () => {
    render(<AetherUI {...defaultProps} permissionStatus="pending" />);
    
    expect(screen.getByText('Requesting Access')).toBeInTheDocument();
    expect(screen.getByText('Check your browser prompt')).toBeInTheDocument();
  });

  it('shows download progress instead of "Requesting Access" during boot sequence', () => {
    // This is the reproduction case for the bug
    render(
      <AetherUI 
        {...defaultProps} 
        permissionStatus="pending" 
        downloadProgress={50} 
        sessionStatus="booting"
      />
    );

    // The text varies by percentage, for 50% it should be "Downloading Voice Patterns..." (wait, checking logic)
    // Logic: < 60 is "Downloading Voice Patterns..." wait no:
    // < 20: Establishing Neural Link...
    // < 40: Downloading Voice Patterns...
    // < 60: Calibrating Empathy Engine...
    
    // Let's check 50% text logic in aether-ui.tsx:
    // else if (downloadProgress < 60) text = "Calibrating Empathy Engine...";
    
    // So 50% should be "Calibrating Empathy Engine..."
    
    // Expected behavior (fix): Should show progress text
    // Current behavior (bug): Shows "Requesting Access"
    
    expect(screen.getByText('Calibrating Empathy Engine...')).toBeInTheDocument();
    expect(screen.getByText('50% Complete')).toBeInTheDocument();
    
    // Should NOT show Requesting Access
    expect(screen.queryByText('Requesting Access')).not.toBeInTheDocument();
  });

  it('shows idle state message correctly', () => {
    render(<AetherUI {...defaultProps} />);
    expect(screen.getByText('Ready to listen')).toBeInTheDocument();
    expect(screen.getByText('Tap to begin')).toBeInTheDocument();
  });

  it('shows listening state message correctly', () => {
    render(<AetherUI {...defaultProps} voiceState="listening" />);
    expect(screen.getByText('I hear you')).toBeInTheDocument();
    expect(screen.getByText("Share what's on your mind")).toBeInTheDocument();
  });

  it('shows speaking state message correctly', () => {
    render(<AetherUI {...defaultProps} voiceState="speaking" />);
    expect(screen.getByText('Here with you')).toBeInTheDocument();
    expect(screen.getByText('Let me mirror that back')).toBeInTheDocument();
  });
});
