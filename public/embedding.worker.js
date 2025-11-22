/**
 * Embedding Worker (Static)
 *
 * Generates vector embeddings for text using Transformers.js.
 * Runs in a Web Worker to avoid blocking the main thread.
 * 
 * This file is served statically from /public to bypass Turbopack bundling issues.
 */

// Import directly from CDN (Native ES Module support in modern browsers)
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';

// Critical: Configure env immediately to prevent file system access
// This tells transformers.js strictly to use fetch, not fs
env.allowLocalModels = false;
env.useBrowserCache = true;

// ============================================================================

const ctx = self;
let embedder = null;

// Log immediate startup
ctx.postMessage({ type: 'log', level: 'info', message: '[Embedding Worker] Script started (Public Static Mode)' });

ctx.onmessage = async (event) => {
  const { type } = event.data;

  try {
    if (type === 'init') {
      if (embedder) {
        ctx.postMessage({ type: 'ready' });
        return;
      }

      const { modelName = 'Xenova/all-MiniLM-L6-v2' } = event.data;
      ctx.postMessage({ type: 'log', level: 'info', message: `[Embedding Worker] Initializing model: ${modelName}` });

      // Load the embedding model
      ctx.postMessage({ type: 'log', level: 'debug', message: '[Embedding Worker] Loading pipeline...' });
      
      try {
          embedder = await pipeline('feature-extraction', modelName);
      } catch (pipelineErr) {
          const msg = pipelineErr.message || String(pipelineErr);
          ctx.postMessage({ type: 'log', level: 'error', message: `[Embedding Worker] Pipeline creation failed: ${msg}` });
          throw pipelineErr;
      }

      ctx.postMessage({ type: 'log', level: 'info', message: '[Embedding Worker] Model loaded successfully' });
      ctx.postMessage({ type: 'ready' });
    } else if (type === 'generate') {
      if (!embedder) {
        throw new Error('Embedding model not initialized');
      }

      const { text } = event.data;

      // Validate input
      if (!text || text.trim().length === 0) {
        throw new Error('Empty text provided for embedding generation');
      }

      ctx.postMessage({ 
        type: 'log', 
        level: 'debug', 
        message: `[Embedding Worker] Generating embedding for: "${text.substring(0, 30)}..."` 
      });

      // Generate embedding with mean pooling and normalization
      const output = await embedder(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Extract the embedding data as Float32Array
      const embeddingData = output.data;

      // Create a copy to transfer to main thread
      const embeddingCopy = new Float32Array(embeddingData);

      ctx.postMessage({ 
        type: 'log', 
        level: 'debug', 
        message: `[Embedding Worker] Generated embedding of dimension ${embeddingCopy.length}` 
      });

      // Send back to main thread with transferable buffer
      ctx.postMessage(
        {
          type: 'embedding',
          data: embeddingCopy,
        },
        [embeddingCopy.buffer] // Transferable for performance
      );
    } else if (type === 'shutdown') {
      ctx.postMessage({ type: 'log', level: 'info', message: '[Embedding Worker] Shutting down...' });
      embedder = null;
      ctx.postMessage({ type: 'shutdown_complete' });
    }
  } catch (error) {
    const errorMessage = error.message || String(error);
    const errorStack = error.stack || '';
    ctx.postMessage({ 
        type: 'log', 
        level: 'error', 
        message: `[Embedding Worker] Error: ${errorMessage} \n ${errorStack}` 
    });
    ctx.postMessage({ type: 'error', error: errorMessage });
  }
};
