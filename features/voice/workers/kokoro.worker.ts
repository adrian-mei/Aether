import { KokoroTTS } from "kokoro-js";

// Types for messages
type WorkerMessage = 
  | { type: 'init'; modelId: string }
  | { type: 'generate'; text: string; voice: string };

type WorkerResponse = 
  | { type: 'ready'; voices: any[] }
  | { type: 'audio'; audio: Float32Array; sampleRate: number }
  | { type: 'error'; error: string };

const ctx: Worker = self as any;
let tts: KokoroTTS | null = null;

ctx.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type } = event.data;

  try {
    if (type === 'init') {
      if (tts) {
        ctx.postMessage({ type: 'ready', voices: Object.keys(tts.voices) });
        return;
      }

      const { modelId } = event.data as { modelId: string };
      console.log('[Kokoro Worker] Initializing model:', modelId);
      
      tts = await KokoroTTS.from_pretrained(modelId, {
        dtype: "q8",
        device: "wasm",
      });

      const voices = Object.keys(tts.voices);
      console.log('[Kokoro Worker] Initialized. Voices:', voices.length);
      ctx.postMessage({ type: 'ready', voices });
    } 
    
    else if (type === 'generate') {
      if (!tts) throw new Error('TTS not initialized');
      
      const { text, voice } = event.data as { text: string; voice: string };
      console.log(`[Kokoro Worker] Generating: "${text.substring(0, 10)}..." (${voice})`);

      // Verify voice existence
      const availableVoices = Object.keys(tts.voices);
      let selectedVoice = voice;
      
      if (!availableVoices.includes(voice)) {
          console.warn(`[Kokoro Worker] Voice ${voice} not found.`);
          if (voice.startsWith('z')) {
              selectedVoice = availableVoices.find(v => v.startsWith('z')) || 'af_heart';
          } else {
              selectedVoice = 'af_heart';
          }
          console.log(`[Kokoro Worker] Fallback to: ${selectedVoice}`);
      }

      const result = await tts.generate(text, {
        voice: selectedVoice as any,
      });

      if (result && result.audio) {
        // Transfer the buffer to main thread for performance
        const audioData = result.audio; // Float32Array
        ctx.postMessage(
          { type: 'audio', audio: audioData, sampleRate: result.sampling_rate },
          [audioData.buffer] // Transferable
        );
      } else {
        throw new Error('No audio output');
      }
    }
  } catch (error: any) {
    console.error('[Kokoro Worker] Error:', error);
    ctx.postMessage({ type: 'error', error: error.message || String(error) });
  }
};
