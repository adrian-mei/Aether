import { renderHook, act } from '@testing-library/react';
import { useSessionAccess } from './use-session-access';
import { verifyAccessCode } from '@/features/rate-limit/utils/access-code';

jest.mock('@/features/rate-limit/utils/access-code');
jest.mock('@/shared/lib/logger');

describe('useSessionAccess', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useSessionAccess());
    
    expect(result.current.state.interactionCount).toBe(0);
    expect(result.current.state.isUnlocked).toBe(false);
    expect(result.current.state.isLimitReached).toBe(false);
  });

  it('should increment interaction count', () => {
    const { result } = renderHook(() => useSessionAccess());
    
    act(() => {
      const allowed = result.current.actions.incrementInteraction();
      expect(allowed).toBe(true);
    });

    expect(result.current.state.interactionCount).toBe(1);
    expect(localStorage.getItem('aether_interaction_count')).toBe('1');
  });

  it('should block when limit is reached (and not unlocked)', () => {
    localStorage.setItem('aether_interaction_count', '10');
    
    const { result } = renderHook(() => useSessionAccess());
    
    expect(result.current.state.interactionCount).toBe(10);
    expect(result.current.state.isLimitReached).toBe(true);
    
    act(() => {
        const allowed = result.current.actions.incrementInteraction();
        expect(allowed).toBe(false);
    });
  });

  it('should verify access code', async () => {
    (verifyAccessCode as jest.Mock).mockResolvedValue(true);
    const { result } = renderHook(() => useSessionAccess());

    let isValid = false;
    await act(async () => {
        isValid = await result.current.actions.verifyAccessCode('valid-code');
    });

    expect(isValid).toBe(true);
    expect(result.current.state.isUnlocked).toBe(true);
  });
});
