export interface Voice {
  id: string;
  name: string;
  language: string;
  gender?: 'female' | 'male' | 'neutral';
  traits?: string;
}

export interface AudioGenerationResult {
  audio: Float32Array;
  sampleRate: number;
}

export interface ITextToSpeechService {
  initialize(): Promise<void>;
  
  /**
   * Generates and plays audio for the given text.
   * Returns a promise that resolves to a Playback Promise (which resolves when audio finishes).
   */
  speak(text: string, voiceId?: string, onPlaybackStart?: () => void): Promise<Promise<void>>;
  
  /**
   * Generates audio buffer without playing.
   */
  generateAudio(text: string, voiceId?: string): Promise<AudioGenerationResult>;
  
  getVoices(): Voice[];
  
  stop(): void;
}
