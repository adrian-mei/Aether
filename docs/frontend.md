# Aether Frontend Documentation

## 1. Overview
The Aether Frontend is a standalone, high-performance "Thin Client" application built with Next.js. It is responsible for the visual presentation, audio playback, and user interaction state, while offloading all heavy compute (AI, STT, TTS) to an external backend.

## 2. Tech Stack
*   **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) - React Framework.
*   **Core Library**: [React 19](https://react.dev/) - UI Library.
*   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) - Utility-first CSS.
*   **Language**: [TypeScript](https://www.typescriptlang.org/) - Static typing.
*   **Icons**: [Lucide React](https://lucide.dev/).
*   **State**: React Context + Custom Hooks.

## 3. Architecture Concepts

### "Strict UI" Philosophy
The frontend contains **NO** client-side AI models. It does not run Whisper (STT) or Kokoro (TTS) in the browser via WebGPU/WASM. This ensures consistent performance even on low-end mobile devices. The browser acts purely as a streaming terminal.

### Feature-Based Structure
The codebase is organized by domain features in `src/features/`:
*   **`session/`**: Handles the connection to the backend, microphone access, and conversation state (Idle, Listening, Processing, Speaking).
*   **`visuals/`**: Contains the "Orb" visualization logic, particle effects, and color states.

### Shared Core
Reusable utilities live in `src/shared/`:
*   **`api-client`**: Handles communication with the backend (currently mocked).
*   **`logger`**: Client-side logging utility.

## 4. User Interaction Flow
1.  **Idle**: The Orb waits for user interaction.
2.  **Connecting**: User taps the Orb. The `SessionManager` initiates a handshake with the backend.
3.  **Listening**: The microphone is active. Audio chunks are streamed to the backend.
4.  **Processing**: User stops speaking. The backend processes the audio (STT -> LLM -> TTS). The Orb pulses to indicate thought.
5.  **Speaking**: The backend streams audio response. The frontend plays the audio, and the Orb pulses in sync with the volume.

## 5. Development Guide

### Prerequisites
*   Node.js 20+
*   npm

### Setup
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### Build for Production
```bash
npm run build
npm start
```

### Mock API
The project currently runs with a Mock API client (`src/shared/lib/api-client.ts`) to simulate backend responses for UI development. Check the browser console for `[MOCK API]` logs.
