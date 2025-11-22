import { streamText } from 'ai';
import { getGoogleProvider, MODEL_NAME } from '../../features/ai/config/ai-config';
import { serverRateLimiter } from '../../features/rate-limit/server/rate-limiter';
import { Env } from '../../shared/config/env';

export default async function handler(req: Request) {
  try {
      // Validate environment variables
      // We can't easily use Env.validateServerEnv() here if it relies on process.env which might be different?
      // But standard Netlify Functions should support process.env.
      // Env class probably uses process.env.
      
      // 1. Access Code Bypass
      const accessCode = req.headers.get('x-access-code');
      const isBypassed = accessCode && accessCode === Env.ACCESS_CODE;

      // 2. IP Rate Limiting (if not bypassed)
      const ip = req.headers.get('x-forwarded-for') || 'unknown';
      
      if (!isBypassed) {
        const allowed = serverRateLimiter.check(ip);
        if (!allowed) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      const body = await req.json();
      const { messages } = body;
      
      const google = getGoogleProvider();

      const result = await streamText({
        model: google(MODEL_NAME),
        messages,
      });

      // Return standard text stream response compatible with AI SDK
      return result.toTextStreamResponse();

  } catch (error: any) {
      console.error('Gemini Function Error:', error);
      return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
      });
  }
}
