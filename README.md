# Aether: The Empathetic Voice AI

Aether is a browser-based, voice-first AI companion designed to provide a safe, non-judgmental space for users to express their emotions. Unlike typical assistants, Aether focuses on **Connection over Correction**, using active listening techniques to validate feelings without offering unsolicited advice.

## ✨ Key Features

*   **Voice-First Interface**: Fluid, hands-free conversation using the Web Speech API (`webkitSpeechRecognition`).
*   **Hyper-Realistic TTS**: Runs **Kokoro 82M** (Neural TTS) locally in the browser using **WebGPU**, delivering human-level voice quality with zero server cost.
*   **Instant Response**: Uses sentence-level streaming to start speaking immediately (TTFA ~500ms), masking generation latency.
*   **Empathetic AI**: Powered by Google Gemini 2.0 Flash via Vercel AI SDK, prompted to prioritize validation and mood tracking.
*   **Ambient UI**: A soothing, glassmorphic interface that visually responds to the conversation state (Listening, Thinking, Speaking).

## 🛠 Tech Stack

*   **Framework**: Next.js 16 (App Router)
*   **Language**: TypeScript / React 19
*   **Styling**: Tailwind CSS 4
*   **Voice Engine**: Kokoro-JS + ONNX Runtime Web (WebGPU / WASM)
*   **AI/Streaming**: Vercel AI SDK 5.0 + Google Gemini 2.0 Flash
*   **State Management**: React Hooks (`useSessionManager`, `useVoiceAgent`)

## 🚀 Getting Started

### Prerequisites
*   Node.js 18+
*   A Google AI Studio API Key

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/aether.git
    cd aether
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment:**
    Create a `.env.local` file in the root directory and add your API key:
    ```env
    GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here
    ```

4.  **Run the Development Server:**
    ```bash
    npm run dev
    ```

5.  **Open the App:**
    Visit [http://localhost:3000](http://localhost:3000) in a modern browser (Chrome/Edge recommended for WebGPU support).

## 🐛 Debugging

Aether includes a built-in **Debug Mode** to help diagnose issues with voice recognition or API latency.

1.  Click the small **"Debug Mode"** button (bug icon) at the bottom of the screen.
2.  An overlay will appear showing real-time logs:
    *   **VOICE**: Speech recognition events and errors.
    *   **APP**: Application state changes.
    *   **API**: Network requests and latency metrics.
    
If the visualizer gets stuck in the **"Thinking"** (Amber) state:
*   Check the logs for `[API] Response stream started`.
*   If missing, the backend request may have timed out.
*   If present, the text-to-speech engine might be failing (check `[VOICE]` logs).

## 📄 License

MIT
