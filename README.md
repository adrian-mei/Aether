# Aether: The Empathetic Voice AI

Aether is a browser-based, voice-first AI companion designed to provide a safe, non-judgmental space for users to express their emotions. Unlike typical assistants, Aether focuses on **Connection over Correction**, using active listening techniques to validate feelings without offering unsolicited advice.

## ✨ Key Features

*   **Voice-First Interface**: Fluid, hands-free conversation using the Web Speech API.
*   **Hyper-Realistic TTS**: Runs **Kokoro 82M** locally via WebGPU (Zero Latency Cost).
*   **Instant Response**: Sentence-level streaming for near-instant audio generation.
*   **Active Engagement**: Proactively re-engages during silence.
*   **Long-Term Memory**: Vector-based local memory (RAG) to remember context over time.
*   **Ambient UI**: Glassmorphic interface with organic animations.
*   **Mobile-First Design**: Haptic feedback, safe-area awareness, and PWA support for native-like feel.
*   **Network Resilience**: Robust offline detection and state recovery.

## 📚 Documentation

For detailed technical documentation, please refer to the `docs/` folder:

*   [Architecture Overview](docs/architecture.md) - System design and data flow.
*   [Tech Stack](docs/tech-stack.md) - Libraries and tools used.
*   [Deployment Guide](docs/deployment.md) - Hosting on Vercel/Netlify.
*   [Key Decisions](docs/decisions.md) - Architectural decision log.

## 🚀 Getting Started

### Prerequisites
*   Node.js 18+
*   Google AI Studio API Key

### Installation

```bash
git clone https://github.com/yourusername/aether.git
cd aether
npm install
```

### Configuration

Create `.env.local`:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_key
```

### Running

```bash
npm run dev
# or for production
npm run build && npm start
```

## ⚡ Performance

*   **Lighthouse**: 84/100 (Production)
*   **LCP**: ~2.6s
*   **TTFB**: < 100ms

## 📄 License

MIT
