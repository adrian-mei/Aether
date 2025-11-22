import { KokoroService } from '@/features/voice/services/kokoro-service';
import { audioPlayer } from '@/features/voice/utils/audio-player';
import { logger } from '@/shared/lib/logger';

// Mock audio player
jest.mock('@/features/voice/utils/audio-player', () => ({
  audioPlayer: {
    play: jest.fn(),
    stop: jest.fn(),
  },
}));

// Mock logger
jest.mock('@/shared/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('KokoroService', () => {
  let service: KokoroService;
  let mockWorker: Worker;
  let workerHandlers: {
    onmessage: ((event: MessageEvent) => void) | null;
    onerror: ((event: ErrorEvent) => void) | null;
  } = { onmessage: null, onerror: null };

  beforeEach(() => {
    // Reset singleton instance if possible, or get the existing one
    service = KokoroService.getInstance();
    
    // Create a mock worker
    mockWorker = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
      set onmessage(handler: ((event: MessageEvent) => void) | null) {
        workerHandlers.onmessage = handler;
      },
      get onmessage() {
        return workerHandlers.onmessage;
      },
      set onerror(handler: ((event: ErrorEvent) => void) | null) {
        workerHandlers.onerror = handler;
      },
      get onerror() {
        return workerHandlers.onerror;
      },
    } as unknown as Worker;

    // Inject mock worker
    service.setWorker(mockWorker);

    // Reset mocks
    jest.clearAllMocks();
    
    // Reset internal state if needed (trickier with singleton, but initialize check helps)
    // Since it's a singleton, state persists. We might need to be careful.
  });

  it('should initialize and handle ready message', async () => {
    const initPromise = service.initialize();

    // Simulate worker ready message
    expect(workerHandlers.onmessage).toBeDefined();
    if (workerHandlers.onmessage) {
      workerHandlers.onmessage({
        data: { type: 'ready', voices: [] }
      } as MessageEvent);
    }

    await expect(initPromise).resolves.toBeUndefined();
    expect(mockWorker.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'init' }));
    expect(mockWorker.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'warm' }));
  });

  it('should speak text and play audio', async () => {
    // Ensure ready
    // If already ready from previous test, this is fine.
    // If not, re-initialize mock flow.
    
    const speakPromise = service.speak('Hello');
    
    expect(mockWorker.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'generate',
      text: 'Hello'
    }));

    // Mock play to return a promise
    (audioPlayer.play as jest.Mock).mockResolvedValue(undefined);

    // Simulate worker audio message
    const mockAudio = new Float32Array([0.1, 0.2]);
    if (workerHandlers.onmessage) {
      workerHandlers.onmessage({
        data: { type: 'audio', audio: mockAudio, sampleRate: 24000 }
      } as MessageEvent);
    }

    // Wait for play to be called
    expect(audioPlayer.play).toHaveBeenCalledWith(mockAudio, 24000);
    
    await expect(speakPromise).resolves.toBeUndefined();
  });

  it('should generate audio without playing', async () => {
    const generatePromise = service.generateAudio('Preload me');

    expect(mockWorker.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'generate',
      text: 'Preload me'
    }));

    // Simulate worker audio message
    const mockAudio = new Float32Array([0.5, 0.6]);
    if (workerHandlers.onmessage) {
      workerHandlers.onmessage({
        data: { type: 'audio', audio: mockAudio, sampleRate: 24000 }
      } as MessageEvent);
    }

    const result = await generatePromise;
    expect(result).toEqual({ audio: mockAudio, sampleRate: 24000 });
    expect(audioPlayer.play).not.toHaveBeenCalled();
  });

  it('should handle worker errors during generation', async () => {
    const speakPromise = service.speak('Fail me');

    if (workerHandlers.onmessage) {
      workerHandlers.onmessage({
        data: { type: 'error', error: 'Synthesis failed' }
      } as MessageEvent);
    }

    await expect(speakPromise).rejects.toBe('Synthesis failed');
  });
});
