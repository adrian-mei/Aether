# System Architecture

Aether follows a "Feature-First" (Screaming Architecture) pattern, organizing code by domain rather than file type. This ensures scalability and maintainability.

## High-Level Overview

The application is a Hybrid Web App built with Next.js (App Router). It supports two operational modes:
1.  **Client-Only Mode (Default)**: Runs entirely in the browser (PWA style) using WebGPU for AI. Best for powerful desktops.
2.  **Server-Augmented Mode (Self-Hosted)**: Offloads heavy AI tasks (TTS) to the hosting server (e.g., Oracle Cloud VPS). Best for mobile devices and low-power hardware.

```mermaid
graph TD
    Client[Client Browser] -->|HTTPS| Next[Next.js Server]
    Next -->|API Route| Gemini[Google Gemini API]
    Next -->|API Route /api/tts| ServerTTS[Server-Side Kokoro Node.js]
    
    subgraph "Client-Side (Browser)"
        UI[React UI]
        Voice[Voice Pipeline]
        Memory[Local Vector DB]
        
        UI --> Voice
        Voice -.->|WebGPU (Desktop)| ClientTTS[Client Kokoro WASM]
        Voice -.->|Web Speech (Mobile Fallback)| SysTTS[System TTS]
        Voice -->|Fetch (Mobile High Quality)| Next
        
        UI -->|Chat History| Memory
    end
```

## Core Modules

### 1. Session Management (`features/session`)
Handles the lifecycle of a user session using a Context-based architecture:
-   **`SessionContext`**: Provides global state to avoid prop drilling.
-   **`useInteractionLoop`**: Manages the core event loop (input -> processing -> output).
-   **Boot Sequence**: Loading models and initializing services.
-   **Access Control**: Rate limiting and access codes.

### 2. Voice Pipeline (`features/voice`)
Manages audio input and output:
-   **`useVoiceInteraction`**: The central coordinator for voice interactions (handles visibility/backgrounding).
-   **`useSpeechRecognition`**: Wraps the Web Speech API for STT.
-   **`useTTS`**: Manages Text-to-Speech generation using Kokoro (WebGPU) with fallback to Web Speech API.
-   **`AudioPlayer`**: Handles gapless audio playback queues.

### 3. AI Integration (`features/ai`)
-   **`chat-service`**: Communicates with the Vercel AI SDK and Google Gemini.
-   **`system-prompt`**: Dynamic prompt engineering based on context and memory.

### 4. Local Memory (`features/memory`)
-   **`memory-service`**: Stores and retrieves conversation embeddings using a local vector database (client-side RAG) backed by IndexedDB.

### 5. Mobile & Resilience
-   **Wake Lock**: Keeps the screen active during sessions.
-   **Offline Support**: Blocks interactions and updates UI when network is lost.
-   **Lifecycle Management**: Pauses audio/recognition when the app is backgrounded to save battery and prevent crashes.
-   **Responsive Layouts**: Mobile-first design with full-screen overlays for settings (`DebugPanelLeft`) and safe-area awareness (`env(safe-area-inset-bottom)`).

## Quality Assurance

### Testing Strategy
-   **E2E Testing**: Uses **Playwright** to simulate mobile and desktop environments.
-   **Mobile Emulation**: Specifically targets iPhone viewports to verify layout, touch targets, and Install PWA prompts.
-   **Coverage**: Critical user flows including Session Start, Settings Panel interaction, and Mobile Support notices.

## Data Flow

1.  **Input**: User speaks -> `useSpeechRecognition` converts to text.
2.  **Processing**: Text -> `useConversation` -> `chat-service` (Gemini).
3.  **Memory**: `chat-service` retrieves relevant context from `memory-service`.
4.  **Output**: AI Response (Stream) -> `useMessageQueue` -> `useTTS` -> `AudioPlayer`.
5.  **Feedback**: UI updates in real-time via `StatusDisplay` and `OrbContainer`.
