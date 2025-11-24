# Technology Stack

Aether leverages modern web technologies to deliver a native-like voice AI experience in the browser, with heavy lifting offloaded to a backend service.

## Frontend (`aether-frontend`)

*   **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
    *   Server Components for initial shell.
    *   Client Components for interactive UI and Visuals.
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
    *   Strict typing for robustness.
*   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
    *   Utility-first styling.
    *   Complex animations (pulse, breathe, ripple).
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Audio**: [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
    *   Audio Context management for playback and visualization.
    *   Microphone input capture (streaming).

## Backend (`aether-backend`) - External

*   **Runtime**: Node.js (Next.js API Server).
*   **Speech-to-Text (STT)**: Server-side transcription (e.g., Whisper or Google STT).
*   **Text-to-Speech (TTS)**: Server-side synthesis (Kokoro 82M or proprietary).
*   **LLM**: [Google Gemini 2.0 Flash](https://deepmind.google/technologies/gemini/)
    *   High speed, low latency text generation.
*   **Memory**: Server-side vector database and session storage.

## Infrastructure

*   **Frontend Hosting**: Vercel or Netlify (Static/Edge).
*   **Backend Hosting**: Oracle Cloud (High performance compute).
