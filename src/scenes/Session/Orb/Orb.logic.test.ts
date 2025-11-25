import { renderHook } from '@testing-library/react';
import { useAetherVisuals } from './Orb.logic';
import { SessionStatus } from '../Session.logic';

// Mock dependencies
jest.mock('./Typewriter.logic', () => ({
  useTypewriter: (text: string) => text // Return text immediately
}));

describe('useAetherVisuals', () => {
  const defaultProps = {
    sessionStatus: 'idle' as SessionStatus,
    voiceState: 'idle' as const,
    permissionStatus: 'granted' as const,
    currentAssistantMessage: '',
    transcript: '',
    isOnline: true
  };

  it('returns correct visual status for idle state', () => {
    const { result } = renderHook(() => useAetherVisuals(defaultProps));
    expect(result.current.visualStatus.text).toBe('Tap Orb to Begin');
  });

  it('returns correct visual status for offline state', () => {
    const { result } = renderHook(() => useAetherVisuals({
      ...defaultProps,
      sessionStatus: 'offline'
    }));
    
    expect(result.current.visualStatus.text).toBe('Aether is Offline');
    expect(result.current.visualStatus.subtext).toBe('Backend services unavailable');
    expect(result.current.uiVoiceState).toBe('error');
  });

  it('prioritizes network connectivity check', () => {
    const { result } = renderHook(() => useAetherVisuals({
      ...defaultProps,
      isOnline: false,
      sessionStatus: 'offline' // Even if offline status, network check should come first?
      // In logic: if (!isOnline) returns 'No Connection'. This is checked before 'offline'.
    }));
    
    expect(result.current.visualStatus.text).toBe('No Connection');
  });

  it('handles connecting state correctly', () => {
    const { result } = renderHook(() => useAetherVisuals({
      ...defaultProps,
      sessionStatus: 'connecting'
    }));
    
    expect(result.current.visualStatus.text).toBe('Connecting...');
    expect(result.current.uiVoiceState).toBe('processing');
  });
});
