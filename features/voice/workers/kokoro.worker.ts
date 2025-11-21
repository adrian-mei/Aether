import { KokoroTTS } from "kokoro-js";
import { env } from "onnxruntime-web";

// Types for messages
type WorkerMessage = 
  | { type: 'init'; modelId: string }
  | { type: 'generate'; text: string; voice: string }
  | { type: 'warm' };

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

      // Configure ONNX Runtime for WebGPU performance
      env.wasm.simd = true;
      env.wasm.proxy = true; // Enable multithreading for WASM fallback
      // env.webgpu.powerPreference = "high-performance"; // Types might not exist yet in all versions

      try {
        // q8 quantization can cause artifacts/garbage on some WebGPU implementations
        // Switch to fp32 (or fp16) for stability with WebGPU
        tts = await KokoroTTS.from_pretrained(modelId, {
          dtype: "fp32",
          device: "webgpu",
        });
        console.log('[Kokoro Worker] Initialized with WebGPU (fp32)');
      } catch (e) {
        console.warn('[Kokoro Worker] WebGPU init failed, falling back to WASM', e);
        tts = await KokoroTTS.from_pretrained(modelId, {
          dtype: "q8",
          device: "wasm",
        });
      }

      const voices = Object.keys(tts.voices);
      console.log('[Kokoro Worker] Initialized. Voices:', voices.length);
      ctx.postMessage({ type: 'ready', voices });
    } 

    else if (type === 'warm') {
      if (!tts) return;
      console.log('[Kokoro Worker] Warming up...');
      try {
        // Generate a short silence/sound to compile pipelines
        await tts.generate('a', { voice: 'af_heart' });
        console.log('[Kokoro Worker] Warm up complete');
      } catch (e) {
        console.warn('[Kokoro Worker] Warm up failed', e);
      }
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
        // We MUST copy the buffer to avoid detaching the WASM heap or sending garbage
        const audioData = result.audio; 
        const audioCopy = new Float32Array(audioData);
        
        ctx.postMessage(
          { type: 'audio', audio: audioCopy, sampleRate: result.sampling_rate },
          [audioCopy.buffer] // Transferable
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
