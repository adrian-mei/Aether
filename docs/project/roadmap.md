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
*   [x] **Backend Migration**: Switch to Fastify for high-performance API handling.
*   [x] **WebSocket Integration**: Real-time bidirectional audio streaming.
*   [x] **Local AI**: Server-side Whisper (STT) and Kokoro (TTS) integration.

## Future Architecture (Planned)
*   **Server-Side Memory Migration**: Move from in-memory session storage to a persistent database (Redis or SQLite) to support longer history and analytics.
*   **Authentication System**: Implement user authentication (e.g., NextAuth.js) to securely segregate user data and memories on the server.
*   **Analytics Dashboard**: Track "Care Minutes", active users, and financial metrics.
