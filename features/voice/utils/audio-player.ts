import { logger } from '@/shared/lib/logger';

interface QueueItem {
  audioData: Float32Array;
  sampleRate: number;
  resolve: () => void;
  reject: (err: unknown) => void;
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private queue: QueueItem[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;

  constructor() {
    this.setupMediaSession();
  }

  private setupMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', async () => {
        logger.info('AUDIO', 'MediaSession: Play');
        await this.resume();
      });
      
      navigator.mediaSession.setActionHandler('pause', async () => {
        logger.info('AUDIO', 'MediaSession: Pause');
        if (this.audioContext) {
          await this.audioContext.suspend();
        }
      });
      
      navigator.mediaSession.setActionHandler('stop', () => {
         logger.info('AUDIO', 'MediaSession: Stop');
         this.stop();
      });
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    return this.audioContext;
  }

  public async resume(): Promise<void> {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Unlock iOS Audio: Play a short silent buffer
    try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
    } catch (e) {
        // Ignore errors during unlock
        logger.debug('AUDIO', 'Silent unlock failed (non-fatal)', e);
    }
  }

  /**
   * Queues audio for playback. 
   * Returns a promise that resolves when playback *finishes*.
   */
  public async play(audioData: Float32Array, sampleRate: number): Promise<void> {
    // Update Media Session Metadata
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: 'Aether',
            artist: 'Voice Companion',
            artwork: [
                { src: '/icons/globe.svg', sizes: '512x512', type: 'image/svg+xml' }
            ]
        });
        navigator.mediaSession.playbackState = 'playing';
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ audioData, sampleRate, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isPlaying || this.queue.length === 0) return;

    this.isPlaying = true;
    const item = this.queue[0]; // Peek, remove after success start

    try {
      const ctx = this.getAudioContext();
      await this.resume();

      const buffer = ctx.createBuffer(1, item.audioData.length, item.sampleRate);
      buffer.copyToChannel(new Float32Array(item.audioData), 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      this.currentSource = source;

      source.onended = () => {
        this.currentSource = null;
        this.isPlaying = false;
        
        // Remove from queue
        this.queue.shift();
        
        // Update MediaSession if queue empty
        if (this.queue.length === 0 && 'mediaSession' in navigator) {
             navigator.mediaSession.playbackState = 'paused'; // or 'none'
        }

        // Resolve promise
        item.resolve();
        
        // Process next
        this.processQueue();
      };

      source.start();
    } catch (error) {
      logger.error('AUDIO_PLAYER', 'Failed to play audio', error);
      this.currentSource = null;
      this.isPlaying = false;
      this.queue.shift();
      item.reject(error);
      this.processQueue();
    }
  }

  public stop(): void {
    // Stop current source
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Ignore errors if already stopped
      }
      this.currentSource = null;
    }

    // Clear queue
    this.queue = [];
    this.isPlaying = false;

    if (this.audioContext) {
      // Optional: Close context or suspend? 
      // Keeping it open is better for latency if we expect more speech.
      // But for a hard stop, we might want to suspend?
      // For now, just stopping the source and queue is sufficient.
    }
  }
}

export const audioPlayer = new AudioPlayer();
