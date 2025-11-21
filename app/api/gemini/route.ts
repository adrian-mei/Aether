import { streamText } from 'ai';
import { getGoogleProvider, MODEL_NAME } from '@/shared/config/ai-config';
import { serverRateLimiter } from '@/features/rate-limit/server/rate-limiter';

// Approximate pricing for Gemini Flash (verify current rates)
const INPUT_COST_PER_MILLION = 0.075;
const OUTPUT_COST_PER_MILLION = 0.30;

export async function POST(req: Request) {
  // 0. Access Code Bypass
  const accessCode = req.headers.get('x-access-code');
  const isBypassed = accessCode && accessCode === process.env.ACCESS_CODE;

  // 1. IP Rate Limiting (if not bypassed)
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

  const { messages, system } = await req.json();
  const google = getGoogleProvider();

  const result = await streamText({
    model: google(MODEL_NAME),
    messages,
    system,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const reader = result.textStream.getReader();
      const encoder = new TextEncoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          if (value) {
            const data = JSON.stringify({ type: 'text', content: value });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }

        // Usage is available after stream finishes
        const usage = await result.usage as any;
        const { promptTokens, completionTokens, totalTokens } = usage;
        const cost = (promptTokens / 1_000_000 * INPUT_COST_PER_MILLION) + 
                     (completionTokens / 1_000_000 * OUTPUT_COST_PER_MILLION);
        
        const logData = JSON.stringify({
          type: 'usage',
          data: {
            tokens: { prompt: promptTokens, completion: completionTokens, total: totalTokens },
            cost: `$${cost.toFixed(7)}`,
            model: MODEL_NAME
          }
        });
        controller.enqueue(encoder.encode(`data: ${logData}\n\n`));

      } catch (error) {
        console.error('Streaming error:', error);
        const errorData = JSON.stringify({ type: 'error', content: 'Stream error' });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
