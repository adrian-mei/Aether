# Technology Stack

Aether leverages modern web technologies to deliver a native-like voice AI experience in the browser.

## Frontend

*   **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
    *   Server Components for initial shell.
    *   Client Components for interactive UI and Web APIs.
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
    *   Strict typing for robustness.
*   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
    *   Utility-first styling.
    *   Complex animations (pulse, breathe, ripple).
*   **Icons**: [Lucide React](https://lucide.dev/)

## Voice & Audio

*   **Text-to-Speech (TTS)**: [Kokoro-JS](https://github.com/onnx/web)
    *   Runs **Kokoro 82M** model locally via ONNX Runtime Web.
    *   Accelerated by **WebGPU** (or WASM fallback).
    *   Delivers human-like intonation and emotion.
*   **Speech-to-Text (STT)**: [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
    *   Browser-native `webkitSpeechRecognition`.
    *   Low latency, zero external cost.
*   **Audio Processing**: [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
    *   Gapless playback queuing.
    *   Audio context management.

## AI & Data

*   **LLM**: [Google Gemini 2.0 Flash](https://deepmind.google/technologies/gemini/)
    *   Accessed via **Vercel AI SDK** (streaming).
    *   High speed, low latency text generation.
*   **Memory (RAG)**:
    *   **Vector DB**: [Voy](https://github.com/tantara/voy) (WASM vector search).
    *   **Storage**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (via `idb` wrapper).
    *   **Embeddings**: `Xenova/all-MiniLM-L6-v2` via Transformers.js (running locally).

## Infrastructure

*   **Hosting**: Vercel or Netlify (Edge/Serverless compatible).
*   **API Routes**: Next.js Edge Functions (for low-latency proxying).
