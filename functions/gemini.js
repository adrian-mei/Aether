import { streamText } from 'ai';
import { getGoogleProvider, MODEL_NAME } from '../shared/config/ai-config.js';

// The AI SDK automatically reads the GOOGLE_GENERATIVE_AI_API_KEY 
// environment variable. We don't need any special platform detection.

export default async function universalStreamingHandler(req) {
  const { messages } = await req.json();
  const google = getGoogleProvider();

  const result = await streamText({
    model: google(MODEL_NAME),
    messages,
  });

  // This streaming response format is compatible with Vercel, Netlify,
  // and local development.
  return result.toTextStreamResponse();
}
