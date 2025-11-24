# Aether Product Roadmap

## Long-Term Vision
Refine Aether into a sustainable, revenue-generating voice AI platform.

## Revenue & Monetization (Future)
**Goal**: Generate revenue to cover Oracle Cloud costs and fund development.

### "Founding Member" Paywall
*   **Mechanism**: License Key system (Auth-less MVP).
*   **Tiers**:
    *   **Beta Access**: $9.99 for 90 days.
    *   **Lifetime Access**: $99.99 one-time payment (Founding Member).
*   **Technical Implementation**:
    *   Stripe Payment Links + Webhooks.
    *   License Key generation on server.
    *   SQLite database to store keys and expiry dates.
    *   Frontend modal to input/validate key.
    *   API Middleware to reject requests without a valid key.

## Infrastructure (Current Focus)
*   [x] Split Hosting Architecture (Netlify Frontend + Oracle Backend).
*   [x] CORS Configuration for Cross-Origin API access.
*   [x] **Frontend Refactor**: Migrate to "Strict UI" architecture (No client-side AI).
*   [ ] WebSocket Integration for low-latency voice streaming.
*   [ ] Server-side TTS offloading.

## Future Architecture (Planned)
*   **Server-Side Memory Migration**: Move from client-side IndexedDB to server-side vector database (e.g., SQLite + Vector Extension or Qdrant) to support cross-device memory.
*   **Authentication System**: Implement user authentication (e.g., NextAuth.js) to securely segregate user data and memories on the server.
