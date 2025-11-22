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
    *   *Reasoning*: Increases security and ensures that "unlocking" is a conscious, deliberate action for each session. Prevents a public computer from remaining permanently unlocked.

## 2. Latency & Performance Tuning

### Voice Activity Detection (VAD)
*   **Silence Timeout**: `1000ms` (1 second).
*   **Previous Value**: `2000ms`.
*   **Reasoning**: The 2-second delay created noticeable "dead air" after the user stopped speaking, breaking the conversational flow. Reducing it to 1 second makes the AI feel snappy and responsive, closer to a natural human pause.

### Memory Retrieval
*   **Timeout**: `5000ms` (5 seconds).
*   **Previous Value**: `3000ms`.
*   **Reasoning**: The initial loading of the embedding model (23MB + WASM compilation) often took longer than 3 seconds on the first turn, causing the memory service to time out and skip context. Increasing this to 5 seconds provides a safe buffer for the "cold start" without significantly impacting the user experience (since the user is usually still orienting themselves).

## 3. Audio & Voice

### Voice Selection
*   **Primary**: Kokoro Neural Engine ("af_heart").
*   **Fallback**: Web Speech API (Priority: Catherine -> Google US Female -> Zira).
*   **Reasoning**: Kokoro provides superior emotional inflection. Web Speech is a robust fallback for unsupported browsers or failures.

### Audio Pipeline
*   **Eager Loading**: Kokoro is initialized immediately on page load (`useEffect` in `useVoiceAgent`), not waiting for the first interaction.
*   **Reasoning**: Minimizes the "Time to First Audio" (TTFA) for the first response.
