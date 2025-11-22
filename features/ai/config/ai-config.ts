import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { Env } from '@/shared/config/env';

export const MODEL_NAME = 'gemini-2.5-flash';

export function getGoogleProvider() {
  const apiKey = Env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not defined');
  }

  const google = createGoogleGenerativeAI({
    apiKey,
  });

  return google;
}
