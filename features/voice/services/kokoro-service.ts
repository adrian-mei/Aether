import { logger } from '@/shared/lib/logger';
import { audioPlayer } from '@/features/voice/utils/audio-player';

export interface KokoroVoice {
  id: string;
  name: string;
  language: 'en-US' | 'en-GB';
  gender: 'female' | 'male';
  traits?: string;
}

export interface AudioGenerationResult {
  audio: Float32Array;
  sampleRate: number;
}

export const KOKORO_VOICES: KokoroVoice[] = [
  // American Female
  { id: 'af_heart', name: 'Heart', language: 'en-US', gender: 'female', traits: 'Soft, Emotional' },
  { id: 'af_bella', name: 'Bella', language: 'en-US', gender: 'female', traits: 'Energetic' },
  { id: 'af_nicole', name: 'Nicole', language: 'en-US', gender: 'female', traits: 'Whispery' },
  { id: 'af_sarah', name: 'Sarah', language: 'en-US', gender: 'female', traits: 'Professional' },
  { id: 'af_sky', name: 'Sky', language: 'en-US', gender: 'female', traits: 'Clear' },
  
  // American Male
  { id: 'am_michael', name: 'Michael', language: 'en-US', gender: 'male', traits: 'Deep' },
  { id: 'am_liam', name: 'Liam', language: 'en-US', gender: 'male', traits: 'Friendly' },
  { id: 'am_adam', name: 'Adam', language: 'en-US', gender: 'male', traits: 'Narrator' },

  // British
  { id: 'bf_emma', name: 'Emma', language: 'en-GB', gender: 'female', traits: 'Elegant' },
  { id: 'bf_isabella', name: 'Isabella', language: 'en-GB', gender: 'female', traits: 'Soft' },
  { id: 'bm_george', name: 'George', language: 'en-GB', gender: 'male', traits: 'Classic' },
];

export class KokoroService {
  private static instance: KokoroService;
  private worker: Worker | null = null;
  private modelId = "onnx-community/Kokoro-82M-v1.0-ONNX";
  private isInitializing = false;
  private isReady = false;
  private initializationPromise: Promise<void> | null = null;

  // Promise resolvers for active requests
  private initPromise: { resolve: () => void; reject: (err: unknown) => void } | null = null;
  private generatePromise: { 
      resolve: (result?: AudioGenerationResult | Promise<void> | void) => void; 
      reject: (err: unknown) => void;
      onStart?: () => void;
      returnAudio?: boolean;
  } | null = null;

  private constructor() {}

  public static getInstance(): KokoroService {
    if (!KokoroService.instance) {
      KokoroService.instance = new KokoroService();
    }
    return KokoroService.instance;
  }

  public getVoices(): KokoroVoice[] {
    return KOKORO_VOICES;
  }

  /**
   * Set a custom worker instance (mostly for testing).
   */
  public setWorker(worker: Worker) {
    this.worker = worker;
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
    this.worker.onerror = (err) => {
      logger.error('KOKORO', 'Worker error', err);
      this.handleError(err.message);
    };
  }

  public async initialize(): Promise<void> {
    if (this.isReady) return Promise.resolve();
    if (this.initializationPromise) return this.initializationPromise;
    
    this.isInitializing = true;
    logger.info('KOKORO', 'Initializing Kokoro TTS Worker...');

    this.initializationPromise = new Promise((resolve, reject) => {
      this.initPromise = { resolve, reject };

      try {
        if (!this.worker) {
          this.worker = new Worker(new URL('../workers/kokoro.worker.ts', import.meta.url), { type: 'module' });
          
          this.worker.onmessage = this.handleWorkerMessage.bind(this);
          this.worker.onerror = (err) => {
              logger.error('KOKORO', 'Worker error', err);
              this.handleError(err.message);
          };
        }

        this.worker.postMessage({ type: 'init', modelId: this.modelId });
      } catch (error: unknown) {
        this.isInitializing = false;
        this.initializationPromise = null;
        logger.error('KOKORO', 'Failed to create worker', error);
        reject(error);
      }
    });

    return this.initializationPromise;
  }

  private handleWorkerMessage(event: MessageEvent) {
    if (!event.data) return;
    const { type, voices, audio, sampleRate, error } = event.data;

    if (type === 'ready') {
        logger.info('KOKORO', 'Worker ready', { voicesCount: voices.length });
        this.isReady = true;
        this.isInitializing = false;
        
        // Warm up the model
        this.warmUp();

        if (this.initPromise) {
            this.initPromise.resolve();
            this.initPromise = null;
        }
        this.initializationPromise = null; // Clear promise so it can be retried if needed (though usually redundant once ready)
    } else if (type === 'audio') {
        logger.debug('KOKORO', 'Audio generation complete', { sampleRate, length: audio.length });
        if (this.generatePromise) {
            if (this.generatePromise.returnAudio) {
                // Return the raw buffer instead of playing
                this.generatePromise.resolve({ audio, sampleRate });
                this.generatePromise = null;
            } else {
                // Play immediately (default behavior)
                if (this.generatePromise.onStart) {
                    this.generatePromise.onStart();
                }
                // Hand off to audio player (which queues it) and resolve immediately
                // so the next sentence can be generated in parallel.
                // We capture the playback promise to return it.
                const playbackPromise = this.playAudio(audio, sampleRate);
                
                // Catch errors locally to prevent unhandled rejections if caller ignores promise
                playbackPromise.catch(err => {
                    logger.error('KOKORO', 'Playback queue failed', err);
                });
                
                this.generatePromise?.resolve(playbackPromise);
                this.generatePromise = null;
            }
        }
    } else if (type === 'error') {
        this.handleError(error);
    }
  }

  private handleError(error: unknown) {
      logger.error('KOKORO', 'Worker reported error', error);
      if (this.initPromise) {
          this.initPromise.reject(error);
          this.initPromise = null;
          this.isInitializing = false;
      }
      if (this.generatePromise) {
          this.generatePromise.reject(error);
          this.generatePromise = null;
      }
  }

  public async warmUp(): Promise<void> {
    if (this.worker) {
      logger.info('KOKORO', 'Warming up model pipeline...');
      this.worker.postMessage({ type: 'warm' });
    }
  }

  /**
   * Generates and plays audio immediately.
   * Returns a promise that resolves to a Playback Promise (which resolves when audio finishes).
   */
  public async speak(text: string, voiceId?: string, onPlaybackStart?: () => void): Promise<Promise<void>> {
    try {
      if (!this.isReady) {
        await this.initialize();
      }

      if (!this.worker) throw new Error('Worker not initialized');

      const voice = voiceId || 'af_heart';
      logger.info('KOKORO', `Requesting speak: "${text.substring(0, 20)}..."`, { voice });
      
      return new Promise((resolve, reject) => {
          this.generatePromise = { 
            resolve: (result) => resolve(result as Promise<void>), 
            reject, 
            onStart: onPlaybackStart, 
            returnAudio: false 
          };
          this.worker!.postMessage({ type: 'generate', text, voice });
      });

    } catch (error: unknown) {
      logger.error('KOKORO', 'Speak request failed', error);
      throw error;
    }
  }

  /**
   * Generates audio and returns the buffer without playing.
   * Useful for preloading.
   */
  public async generateAudio(text: string, voiceId?: string): Promise<AudioGenerationResult> {
    try {
        if (!this.isReady) {
            await this.initialize();
        }

        if (!this.worker) throw new Error('Worker not initialized');

        const voice = voiceId || 'af_heart';
        logger.info('KOKORO', `Requesting generation (no play): "${text.substring(0, 20)}..."`, { voice });

        return new Promise((resolve, reject) => {
            this.generatePromise = { 
                resolve: (result) => resolve(result as AudioGenerationResult),
                reject, 
                returnAudio: true 
            };
            this.worker!.postMessage({ type: 'generate', text, voice });
        });
    } catch (error: unknown) {
        logger.error('KOKORO', 'Generate request failed', error);
        throw error;
    }
  }

  private async playAudio(audioData: Float32Array, sampleRate: number): Promise<void> {
    logger.info('KOKORO', 'Queueing audio for playback', { sampleRate });
    return audioPlayer.play(audioData, sampleRate).then(() => {
        logger.info('KOKORO', 'Playback finished');
    });
  }

  /**
   * Public method to play a pre-generated buffer.
   */
  public async playAudioBuffer(audioData: Float32Array, sampleRate: number): Promise<void> {
      return this.playAudio(audioData, sampleRate);
  }

  public stop(): void {
    audioPlayer.stop();
    // We don't terminate the worker, just stop audio
  }
}

export const kokoroService = KokoroService.getInstance();
