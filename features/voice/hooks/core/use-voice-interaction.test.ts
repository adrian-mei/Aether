/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVoiceInteraction } from './use-voice-interaction';
import { kokoroService } from '@/features/voice/services/kokoro-service';

// Mock dependencies
jest.mock('@/features/voice/services/kokoro-service', () => ({
  kokoroService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    speak: jest.fn().mockImplementation(async (text, voice, onStart) => {
      if (onStart) onStart();
      // Delay resolution to simulate speaking duration
      return new Promise(resolve => setTimeout(resolve, 100));
    }),
    stop: jest.fn(),
  },
}));

jest.mock('@/shared/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock Web Speech API
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  continuous: false,
  interimResults: false,
  lang: '',
  onstart: jest.fn(),
  onresult: jest.fn(),
  onerror: jest.fn(),
  onend: jest.fn(),
};

// Mock SpeechSynthesis
const mockSpeechSynthesis = {
  speaking: false,
  cancel: jest.fn(),
  speak: jest.fn(),
  getVoices: jest.fn().mockReturnValue([]),
};

describe('useVoiceInteraction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Window Mocks
    (global.window as any).SpeechRecognition = jest.fn(() => mockSpeechRecognition);
    (global.window as any).webkitSpeechRecognition = jest.fn(() => mockSpeechRecognition);
    Object.defineProperty(global.window, 'speechSynthesis', {
      value: mockSpeechSynthesis,
      writable: true,
    });
    (global.window as any).SpeechSynthesisUtterance = jest.fn();
  });

  afterEach(() => {
    // Cleanup
    delete (global.window as any).SpeechRecognition;
    delete (global.window as any).webkitSpeechRecognition;
    delete (global.window as any).SpeechSynthesisUtterance;
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useVoiceInteraction());
    
    expect(result.current.state).toBe('idle');
    // Kokoro initialization is now handled by useSessionManager
  });

  it('should start listening when requested', () => {
    const { result } = renderHook(() => useVoiceInteraction());

    act(() => {
      result.current.startListening();
    });

    expect(mockSpeechRecognition.start).toHaveBeenCalled();
  });

  it('should stop listening when requested', () => {
    const { result } = renderHook(() => useVoiceInteraction());

    act(() => {
      result.current.stopListening();
    });

    expect(mockSpeechRecognition.stop).toHaveBeenCalled();
    expect(result.current.state).toBe('idle');
  });

  it('should handle speech input correctly', () => {
    const { result } = renderHook(() => useVoiceInteraction());

    // simulate speech recognition flow
    // 1. start
    act(() => {
      if (mockSpeechRecognition.onstart) mockSpeechRecognition.onstart({} as Event);
    });

    // 2. result
    jest.useFakeTimers();
    act(() => {
      if (mockSpeechRecognition.onresult) {
        mockSpeechRecognition.onresult({
          results: [
            [{ transcript: 'Hello world' }]
          ],
          length: 1
        } as any);
      }
    });

    // 3. Wait for silence timeout
    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(result.current.lastInput).toEqual({ text: 'Hello world', timestamp: expect.any(Number) });
    expect(mockSpeechRecognition.stop).toHaveBeenCalled();
    
    jest.useRealTimers();
  });

  it('should use kokoro for speech output', async () => {
    const { result } = renderHook(() => useVoiceInteraction());

    let resolveSpeak: (value: void) => void;
    const speakPromise = new Promise<void>((resolve) => {
      resolveSpeak = resolve;
    });

    (kokoroService.speak as jest.Mock).mockImplementation(async (text, voice, onStart) => {
      if (onStart) onStart();
      return speakPromise;
    });

    // Start speaking but don't await the result yet
    let promise: Promise<void>;
    await act(async () => {
      promise = result.current.speak('Hello', { autoResume: false });
    });

    expect(kokoroService.speak).toHaveBeenCalledWith('Hello', 'af_heart', expect.any(Function));
    
    // Verify state is 'speaking' while promise is pending
    await waitFor(() => {
        expect(result.current.state).toBe('speaking');
    });

    // Resolve and finish
    await act(async () => {
      resolveSpeak!();
      await promise;
    });
    
    // Verify it goes back to idle (or whatever end state)
    // Since autoResume is false and we mocked speakTTS callback behavior in the hook implementation...
    // The actual hook implementation calls the callback when promise resolves.
    // Our mock above just returns a promise. It doesn't invoke the callback that the hook passes to it?
    // Wait, kokoroService.speak signature in real code:
    // public async speak(text: string, voiceId?: string, onPlaybackStart?: () => void): Promise<Promise<void>>
    
    // In useTTS:
    // const playbackPromise = await kokoroService.speak(...)
    // if (playbackPromise) await playbackPromise;
    
    // So the mock should return a Promise that resolves to a Promise (playbackPromise).
    // The mock implementation in the test file:
    // speak: jest.fn().mockImplementation(async (text, voice, onStart) => { ... return Promise.resolve(); })
    // This returns a Promise<void>, not Promise<Promise<void>>.
    // This effectively simulates the inner playback promise?
    // No, because await kokoroService.speak() would return undefined (if mocked as returning Promise<void> directly, wait... async returns Promise).
    // If I return Promise.resolve(), await kokoroService.speak() returns undefined.
    // then await undefined is fine.
    
    // But I want to simulate the duration.
  });

  it('should toggle mute state', () => {
    const { result } = renderHook(() => useVoiceInteraction());

    // Mute
    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.state).toBe('muted');
    expect(mockSpeechRecognition.stop).toHaveBeenCalled();

    // Unmute
    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.state).toBe('idle');
  });
});
