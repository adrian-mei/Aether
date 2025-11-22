import { renderHook, act } from '@testing-library/react';
import { useVoiceAgent } from '@/features/voice/hooks/use-voice-agent';
import { kokoroService } from '@/features/voice/services/kokoro-service';

// Mock dependencies
jest.mock('@/features/voice/services/kokoro-service', () => ({
  kokoroService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    speak: jest.fn().mockImplementation(async (text, voice, onStart) => {
      if (onStart) onStart();
      return Promise.resolve();
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

describe('useVoiceAgent', () => {
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
    const { result } = renderHook(() => useVoiceAgent(jest.fn()));
    
    expect(result.current.state).toBe('idle');
    // Kokoro initialization is now handled by useSessionManager
  });

  it('should start listening when requested', () => {
    const { result } = renderHook(() => useVoiceAgent(jest.fn()));

    act(() => {
      result.current.startListening();
    });

    expect(mockSpeechRecognition.start).toHaveBeenCalled();
  });

  it('should stop listening when requested', () => {
    const { result } = renderHook(() => useVoiceAgent(jest.fn()));

    act(() => {
      result.current.stopListening();
    });

    expect(mockSpeechRecognition.stop).toHaveBeenCalled();
    expect(result.current.state).toBe('idle');
  });

  it('should handle speech input correctly', () => {
    const onInputComplete = jest.fn();
    renderHook(() => useVoiceAgent(onInputComplete));

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

    expect(onInputComplete).toHaveBeenCalledWith('Hello world');
    expect(mockSpeechRecognition.stop).toHaveBeenCalled();
    
    jest.useRealTimers();
  });

  it('should use kokoro for speech output', async () => {
    const { result } = renderHook(() => useVoiceAgent(jest.fn()));

    // Use autoResume: false to keep the state as 'speaking' after speech finishes
    await act(async () => {
      await result.current.speak('Hello', { autoResume: false });
    });

    expect(kokoroService.speak).toHaveBeenCalledWith('Hello', 'af_heart', expect.any(Function));
    expect(result.current.state).toBe('speaking'); 
  });

  it('should toggle mute state', () => {
    const { result } = renderHook(() => useVoiceAgent(jest.fn()));

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
