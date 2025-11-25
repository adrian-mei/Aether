# Decision Log

This document tracks granular configuration decisions, parameter tuning, and "micro-decisions" that affect the application's behavior. It serves as a reference to prevent regressions and explain the "why" behind specific magic numbers.

## 1. Rate Limiting Strategy

### Client-Side Limit (Business Rule)
*   **Limit**: 10 interactions (messages) per session.
*   **Reset Window**: **30 minutes** (Previous: 2 hours, 12 hours).
*   **Storage**: `localStorage` stores `aether_interaction_count` and `aether_limit_timestamp`.
*   **Reasoning**: Provides a "freemium" feel while controlling costs during the beta/preview phase. 30 minutes allows for frequent engagement while preventing continuous spam.

### Server-Side Limit (Safety Net)
*   **Limit**: 20 requests per 1 hour per IP.
*   **Reasoning**: Acts as a denial-of-service (DoS) protection and abuse prevention layer. It is intentionally looser than the client-side limit to avoid false positives while still preventing programmatic attacks.

### Access Code Bypass
*   **Mechanism**: Entering a valid access code unlocks unlimited messages.
*   **Persistence**: **Ephemeral (Session-Only)**.
    *   *Decision*: The access code is **NOT** saved to `localStorage`. It is held in React state (`useSessionManager`).
    *   *Behavior*: On page refresh or new tab, the user must re-enter the code if they have exceeded the free limit.
    *   *Reasoning**: Increases security and ensures that "unlocking" is a conscious, deliberate action for each session. Prevents a public computer from remaining permanently unlocked.

## 2. Latency & Performance Tuning

### Voice Activity Detection (VAD) - DEPRECATED (Moved to Backend)
*   **Silence Timeout**: `1000ms` (1 second).
*   **Previous Value**: `2000ms`.
*   **Reasoning**: The 2-second delay created noticeable "dead air" after the user stopped speaking, breaking the conversational flow. Reducing it to 1 second makes the AI feel snappy and responsive, closer to a natural human pause.

### Memory Retrieval - DEPRECATED (Moved to Backend)
*   **Timeout**: `5000ms` (5 seconds).
*   **Previous Value**: `3000ms`.
*   **Reasoning**: The initial loading of the embedding model (23MB + WASM compilation) often took longer than 3 seconds on the first turn, causing the memory service to time out and skip context. Increasing this to 5 seconds provides a safe buffer for the "cold start" without significantly impacting the user experience (since the user is usually still orienting themselves).

## 3. Audio & Voice

### Voice Selection - DEPRECATED (Moved to Backend)
*   **Primary**: Kokoro Neural Engine ("af_heart").
*   **Fallback**: Web Speech API (Priority: Catherine -> Google US Female -> Zira).
*   **Reasoning**: Kokoro provides superior emotional inflection. Web Speech is a robust fallback for unsupported browsers or failures.

### Audio Pipeline
*   **Eager Loading**: Audio Context is resumed on first user interaction.
*   **Reasoning**: Necessary for modern browser autoplay policies.

## 4. Mobile & Cross-Platform Strategy

### iOS Audio Unlock
*   **Mechanism**: Synchronous silent utterance (`SpeechSynthesisUtterance`) + AudioContext resume on first touch.
*   **Reasoning**: iOS Safari aggressively blocks audio playback unless triggered directly by a user gesture. The silent utterance warms up the TTS engine, preventing subsequent failures.

### Mobile Device Capability Check
*   **Rule**: Mobile devices WITHOUT WebGPU default to **Native (System) Voice**.
*   **Reasoning**: Running the 82M parameter Kokoro model on CPU (via WASM) on mobile devices proved too slow (>10s latency), leading to timeouts and poor UX. WebGPU is required for acceptable neural performance on mobile.

## 5. Infrastructure & Hosting

### Split Architecture
*   **Decision**: **Separate Frontend (Netlify) and Backend (Oracle)**.
*   **Reasoning**:
    *   **Frontend Performance**: Netlify provides a superior Global CDN and Edge Network for serving static assets (UI, Wasm models) compared to a single VPS.
    *   **Backend Compute**: Oracle Cloud's ARM instances are powerful and cost-effective for long-running processes (Node.js server, WebSocket connections) that Netlify functions can't handle cheaply or easily.
    *   **Separation of Concerns**: Allows the UI to iterate independently of the heavy compute backend.

## 6. Project Restructuring (Refactoring)

### "Strict UI" Pivot
*   **Decision**: Remove all heavy client-side logic (local AI, STT, TTS) from `aether-frontend`.
*   **Reasoning**:
    *   **Stability**: Browser-based AI (WebGPU/WASM) proved too flaky across different devices (especially mobile).
    *   **Performance**: Offloading processing to the backend ensures a consistent experience regardless of client hardware.
    *   **Simplicity**: The frontend codebase is now focused purely on Visuals, Animation, and Connection management, making it easier to maintain.

### `src` Directory Adoption
*   **Decision**: Adopt standard Next.js `src/` directory structure.
*   **Reasoning**: Consolidates application code (`app`, `components`, `features`, `hooks`, `lib`) into a single directory, separating it from configuration files (`.config.js`, `package.json`). Simplifies file management and improves project organization.

### Backend Independence
*   **Decision**: Explicitly point frontend to external Oracle Backend (`http://159.54.180.60:3000`).
*   **Reasoning**: The frontend is now a standalone client that consumes the backend as an external service, reinforcing the distributed architecture.
