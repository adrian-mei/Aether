import { AudioPlayer } from '@/features/voice/utils/audio-player';
import { waitFor } from '@testing-library/react';

// Mock logger
jest.mock('@/shared/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('AudioPlayer', () => {
  let player: AudioPlayer;
  let mockContext: AudioContext;
  let mockSource: AudioBufferSourceNode;
  let mockBuffer: AudioBuffer;

  beforeEach(() => {
    // Mock AudioContext
    mockSource = {
      buffer: null,
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      onended: null,
    } as unknown as AudioBufferSourceNode;

    mockBuffer = {
      copyToChannel: jest.fn(),
    } as unknown as AudioBuffer;

    mockContext = {
      state: 'running',
      resume: jest.fn().mockResolvedValue(undefined),
      createBuffer: jest.fn().mockReturnValue(mockBuffer),
      createBufferSource: jest.fn().mockReturnValue(mockSource),
      destination: {},
      close: jest.fn().mockResolvedValue(undefined),
    } as unknown as AudioContext;

    // Inject mock into window
    (window as any).AudioContext = jest.fn().mockImplementation(() => mockContext);
    (window as any).webkitAudioContext = (window as any).AudioContext;

    player = new AudioPlayer();
  });

  it('should play audio immediately if queue is empty', async () => {
    const audioData = new Float32Array([0, 0]);
    const promise = player.play(audioData, 24000);

    await waitFor(() => {
      expect(mockContext.createBufferSource).toHaveBeenCalled();
      expect(mockSource.start).toHaveBeenCalled();
    });

    // Simulate end
    if (mockSource.onended) {
      (mockSource.onended as any)();
    }

    await expect(promise).resolves.toBeUndefined();
  });

  it('should queue audio if playing', async () => {
    const audio1 = new Float32Array([1]);
    const audio2 = new Float32Array([2]);

    const promise1 = player.play(audio1, 24000);
    
    // Immediately verify first started
    await waitFor(() => {
        expect(mockContext.createBufferSource).toHaveBeenCalledTimes(1);
        expect(mockSource.start).toHaveBeenCalledTimes(1);
    });

    const promise2 = player.play(audio2, 24000);

    // Second should NOT start yet
    expect(mockContext.createBufferSource).toHaveBeenCalledTimes(1);

    // Finish first
    if (mockSource.onended) {
      (mockSource.onended as any)();
    }
    await promise1;

    // Now second should start
    await waitFor(() => {
        expect(mockContext.createBufferSource).toHaveBeenCalledTimes(2);
    });
    
    // Finish second
    if (mockSource.onended) {
      (mockSource.onended as any)();
    }
    await promise2;
  });

  it('should clear queue on stop', async () => {
    const audio1 = new Float32Array([1]);
    const audio2 = new Float32Array([2]);

    player.play(audio1, 24000); // Starts
    const promise2 = player.play(audio2, 24000); // Queues

    // Wait for start
    await waitFor(() => {
        expect(mockSource.start).toHaveBeenCalled();
    });

    player.stop();

    expect(mockSource.stop).toHaveBeenCalled();
  });
});
