import { logger } from '@/shared/lib/logger';

export interface KokoroVoice {
  id: string;
  name: string;
  language: 'en-US' | 'en-GB';
  gender: 'female' | 'male';
  traits?: string;
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
  private audioContext: AudioContext | null = null;
  private isInitializing = false;
  private isReady = false;

  // Promise resolvers for active requests
  private initPromise: { resolve: () => void; reject: (err: any) => void } | null = null;
  private generatePromise: { 
      resolve: () => void; 
      reject: (err: any) => void;
      onStart?: () => void; 
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

  public async initialize(): Promise<void> {
    if (this.isReady || this.isInitializing) return;
    
    this.isInitializing = true;
    logger.info('KOKORO', 'Initializing Kokoro TTS Worker...');

    return new Promise((resolve, reject) => {
      this.initPromise = { resolve, reject };

      try {
        this.worker = new Worker(new URL('../workers/kokoro.worker.ts', import.meta.url));
        
        this.worker.onmessage = this.handleWorkerMessage.bind(this);
        this.worker.onerror = (err) => {
            logger.error('KOKORO', 'Worker error', err);
            this.handleError(err.message);
        };

        this.worker.postMessage({ type: 'init', modelId: this.modelId });
      } catch (error) {
        this.isInitializing = false;
        logger.error('KOKORO', 'Failed to create worker', error);
        reject(error);
      }
    });
  }

  private handleWorkerMessage(event: MessageEvent) {
    const { type, voices, audio, sampleRate, error } = event.data;

    if (type === 'ready') {
        logger.info('KOKORO', 'Worker ready', { voicesCount: voices.length });
        this.isReady = true;
        this.isInitializing = false;
        if (this.initPromise) {
            this.initPromise.resolve();
            this.initPromise = null;
        }
    } else if (type === 'audio') {
        if (this.generatePromise) {
            if (this.generatePromise.onStart) {
                this.generatePromise.onStart();
            }
            this.playAudio(audio, sampleRate).then(() => {
                this.generatePromise?.resolve();
                this.generatePromise = null;
            });
        }
    } else if (type === 'error') {
        this.handleError(error);
    }
  }

  private handleError(error: any) {
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

  public async speak(text: string, voiceId?: string, onPlaybackStart?: () => void): Promise<void> {
    try {
      if (!this.isReady) {
        await this.initialize();
      }

      if (!this.worker) throw new Error('Worker not initialized');

      // Determine voice
      let voice = voiceId || 'af_heart';

      logger.info('KOKORO', `Requesting generation: "${text.substring(0, 20)}..."`, { voice });
      
      return new Promise((resolve, reject) => {
          this.generatePromise = { resolve, reject, onStart: onPlaybackStart };
          this.worker!.postMessage({ type: 'generate', text, voice });
      });

    } catch (error) {
      logger.error('KOKORO', 'Speak request failed', error);
      throw error;
    }
  }

  private async playAudio(audioData: Float32Array, sampleRate: number): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const buffer = this.audioContext.createBuffer(1, audioData.length, sampleRate);
    buffer.copyToChannel(new Float32Array(audioData), 0);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    
    return new Promise((resolve) => {
      source.onended = () => resolve();
      source.start();
    });
  }

  public stop(): void {
    if (this.audioContext) {
        this.audioContext.close().then(() => {
            this.audioContext = null;
        });
    }
    // We don't terminate the worker, just stop audio
  }
}

export const kokoroService = KokoroService.getInstance();
