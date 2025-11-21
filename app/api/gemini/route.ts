import { streamText } from 'ai';
import { getGoogleProvider, MODEL_NAME } from '@/shared/config/ai-config';

// Approximate pricing for Gemini Flash (verify current rates)
const INPUT_COST_PER_MILLION = 0.075;
const OUTPUT_COST_PER_MILLION = 0.30;

// Simple in-memory rate limiter (Note: This resets on server restart/re-deploy)
// Key: IP, Value: { count, timestamp }
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 20; // Allow some buffer over the client-side 10

export async function POST(req: Request) {
  // 1. IP Rate Limiting
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  
  // Clean up old entries occasionally (simple optimization)
  if (Math.random() < 0.01) {
    const now = Date.now();
    for (const [key, data] of rateLimitMap.entries()) {
      if (now - data.timestamp > RATE_LIMIT_WINDOW) {
        rateLimitMap.delete(key);
      }
    }
  }

  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);

  if (userLimit) {
    if (now - userLimit.timestamp > RATE_LIMIT_WINDOW) {
      // Reset window
      rateLimitMap.set(ip, { count: 1, timestamp: now });
    } else {
      if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      userLimit.count++;
    }
  } else {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
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
