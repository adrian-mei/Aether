# Deployment Guide

Aether is designed to be deployed on modern serverless platforms like Vercel or Netlify.

## Prerequisites

1.  **Google Gemini API Key**: Obtain one from [Google AI Studio](https://aistudio.google.com/).
2.  **Git Repository**: Push your code to GitHub/GitLab/Bitbucket.

## Vercel (Recommended)

1.  **Import Project**: Connect your Git repository to Vercel.
2.  **Environment Variables**: Add `GOOGLE_GENERATIVE_AI_API_KEY` in the project settings.
3.  **Build Settings**:
    *   Framework Preset: `Next.js`
    *   Build Command: `next build` (or `npm run build`)
    *   Output Directory: `.next`
4.  **Deploy**: Click deploy. Vercel automatically handles the Edge Functions for the API route.

## Netlify

1.  **Import Project**: Connect your Git repository.
2.  **Environment Variables**: Add `GOOGLE_GENERATIVE_AI_API_KEY`.
3.  **Build Settings**:
    *   Build Command: `npm run build`
    *   Publish Directory: `.next`
4.  **Plugins**: Ensure the `@netlify/plugin-nextjs` is installed (usually auto-detected).

## Local Production Build

To test the production build locally:

```bash
npm run build
npm start
```

Visit `http://localhost:3000`.

## Troubleshooting

*   **404 on Models**: Ensure the `.onnx` models in `public/` are being served correctly. Some hosts require MIME type configuration for `.onnx` (`application/octet-stream`) and `.wasm` (`application/wasm`).
*   **SharedArrayBuffer**: If using advanced threading (not currently enabled but possible for ONNX), ensure headers include:
    ```
    Cross-Origin-Opener-Policy: same-origin
    Cross-Origin-Embedder-Policy: require-corp
