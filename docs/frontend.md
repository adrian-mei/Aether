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
The codebase is organized by domain features and scenes:
*   **`src/scenes/`**: Top-level UI views (e.g., `Session`, `Onboarding`).
*   **`src/features/`**: Business logic (e.g., `session/`, `visuals/`).
*   **`src/shared/`**: Reusable utilities (e.g., `api-client`, `logger`, `audio-player`).

## 4. User Interaction Flow
1.  **Idle**: The Orb waits for user interaction.
2.  **Connecting**: User taps the Orb. The `SessionManager` initiates a handshake with the backend (`/session/start` + WebSocket).
3.  **Listening**: The microphone is active. Audio chunks are streamed to the backend via WebSocket.
4.  **Processing**: User stops speaking. The backend processes the audio (STT -> LLM -> TTS). The Orb pulses to indicate thought.
5.  **Speaking**: The backend streams audio response. The frontend plays the audio, and the Orb pulses in sync with the volume.
6.  **Interrupt**: If the user speaks during step 5, the frontend sends a `user.started_speaking` event and immediately stops playback.
7.  **Limit Reached**: After 2 turns (demo limit), the backend sends a `limit_reached` event, triggering the Waitlist Modal.

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

### Configuration
The frontend connects to a backend server. Configure the URL in `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_WS_URL=ws://localhost:3002
```

### Mock API (Optional)
The project supports a `NEXT_PUBLIC_USE_MOCK_API=true` flag to simulate backend responses for UI development without a running server.
