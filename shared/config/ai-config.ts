import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const MODEL_NAME = 'gemini-2.5-flash';

export function getGoogleProvider() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not defined');
  }

  const google = createGoogleGenerativeAI({
    apiKey,
  });

  return google;
}
