import { renderHook, act } from '@testing-library/react';
import { useTypewriter } from './use-typewriter';

jest.useFakeTimers();

describe('useTypewriter', () => {
  it('should return empty string initially', () => {
    const { result } = renderHook(() => useTypewriter('Hello', 10));
    expect(result.current).toBe('');
  });

  it('should type text over time', () => {
    const { result } = renderHook(() => useTypewriter('Hello', 10));

    act(() => {
      jest.advanceTimersByTime(10);
    });
    expect(result.current).toBe('H');

    act(() => {
      jest.advanceTimersByTime(10);
    });
    expect(result.current).toBe('He');

    act(() => {
      jest.advanceTimersByTime(30);
    });
    expect(result.current).toBe('Hello');
  });

  it('should handle undefined text', () => {
    const { result } = renderHook(() => useTypewriter(undefined, 10));
    expect(result.current).toBe('');
  });

  it('should reset when text changes', () => {
    const { result, rerender } = renderHook(({ text }) => useTypewriter(text, 10), {
      initialProps: { text: 'Hi' },
    });

    act(() => {
      jest.advanceTimersByTime(20);
    });
    expect(result.current).toBe('Hi');

    rerender({ text: 'Bye' });
    // With delay=0, the clear is scheduled for next tick.
    // So immediately after rerender, it should still be 'Hi'.
    expect(result.current).toBe('Hi');

    // Advance timers to trigger the clear and start typing 'Bye'
    act(() => {
      jest.advanceTimersByTime(1); 
    });
    // Now cleared and setup interval.
    
    // Advance for first char
    act(() => {
      jest.advanceTimersByTime(10);
    });
    expect(result.current).toBe('B');
  });

  it('should delay typing when delay prop is provided', () => {
    const { result } = renderHook(() => useTypewriter('Hello', 10, 500));
    
    // Initially empty
    expect(result.current).toBe('');

    // After 499ms, still empty
    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(result.current).toBe('');

    // After 500ms, should start (but intervals need to tick)
    // The timeout fires at 500ms, setting the interval.
    // The interval fires at 500ms + 10ms.
    act(() => {
      jest.advanceTimersByTime(1); // reach 500ms
    });
    
    // Now interval is set. Wait for first tick (10ms)
    act(() => {
        jest.advanceTimersByTime(10);
    });
    expect(result.current).toBe('H');

    // Finish typing
    act(() => {
        jest.advanceTimersByTime(40);
    });
    expect(result.current).toBe('Hello');
  });

  it('should persist previous text during delay', () => {
    const { result, rerender } = renderHook(({ text }) => useTypewriter(text, 10, 500), {
      initialProps: { text: 'First' },
    });
    
    // Fast forward to finish first
    act(() => { jest.advanceTimersByTime(1000); });
    expect(result.current).toBe('First');

    // Update text
    rerender({ text: 'Second' });
    
    // During delay, should still be 'First'
    expect(result.current).toBe('First');
    
    act(() => { jest.advanceTimersByTime(400); });
    expect(result.current).toBe('First');

    // After delay, resets and starts typing
    act(() => { jest.advanceTimersByTime(100); });
    // Now it should have cleared and started 'S'
    // Wait a tick for interval
    act(() => { jest.advanceTimersByTime(10); });
    expect(result.current).toBe('S');
  });
});
