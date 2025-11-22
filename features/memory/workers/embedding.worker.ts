/**
 * Embedding Worker
 *
 * Generates vector embeddings for text using Transformers.js.
 * Runs in a Web Worker to avoid blocking the main thread.
 * Follows the same pattern as kokoro.worker.ts.
 */

import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers';

// Types for messages
type WorkerMessage =
  | { type: 'init'; modelName?: string }
  | { type: 'generate'; text: string }
  | { type: 'shutdown' };

const ctx: Worker = self as unknown as Worker;
let embedder: FeatureExtractionPipeline | null = null;

ctx.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type } = event.data;

  try {
    if (type === 'init') {
      if (embedder) {
        ctx.postMessage({ type: 'ready' });
        return;
      }

      const { modelName = 'Xenova/all-MiniLM-L6-v2' } = event.data as {
        modelName?: string;
      };
      console.log('[Embedding Worker] Initializing model:', modelName);

      // Load the embedding model
      // This will download ~23MB on first load, then cache in browser
      embedder = await pipeline('feature-extraction', modelName);

      console.log('[Embedding Worker] Model loaded successfully');
      ctx.postMessage({ type: 'ready' });
    } else if (type === 'generate') {
      if (!embedder) {
        throw new Error('Embedding model not initialized');
      }

      const { text } = event.data as { text: string };

      // Validate input
      if (!text || text.trim().length === 0) {
        throw new Error('Empty text provided for embedding generation');
      }

      console.log(
        `[Embedding Worker] Generating embedding for: "${text.substring(0, 30)}..."`
      );

      // Generate embedding with mean pooling and normalization
      // This returns a tensor that we need to convert to Float32Array
      const output = await embedder(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Extract the embedding data as Float32Array
      // The output is a tensor, we need to get the underlying data
      const embeddingData = output.data as Float32Array;

      // Create a copy to transfer to main thread
      const embeddingCopy = new Float32Array(embeddingData);

      console.log(
        `[Embedding Worker] Generated embedding of dimension ${embeddingCopy.length}`
      );

      // Send back to main thread with transferable buffer
      ctx.postMessage(
        {
          type: 'embedding',
          data: embeddingCopy,
        },
        [embeddingCopy.buffer] // Transferable for performance
      );
    } else if (type === 'shutdown') {
      console.log('[Embedding Worker] Shutting down...');
      embedder = null;
      ctx.postMessage({ type: 'shutdown_complete' });
    }
  } catch (error: unknown) {
    console.error('[Embedding Worker] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    ctx.postMessage({ type: 'error', error: errorMessage });
  }
};

// Export empty object to make TypeScript happy with worker files
export {};
