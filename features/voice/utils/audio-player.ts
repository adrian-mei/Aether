import { logger } from '@/shared/lib/logger';
import { MediaSessionManager } from './media-session-manager';

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
  private mediaSession: MediaSessionManager;

  constructor() {
    this.mediaSession = new MediaSessionManager(
      async () => this.resume(),
      async () => { if (this.audioContext) await this.audioContext.suspend(); },
      () => this.stop()
    );
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      // Monitor State Changes (Interruption recovery)
      this.audioContext.onstatechange = () => {
          logger.info('AUDIO', `Context state changed to: ${this.audioContext?.state}`);
      };
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
    this.mediaSession.updateMetadata(true);

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
        // Cleanup: Disconnect source to allow GC
        try {
            if (this.currentSource) {
                this.currentSource.disconnect();
                this.currentSource.buffer = null; // Explicitly release buffer reference
            }
        } catch (e) {
             logger.warn('AUDIO', 'Error disconnecting source', e);
        }

        this.currentSource = null;
        this.isPlaying = false;
        
        // Remove from queue
        const finishedItem = this.queue.shift();
        // Explicitly clear the Float32Array in the finished item if possible
        if (finishedItem) {
             finishedItem.audioData = new Float32Array(0); // Release memory
        }
        
        // Update MediaSession if queue empty
        if (this.queue.length === 0) {
             this.mediaSession.updateMetadata(false);
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
